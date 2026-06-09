/**
 * Interactive CLI for managing project dossiers.
 *
 * Reads and writes individual YAML files in content/projects/.
 * Uses LLM (Deepseek) to generate dossiers from repo context.
 * Runs scripts/build-projects.ts after any mutation to regenerate the typed module.
 *
 * Usage:
 *   bun run maintain-projects
 *
 * Modes:
 *   1. Add project from repo URL   — clone, scrape, LLM-generate, review, save
 *   2. Add project from local dir  — scan, LLM-generate, review, save
 *   3. Edit existing project       — LLM-assisted refinement
 *   4. Remove project              — delete YAML file
 *   5. Refresh from GitHub READMEs — update description/overview from remote
 *
 * Requires: DEEPSEEK_API_KEY in environment or .env.local
 */

import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import fss from "node:fs";
import path from "node:path";
import os from "node:os";
import yaml from "js-yaml";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "node:process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PROJECTS_DIR = path.join(ROOT, "content", "projects");

// ---- env -----------------------------------------------------------------------

try {
  loadEnvFile(path.join(ROOT, ".env.local"));
} catch { /* env vars may be injected directly in CI */ }

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// ---- Inquirer helpers ----------------------------------------------------------

async function select<T extends string>(message: string, choices: { name: string; value: T }[]): Promise<T> {
  const { select: inquirerSelect } = await import("@inquirer/prompts");
  return inquirerSelect({ message, choices });
}

async function input(message: string): Promise<string> {
  const { input: inquirerInput } = await import("@inquirer/prompts");
  return inquirerInput({ message });
}

async function confirm(message: string): Promise<boolean> {
  const { confirm: inquirerConfirm } = await import("@inquirer/prompts");
  return inquirerConfirm({ message, default: true });
}

async function editor(content: string, message?: string): Promise<string> {
  // Try inquirer editor, fall back to showing + asking to accept
  try {
    const { editor: inquirerEditor } = await import("@inquirer/prompts");
    return await inquirerEditor({
      message: message ?? "Review and edit the YAML (save and close to continue):",
      default: content,
    });
  } catch {
    console.log("\n--- Generated YAML ---\n");
    console.log(content);
    console.log("\n--- End ---\n");
    const accepted = await confirm("Accept this dossier?");
    return accepted ? content : "";
  }
}

// ---- YAML helpers ---------------------------------------------------------------

interface ProjectYaml {
  title: string;
  subtitle: string;
  summary: string;
  description: string;
  overview: string[];
  repo?: string;
  live?: string;
  techStack: string[];
  layout: "wide" | "standard" | "full";
  status: string;
  year: string;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function listProjectSlugs(): Promise<string[]> {
  try {
    const files = await fs.readdir(PROJECTS_DIR);
    return files.filter((f) => f.endsWith(".yaml") || f.endsWith(".yml")).map((f) => f.replace(/\.ya?ml$/, ""));
  } catch {
    return [];
  }
}

async function readProjectYaml(slug: string): Promise<ProjectYaml | null> {
  const yamlPath = path.join(PROJECTS_DIR, `${slug}.yaml`);
  const ymlPath = path.join(PROJECTS_DIR, `${slug}.yml`);
  let filePath: string | null = null;
  if (fss.existsSync(yamlPath)) filePath = yamlPath;
  else if (fss.existsSync(ymlPath)) filePath = ymlPath;
  if (!filePath) return null;
  const raw = await fs.readFile(filePath, "utf-8");
  return yaml.load(raw) as ProjectYaml;
}

async function writeProjectYaml(slug: string, data: ProjectYaml): Promise<void> {
  const filePath = path.join(PROJECTS_DIR, `${slug}.yaml`);
  const content = yaml.dump(data, {
    lineWidth: 120,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  });
  await fs.writeFile(filePath, content, "utf-8");
  console.log(`  Written: ${path.relative(ROOT, filePath)}`);
}

async function deleteProjectYaml(slug: string): Promise<void> {
  for (const ext of [".yaml", ".yml"]) {
    const filePath = path.join(PROJECTS_DIR, `${slug}${ext}`);
    try {
      await fs.unlink(filePath);
      console.log(`  Removed: ${path.relative(ROOT, filePath)}`);
      return;
    } catch { /* no git remote */ }
  }  console.log(`  No file found for "${slug}"`);
}

async function rebuild(): Promise<void> {
  console.log("\n  Rebuilding project-dossiers.ts...");
  execSync("bun scripts/build-projects.ts", { cwd: ROOT, stdio: "inherit" });
}

// ---- Repo scraping ------------------------------------------------------------

const README_NAMES = [
  "README.md", "README.MD", "readme.md", "README.rst", "README.txt", "README",
];

const MANIFEST_FILES = [
  "package.json", "Cargo.toml", "go.mod", "pyproject.toml", "setup.py",
  "requirements.txt", "Gemfile", "composer.json", "bun.lock", "deno.json",
];

const DEPLOYMENT_FILES = [
  "vercel.json", "fly.toml", "Dockerfile", "docker-compose.yml",
  "netlify.toml", "railway.toml", "render.yaml",
];

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "target", "__pycache__",
  ".next", ".nuxt", "vendor", ".venv", "venv", "coverage", ".vercel",
]);

const MAX_FILE_CHARS = 8_000;
const MAX_CONTEXT_CHARS = 48_000;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function readTruncated(filePath: string): Promise<string> {
  const stat = await fs.stat(filePath).catch(() => null);
  if (!stat || stat.size > 200_000) return "";
  const buf = await fs.readFile(filePath, "utf-8");
  return buf.slice(0, MAX_FILE_CHARS);
}

async function collectRepoContext(repoDir: string): Promise<string> {
  const parts: string[] = [];

  for (const name of README_NAMES) {
    const content = await readTruncated(path.join(repoDir, name));
    if (content) { parts.push(`=== ${name} ===\n${content}`); break; }
  }

  for (const name of MANIFEST_FILES) {
    const content = await readTruncated(path.join(repoDir, name));
    if (content) parts.push(`=== ${name} ===\n${content}`);
  }

  let total = parts.join("\n\n");
  if (total.length > MAX_CONTEXT_CHARS) {
    total = total.slice(0, MAX_CONTEXT_CHARS) + "\n\n[... truncated]";
  }
  return total;
}

async function scanLocalDir(dir: string, name: string): Promise<string> {
  const parts: string[] = [];

  for (const n of README_NAMES) {
    const content = await readTruncated(path.join(dir, n));
    if (content) { parts.push(`=== ${n} ===\n${content}`); break; }
  }

  for (const mf of MANIFEST_FILES) {
    const content = await readTruncated(path.join(dir, mf));
    if (content) parts.push(`=== ${mf} ===\n${content}`);
  }

  for (const df of DEPLOYMENT_FILES) {
    const content = await readTruncated(path.join(dir, df));
    if (content) parts.push(`=== ${df} ===\n${content}`);
  }

  // Git remote
  try {
    const remote = execSync(`git -C ${dir} remote get-url origin 2>/dev/null`, {
      encoding: "utf-8", timeout: 5_000,
    }).trim();
    if (remote) parts.push(`=== Git Remote ===\n${remote}`);
  } catch { /* git remote lookup failed */ }

  let total = parts.join("\n\n");
  if (total.length > MAX_CONTEXT_CHARS) {
    total = total.slice(0, MAX_CONTEXT_CHARS) + "\n\n[... truncated]";
  }
  return total;
}

function cloneRepo(url: string, tmpDir: string): string {
  const slug = slugify(url.replace(/\.git$/, "").split("/").pop() ?? "unknown");
  const target = path.join(tmpDir, slug);
  console.log(`  Cloning ${url} ...`);
  try {
    execSync(`git clone --depth 1 ${url} ${target}`, { stdio: "pipe", timeout: 120_000 });
  } catch {
    const sshUrl = url.replace(/^https:\/\/([^/]+)\//, "git@$1:");
    console.log(`  HTTPS failed, trying SSH: ${sshUrl}`);
    try {
      execSync(`git clone --depth 1 ${sshUrl} ${target}`, { stdio: "pipe", timeout: 120_000 });
    } catch {
      throw new Error(`Failed to clone ${url} (tried HTTPS and SSH)`);
    }
  }
  return target;
}

// ---- LLM generation ------------------------------------------------------------

interface DeepseekResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

const STATUS_OPTIONS = [
  "Active build", "In development", "Research", "Prototype",
  "Concept", "Concept study", "Protocol R&D",
];

async function generateDossier(
  slug: string,
  context: string,
  repoUrl?: string,
  liveUrl?: string,
): Promise<ProjectYaml> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY is required. Set it in .env.local or environment.");
  }

  const linksHint: string[] = [];
  if (repoUrl) linksHint.push(`{"label": "GitHub", "href": "${repoUrl}"}`);
  if (liveUrl) linksHint.push(`{"label": "Live demo", "href": "${liveUrl}"}`);

  const systemPrompt = `You are a technical writer generating a project dossier for a portfolio website. Given the repository context, produce a YAML object matching this schema — no markdown fences, no extra keys, just raw YAML:

accent: hex color that captures the project's visual identity (e.g. "#e4a853" for monetary/financial, "#5d9b7a" for cartographic/earth, "#c75d3a" for trading/intense, "#e08a3c" for editorial/warm)
title: Human-readable project name
subtitle: 2-3 word category label
summary: 1-2 sentence high-level summary
description: 2-3 sentence deeper description
overview:
  - Paragraph 1 of the overview narrative
  - Paragraph 2 expanding on design philosophy or architecture
repo: ${repoUrl ?? "omit if not applicable"}
live: ${liveUrl ?? "omit if not applicable"}
techStack:
  - Technology 1
  - Technology 2
layout: standard or wide (use wide for data-heavy / map-based / visual projects)
status: one of: ${STATUS_OPTIONS.join(", ")}
year: project year

Rules:
- Be specific, not generic. Avoid "innovative solution" or "cutting-edge".
- The accent color should feel right for the project's domain, not random.
- Summary and description should read like editorial copy, not a spec sheet.
- Overview paragraphs should be 2-4 sentences each, thoughtful and opinionated.
- Do NOT use em dashes. Use commas, periods, or restructure instead.
- Respond with ONLY the YAML object, nothing else.`;

  console.log("  Calling Deepseek API...");

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here is the project context:\n\n${context}` },
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

  let yamlStr = content.trim();
  if (yamlStr.startsWith("```")) {
    yamlStr = yamlStr.replace(/^```(?:yaml)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = yaml.load(yamlStr) as ProjectYaml;

  // Defaults / validation
  if (!parsed.layout || !["wide", "standard", "full"].includes(parsed.layout)) {
    parsed.layout = "standard";
  }
  if (!parsed.techStack) parsed.techStack = [];
  if (!STATUS_OPTIONS.includes(parsed.status)) {
    parsed.status = "In development";
  }

  return parsed;
}

async function refineDossier(
  current: ProjectYaml,
  instruction: string,
): Promise<ProjectYaml> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY is required. Set it in .env.local or environment.");
  }

  const currentYaml = yaml.dump(current, { lineWidth: 120, noRefs: true });

  const systemPrompt = `You are a technical writer refining a project dossier. Given the current YAML and the user's instruction, produce an updated YAML object with the same schema. Keep all fields that the user didn't ask to change. Respond with ONLY the updated YAML, nothing else.

Current dossier:
${currentYaml}

Rules:
- Be specific, not generic.
- Do NOT use em dashes.
- Overview paragraphs should be 2-4 sentences each.
- Summary and description should read like editorial copy.`;

  console.log("  Calling Deepseek API for refinement...");

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: instruction },
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

  let yamlStr = content.trim();
  if (yamlStr.startsWith("```")) {
    yamlStr = yamlStr.replace(/^```(?:yaml)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = yaml.load(yamlStr) as ProjectYaml;

  if (!parsed.layout || !["wide", "standard", "full"].includes(parsed.layout)) {
    parsed.layout = current.layout;
  }
  if (!parsed.techStack) parsed.techStack = current.techStack;
  if (!STATUS_OPTIONS.includes(parsed.status)) {
    parsed.status = current.status;
  }

  return parsed;
}

// ---- GitHub README refresh -----------------------------------------------------

function extractGitHubRepoInfo(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

async function fetchReadmeFromGitHub(owner: string, repo: string): Promise<string | null> {
  const apiUrls = [
    `https://api.github.com/repos/${owner}/${repo}/readme`,
  ];

  for (const url of apiUrls) {
    try {
      const res = await fetch(url, {
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "kygra-maintain-projects",
        },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) continue;
      const data = await res.json() as { content?: string; encoding?: string; download_url?: string };
      if (data.content && data.encoding === "base64") {
        return Buffer.from(data.content, "base64").toString("utf-8");
      }
      if (data.download_url) {
        const dlRes = await fetch(data.download_url, {
          headers: { "User-Agent": "kygra-maintain-projects" },
          signal: AbortSignal.timeout(15_000),
        });
        if (dlRes.ok) return await dlRes.text();
      }
    } catch { continue; }
  }

  for (const branch of ["main", "master"]) {
    for (const name of README_NAMES) {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${name}`;
      try {
        const res = await fetch(rawUrl, {
          headers: { "User-Agent": "kygra-maintain-projects" },
          signal: AbortSignal.timeout(10_000),
        });
        if (res.ok) return await res.text();
      } catch { continue; }
    }
  }
  return null;
}

function readmeToOverview(readme: string): string[] {
  const lines = readme
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/`{3}[\s\S]*?`{3}/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    .replace(/_{1,3}([^_]+)_{1,3}/g, "$1")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const paragraphs: string[] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line.length > 0) current.push(line);
    else if (current.length > 0) { paragraphs.push(current.join(" ")); current = []; }
  }
  if (current.length > 0) paragraphs.push(current.join(" "));

  return paragraphs.filter((p) => p.length > 40).slice(0, 2);
}

function readmeToDescription(readme: string): string | null {
  const overview = readmeToOverview(readme);
  if (!overview.length) return null;
  const first = overview[0];
  if (first.length > 280) {
    const truncated = first.slice(0, 277);
    const lastPeriod = truncated.lastIndexOf(".");
    return lastPeriod > 100 ? truncated.slice(0, lastPeriod + 1) : truncated + "...";
  }
  return first;
}

// ---- Actions -------------------------------------------------------------------

async function actionAddFromUrl() {
  const url = await input("Repository URL:");
  if (!url.trim()) { console.log("Aborted."); return; }

  const liveUrl = await input("Live URL (leave blank if none):");
  const repoUrl = url.trim().replace(/\.git$/, "");
  const slug = slugify(repoUrl.split("/").pop() ?? "unknown");

  const existingSlugs = await listProjectSlugs();
  if (existingSlugs.includes(slug)) {
    console.log(`  Project "${slug}" already exists. Use edit mode instead.`);
    return;
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "dossier-"));
  try {
    let repoDir: string;
    try {
      repoDir = cloneRepo(repoUrl, tmpDir);
    } catch (err) {
      console.error(`  ✗ ${getErrorMessage(err)}`);
      return;
    }

    const context = await collectRepoContext(repoDir);
    if (!context.trim()) {
      console.warn("  No readable content found in repo. Aborting.");
      return;
    }

    const dossier = await generateDossier(slug, context, repoUrl, liveUrl.trim() || undefined);

    const yamlContent = yaml.dump(dossier, { lineWidth: 120, noRefs: true });
    console.log("\n  Generated dossier preview:");
    console.log(`    Title:    ${dossier.title}`);
    console.log(`    Subtitle: ${dossier.subtitle}`);
    console.log(`    Status:   ${dossier.status}`);
    console.log(`    Stack:    ${dossier.techStack.join(", ") || "none"}`);

    const edited = await editor(yamlContent, "Review and edit the YAML (save/close to accept, clear all to reject):");
    if (!edited.trim()) {
      console.log("  Dossier rejected. Aborting.");
      return;
    }

    const finalData = yaml.load(edited) as ProjectYaml;
    await writeProjectYaml(slug, finalData);
    await rebuild();
    console.log(`\n  ✓ Project "${slug}" added.`);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

async function actionAddFromLocal() {
  const defaultDir = path.resolve(ROOT, "..");
  const dirInput = await input(`Directory to scan (default: ${defaultDir}):`);
  const venturesDir = dirInput.trim() || defaultDir;

  let entries: fss.Dirent[];
  try {
    entries = await fs.readdir(venturesDir, { withFileTypes: true });
  } catch {
    console.error(`  Cannot read: ${venturesDir}`);
    return;
  }

  const projectDirs = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith(".") && !e.name.startsWith("_"))
    .map((e) => ({ dir: path.join(venturesDir, e.name), name: e.name }));

  if (!projectDirs.length) {
    console.log("  No directories found.");
    return;
  }

  const chosen = await select(
    "Which project to add?",
    [
      ...projectDirs.map((p) => ({ name: p.name, value: p.dir })),
      { name: "Cancel", value: "__cancel__" },
    ],
  );
  if (chosen === "__cancel__") return;

  const name = path.basename(chosen);
  const slug = slugify(name);

  const existingSlugs = await listProjectSlugs();
  if (existingSlugs.includes(slug)) {
    console.log(`  Project "${slug}" already exists. Use edit mode instead.`);
    return;
  }

  const context = await scanLocalDir(chosen, name);
  if (!context.trim()) {
    console.warn("  No readable content found. Aborting.");
    return;
  }

  // Try to extract repo/live URLs
  let repoUrl: string | undefined;
  try {
    repoUrl = execSync(`git -C ${chosen} remote get-url origin 2>/dev/null`, {
      encoding: "utf-8", timeout: 5_000,
    }).trim().replace(/\.git$/, "") || undefined;
  } catch { /* no git remote */ }

  const dossier = await generateDossier(slug, context, repoUrl);
  const yamlContent = yaml.dump(dossier, { lineWidth: 120, noRefs: true });

  console.log("\n  Generated dossier preview:");
  console.log(`    Title:    ${dossier.title}`);
  console.log(`    Subtitle: ${dossier.subtitle}`);
  console.log(`    Status:   ${dossier.status}`);
  console.log(`    Stack:    ${dossier.techStack.join(", ") || "none"}`);

  const edited = await editor(yamlContent, "Review and edit the YAML (save/close to accept, clear all to reject):");
  if (!edited.trim()) {
    console.log("  Dossier rejected. Aborting.");
    return;
  }

  const finalData = yaml.load(edited) as ProjectYaml;
  await writeProjectYaml(slug, finalData);
  await rebuild();
  console.log(`\n  ✓ Project "${slug}" added.`);
}

async function actionEdit() {
  const slugs = await listProjectSlugs();
  if (!slugs.length) {
    console.log("  No projects to edit.");
    return;
  }

  const slug = await select("Which project to edit?", [
    ...slugs.map((s) => ({ name: s, value: s })),
    { name: "Cancel", value: "__cancel__" },
  ]);
  if (slug === "__cancel__") return;

  const current = await readProjectYaml(slug);
  if (!current) {
    console.log(`  No YAML file found for "${slug}".`);
    return;
  }

  console.log(`\n  Current dossier for "${slug}":`);
  console.log(`    Title:    ${current.title}`);
  console.log(`    Subtitle: ${current.subtitle}`);
  console.log(`    Status:   ${current.status}`);

  const editMode = await select("How to edit?", [
    { name: "Describe changes (LLM-assisted)", value: "llm" },
    { name: "Edit YAML directly", value: "manual" },
    { name: "Cancel", value: "__cancel__" },
  ]);
  if (editMode === "__cancel__") return;

  if (editMode === "llm") {
    const instruction = await input("What should change? Describe the edits:");
    if (!instruction.trim()) { console.log("Aborted."); return; }

    try {
      const refined = await refineDossier(current, instruction.trim());
      const yamlContent = yaml.dump(refined, { lineWidth: 120, noRefs: true });

      console.log("\n  Refined dossier preview:");
      console.log(`    Title:    ${refined.title}`);
      console.log(`    Subtitle: ${refined.subtitle}`);
      console.log(`    Status:   ${refined.status}`);

      const edited = await editor(yamlContent, "Review the refined YAML:");
      if (!edited.trim()) {
        console.log("  Changes rejected. Keeping current version.");
        return;
      }
      const finalData = yaml.load(edited) as ProjectYaml;
      await writeProjectYaml(slug, finalData);
      await rebuild();
      console.log(`\n  ✓ Project "${slug}" updated.`);
    } catch (err) {
      console.error(`  ✗ LLM refinement failed: ${getErrorMessage(err)}`);
    }
  } else {
    const currentYaml = yaml.dump(current, { lineWidth: 120, noRefs: true });
    const edited = await editor(currentYaml, "Edit the YAML directly:");
    if (!edited.trim()) {
      console.log("  Changes rejected. Keeping current version.");
      return;
    }
    const finalData = yaml.load(edited) as ProjectYaml;
    await writeProjectYaml(slug, finalData);
    await rebuild();
    console.log(`\n  ✓ Project "${slug}" updated.`);
  }
}

async function actionRemove() {
  const slugs = await listProjectSlugs();
  if (!slugs.length) {
    console.log("  No projects to remove.");
    return;
  }

  const slug = await select("Which project to remove?", [
    ...slugs.map((s) => ({ name: s, value: s })),
    { name: "Cancel", value: "__cancel__" },
  ]);
  if (slug === "__cancel__") return;

  const confirmed = await confirm(`Remove project "${slug}"? This deletes the YAML file.`);
  if (!confirmed) { console.log("Aborted."); return; }

  await deleteProjectYaml(slug);
  await rebuild();
  console.log(`\n  ✓ Project "${slug}" removed.`);
}

async function actionSyncReadme() {
  console.log("  Refreshing project descriptions from GitHub READMEs...\n");

  const slugs = await listProjectSlugs();
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const slug of slugs) {
    const project = await readProjectYaml(slug);
    if (!project || !project.repo) {
      console.log(`  ⊘ ${slug}: no repo URL, skipping`);
      skipped++;
      continue;
    }

    const info = extractGitHubRepoInfo(project.repo);
    if (!info) {
      console.log(`  ⊘ ${slug}: could not parse GitHub URL, skipping`);
      skipped++;
      continue;
    }

    console.log(`  ↻ ${slug}: fetching README from ${info.owner}/${info.repo}`);

    const readme = await fetchReadmeFromGitHub(info.owner, info.repo);
    if (!readme) {
      console.log(`  ✗ ${slug}: could not fetch README`);
      failed++;
      continue;
    }

    const newDescription = readmeToDescription(readme);
    const newOverview = readmeToOverview(readme);

    if (newDescription) project.description = newDescription;
    if (newOverview.length > 0) project.overview = newOverview;

    await writeProjectYaml(slug, project);
    console.log(`  ✓ ${slug}: updated`);
    updated++;
  }

  if (updated > 0) await rebuild();
  console.log(`\nSync complete: ${updated} updated, ${skipped} skipped, ${failed} failed.`);
}

// ---- Main ----------------------------------------------------------------------

async function main() {
  console.log("\n  maintain-projects — Interactive Project Dossier CLI\n");

  if (!DEEPSEEK_API_KEY) {
    console.warn("  Warning: DEEPSEEK_API_KEY not set. LLM features will be unavailable.\n");
  }

  // Ensure projects dir exists
  await fs.mkdir(PROJECTS_DIR, { recursive: true });

  const action = await select("What would you like to do?", [
    { name: "Add project from repo URL", value: "add-url" },
    { name: "Add project from local directory", value: "add-local" },
    { name: "Edit existing project", value: "edit" },
    { name: "Remove project", value: "remove" },
    { name: "Refresh from GitHub READMEs", value: "sync" },
    { name: "Quit", value: "quit" },
  ]);

  switch (action) {
    case "add-url":   await actionAddFromUrl(); break;
    case "add-local": await actionAddFromLocal(); break;
    case "edit":      await actionEdit(); break;
    case "remove":    await actionRemove(); break;
    case "sync":      await actionSyncReadme(); break;
    case "quit":      console.log("Bye."); break;
  }
}

await main();
