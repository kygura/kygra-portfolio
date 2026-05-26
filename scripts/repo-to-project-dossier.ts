/**
 * Build-time script: ingests one or more repository URLs and generates
 * project dossier entries for src/lib/projects.json.
 *
 *  1. Clones each repo (supports private repos via SSH / credential helpers)
 *  2. Reads README or scans project files for context
 *  3. Calls Deepseek to produce a structured Project JSON entry
 *  4. Merges the result into src/lib/projects.json
 *
 * Usage:
 *   node --experimental-strip-types scripts/repo-to-project-dossier.ts <url...>
 *   node --experimental-strip-types scripts/repo-to-project-dossier.ts           # interactive
 *
 * Requires: DEEPSEEK_API_KEY in environment or .env.local
 */

import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import fss from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "node:process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PROJECTS_JSON = path.join(ROOT, "src", "lib", "projects.json");

// ---- env -----------------------------------------------------------------------

try {
  loadEnvFile(path.join(ROOT, ".env.local"));
} catch {
  // vars may be injected directly in CI
}

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
if (!DEEPSEEK_API_KEY) {
  console.error("DEEPSEEK_API_KEY is required. Set it in .env.local or environment.");
  process.exit(1);
}

// ---- types ---------------------------------------------------------------------

interface ProjectLink {
  label: string;
  href: string;
}

interface ProjectEntry {
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  description: string;
  overview: string[];
  highlights: string[];
  techStack: string[];
  links: ProjectLink[];
  palette: string;
  layout: "wide" | "standard" | "full";
  status: string;
  year: string;
}

interface DeepseekResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// ---- repo cloning & reading ----------------------------------------------------

const README_NAMES = [
  "README.md", "README.MD", "readme.md", "README.rst", "README.txt", "README",
  "Readme.md",
];

const MANIFEST_FILES = [
  "package.json", "Cargo.toml", "go.mod", "pyproject.toml", "setup.py",
  "requirements.txt", "Gemfile", "composer.json", "build.gradle", "pom.xml",
  "CMakeLists.txt", "Makefile", "deno.json", "bun.lock", "pnpm-lock.yaml",
];

const SOURCE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".py", ".rs", ".go", ".sol", ".vue", ".svelte",
  ".rb", ".java", ".kt", ".swift", ".c", ".cpp", ".h", ".zig",
]);

const MAX_SOURCE_SCAN = 12; // max source files to sample
const MAX_FILE_CHARS = 8_000; // truncate each file read
const MAX_CONTEXT_CHARS = 48_000; // max total context sent to LLM

function slugFromUrl(url: string): string {
  // https://github.com/org/repo.git -> repo
  const base = url.replace(/\.git$/, "").split("/").pop() ?? "unknown";
  return base.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function cloneRepo(url: string, tmpDir: string): string {
  const slug = slugFromUrl(url);
  const target = path.join(tmpDir, slug);
  console.log(`  Cloning ${url} → ${target}`);
  try {
    execSync(`git clone --depth 1 ${url} ${target}`, {
      stdio: "pipe",
      timeout: 120_000,
    });
  } catch (err: unknown) {
    // If clone fails, try SSH variant for private repos
    if (url.startsWith("https://")) {
      const sshUrl = url
        .replace(/^https:\/\/([^/]+)\//, "git@$1:")
        .replace(/$/, "");
      console.log(`  HTTPS clone failed, trying SSH: ${sshUrl}`);
      try {
        execSync(`git clone --depth 1 ${sshUrl} ${target}`, {
          stdio: "pipe",
          timeout: 120_000,
        });
      } catch {
        throw new Error(`Failed to clone ${url} (tried both HTTPS and SSH)`);
      }
    } else {
      throw new Error(`Failed to clone ${url}: ${getErrorMessage(err)}`);
    }
  }
  return target;
}

async function readTruncated(filePath: string): Promise<string> {
  const stat = await fs.stat(filePath).catch(() => null);
  if (!stat || stat.size > 200_000) return ""; // skip huge files
  const buf = await fs.readFile(filePath, "utf-8");
  return buf.slice(0, MAX_FILE_CHARS);
}

async function collectContext(repoDir: string): Promise<string> {
  const parts: string[] = [];

  // 1. Try README first
  for (const name of README_NAMES) {
    const content = await readTruncated(path.join(repoDir, name));
    if (content) {
      parts.push(`=== ${name} ===\n${content}`);
      break;
    }
  }

  // 2. Read manifest / config files for tech stack hints
  for (const name of MANIFEST_FILES) {
    const content = await readTruncated(path.join(repoDir, name));
    if (content) {
      parts.push(`=== ${name} ===\n${content}`);
    }
  }

  // 3. If no README was found, scan source files for additional context
  const hasReadme = parts.length > 0 && parts[0].startsWith("=== README");
  if (!hasReadme) {
    const sourceFiles = await walkSourceFiles(repoDir, 2);
    const sampled = sourceFiles.slice(0, MAX_SOURCE_SCAN);
    for (const f of sampled) {
      const rel = path.relative(repoDir, f);
      const content = await readTruncated(f);
      if (content) {
        parts.push(`=== ${rel} ===\n${content}`);
      }
    }
  }

  // Truncate total context
  let total = parts.join("\n\n");
  if (total.length > MAX_CONTEXT_CHARS) {
    total = total.slice(0, MAX_CONTEXT_CHARS) + "\n\n[... truncated]";
  }
  return total;
}

async function walkSourceFiles(dir: string, maxDepth: number): Promise<string[]> {
  const results: string[] = [];
  const skipDirs = new Set([
    "node_modules", ".git", "dist", "build", "target", "__pycache__",
    ".next", ".nuxt", "vendor", ".venv", "venv", "coverage",
  ]);

  async function walk(current: string, depth: number) {
    if (depth > maxDepth) return;
    let entries: fss.Dirent[];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch { return; }

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name) && !entry.name.startsWith(".")) {
          await walk(full, depth + 1);
        }
      } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
        results.push(full);
      }
    }
  }

  await walk(dir, 0);
  return results;
}

// ---- Deepseek LLM call ---------------------------------------------------------

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

const PALETTE_OPTIONS = [
  "meridian", "zknull", "equilibria", "lexis", "hyperagent", "airmy", "colony", "gaia",
];

async function generateDossier(
  repoUrl: string,
  context: string,
  existingSlugs: Set<string>,
): Promise<ProjectEntry> {
  const slug = slugFromUrl(repoUrl);

  const systemPrompt = `You are a technical writer generating structured project dossier entries for a portfolio website. Given the repository source context, produce a JSON object matching this exact schema — no markdown fences, no extra keys, just raw JSON:

{
  "slug": "${slug}",
  "title": "Human-readable project name",
  "subtitle": "2-3 word category label (e.g. Privacy Layer, Cartography Interface, Autonomous Systems)",
  "summary": "1-2 sentence high-level summary of what the project does",
  "description": "2-3 sentence deeper description of the project's purpose and approach",
  "overview": ["Paragraph 1 of the overview narrative", "Paragraph 2 expanding on the design philosophy or architecture"],
  "highlights": ["3-5 bullet-point highlights of key features or design decisions"],
  "techStack": ["List", "of", "technologies", "used"],
  "links": [
    {"label": "Open dossier", "href": "/projects/${slug}"},
    {"label": "GitHub", "href": "${repoUrl}"}
  ],
  "palette": "one of: ${PALETTE_OPTIONS.join(", ")} — choose the one that best fits the project's domain aesthetic",
  "layout": "standard or wide — use wide for data-heavy / map-based / visual projects, standard otherwise",
  "status": "one of: Active build, In development, Research, Prototype, Concept, Concept study, Protocol R&D",
  "year": "project year (e.g. 2026)"
}

Rules:
- Be specific, not generic. Avoid vague phrases like "innovative solution" or "cutting-edge".
- The summary and description should read like editorial copy, not a spec sheet.
- Overview paragraphs should be 2-4 sentences each, thoughtful and opinionated.
- Highlights should be concrete ("Built-in tranching model for differentiated exposure" not "Great features").
- If the repo URL points to a live demo, add a {"label": "Live demo", "href": "..."} link.
- Respond with ONLY the JSON object, nothing else.`;

  const userPrompt = `Here is the repository context:\n\n${context}`;

  console.log("  Calling Deepseek API...");

  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Deepseek API error (${res.status}): ${body}`);
  }

  const data = await res.json() as DeepseekResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from Deepseek");

  // Strip markdown fences if present
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  let entry: ProjectEntry;
  try {
    entry = JSON.parse(jsonStr);
  } catch {
    throw new Error(`Failed to parse Deepseek response as JSON:\n${jsonStr.slice(0, 500)}`);
  }

  // Ensure slug is valid and not a duplicate
  if (!entry.slug || existingSlugs.has(entry.slug)) {
    entry.slug = slug;
  }
  // Ensure the self-referential link is correct
  const dossierLink = entry.links?.find((l: ProjectLink) => l.label === "Open dossier");
  if (dossierLink) dossierLink.href = `/projects/${entry.slug}`;
  // Ensure GitHub link
  if (!entry.links?.some((l: ProjectLink) => l.label === "GitHub")) {
    entry.links = [...(entry.links ?? []), { label: "GitHub", href: repoUrl }];
  }
  // Validate palette
  if (!PALETTE_OPTIONS.includes(entry.palette)) {
    entry.palette = PALETTE_OPTIONS[Math.floor(Math.random() * PALETTE_OPTIONS.length)];
  }
  // Validate layout
  if (entry.layout !== "wide" && entry.layout !== "standard" && entry.layout !== "full") {
    entry.layout = "standard";
  }

  return entry;
}

// ---- merge into projects.json --------------------------------------------------

async function mergeProject(entry: ProjectEntry): Promise<void> {
  let existing: ProjectEntry[] = [];
  try {
    const raw = await fs.readFile(PROJECTS_JSON, "utf-8");
    existing = JSON.parse(raw);
  } catch {
    console.warn("  Could not read existing projects.json, starting fresh.");
  }

  const idx = existing.findIndex((p) => p.slug === entry.slug);
  if (idx >= 0) {
    console.log(`  Updating existing entry for "${entry.slug}"`);
    existing[idx] = entry;
  } else {
    console.log(`  Adding new entry for "${entry.slug}"`);
    existing.push(entry);
  }

  await fs.writeFile(PROJECTS_JSON, JSON.stringify(existing, null, 2) + "\n", "utf-8");
  console.log(`  Written to ${PROJECTS_JSON}`);
}

// ---- interactive mode ----------------------------------------------------------

async function interactivePrompt(): Promise<string[]> {
  // Use inquirer if available, otherwise readline
  try {
    const { input } = await import("@inquirer/prompts");
    const answer = await input({
      message: "Enter repository URL(s), comma-separated:",
    });
    return answer.split(",").map((s: string) => s.trim()).filter(Boolean);
  } catch {
    // Fallback to basic readline
    const rl = await import("node:readline");
    const iface = rl.createInterface({ input: process.stdin, output: process.stdout });
    const answer: string = await new Promise((resolve) => {
      iface.question("Enter repository URL(s), comma-separated: ", resolve);
    });
    iface.close();
    return answer.split(",").map((s) => s.trim()).filter(Boolean);
  }
}

// ---- main ----------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  let urls: string[];

  if (args.length > 0) {
    urls = args;
  } else {
    console.log("No URLs provided — entering interactive mode.\n");
    urls = await interactivePrompt();
  }

  if (!urls.length) {
    console.error("No repository URLs provided. Exiting.");
    process.exit(1);
  }

  console.log(`Processing ${urls.length} repo(s)...\n`);

  // Load existing slugs to avoid collisions
  let existingSlugs = new Set<string>();
  try {
    const raw = await fs.readFile(PROJECTS_JSON, "utf-8");
    const existing: ProjectEntry[] = JSON.parse(raw);
    existingSlugs = new Set(existing.map((p) => p.slug));
  } catch {
    // No existing project index yet.
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "dossier-"));

  try {
    for (const url of urls) {
      console.log(`\n▸ Processing: ${url}`);

      // Clone
      let repoDir: string;
      try {
        repoDir = cloneRepo(url, tmpDir);
      } catch (err: unknown) {
        console.error(`  ✗ ${getErrorMessage(err)}`);
        continue;
      }

      // Collect context
      const context = await collectContext(repoDir);
      if (!context.trim()) {
        console.warn("  No readable content found in the repo. Skipping.");
        continue;
      }

      // Generate dossier via Deepseek
      let entry: ProjectEntry;
      try {
        entry = await generateDossier(url, context, existingSlugs);
      } catch (err: unknown) {
        console.error(`  ✗ LLM generation failed: ${getErrorMessage(err)}`);
        continue;
      }

      existingSlugs.add(entry.slug);

      // Merge into projects.json
      await mergeProject(entry);

      // Summary
      console.log(`\n  Generated dossier:`);
      console.log(`    Title:    ${entry.title}`);
      console.log(`    Subtitle: ${entry.subtitle}`);
      console.log(`    Slug:     ${entry.slug}`);
      console.log(`    Palette:  ${entry.palette}`);
      console.log(`    Stack:    ${entry.techStack.join(", ")}`);
      console.log(`    Status:   ${entry.status}`);
    }
  } finally {
    // Clean up temp dir
    await fs.rm(tmpDir, { recursive: true, force: true });
  }

  console.log("\nDone.");
}

await main();
