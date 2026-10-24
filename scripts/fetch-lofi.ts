/**
 * Stocks the tape deck: downloads Holizna's CC0 lofi collections from
 * OpenGameArt, re-encodes a handful of tracks small enough to ship in the
 * repo, and writes public/lofi/playlist.json for src/components/player.
 *
 *   bun scripts/fetch-lofi.ts            # 4 tracks from each collection
 *   bun scripts/fetch-lofi.ts --per 6    # 6 from each
 *
 * Needs `unzip` and `ffmpeg` on PATH. Holizna dedicates this music to the
 * public domain (CC0 1.0), so it can be served and redistributed with no
 * attribution owed; the playlist credits them anyway. Only add other music
 * here if its licence allows redistribution (CC0 or CC-BY, credited); the
 * Pixabay licence, for one, forbids distributing tracks on their own.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";

const COLLECTIONS = [
  {
    page: "https://opengameart.org/content/chill-beats-collection",
    zip: "https://opengameart.org/sites/default/files/chill_beats.zip",
  },
  {
    page: "https://opengameart.org/content/happy-lo-fi-lofi-collection",
    zip: "https://opengameart.org/sites/default/files/happy_lo-fi_lofi_collection.zip",
  },
];

const OUT = "public/lofi";
const AUDIO = /\.(mp3|wav|ogg|flac|m4a)$/i;
const perArg = process.argv.indexOf("--per");
const PER = perArg > 0 ? Number(process.argv[perArg + 1]) : 4;

function run(cmd: string, args: string[]) {
  const r = spawnSync(cmd, args, { stdio: ["ignore", "ignore", "inherit"] });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed`);
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : AUDIO.test(name) ? [p] : [];
  });
}

/** "03_holizna - Lighter Than Air.wav" → "Lighter Than Air" */
function titleOf(file: string) {
  return basename(file, extname(file))
    .replace(/^[\d\s._-]+/, "")
    .replace(/^holizna\s*[-–_]\s*/i, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const tmp = mkdtempSync(join(tmpdir(), "lofi-"));
mkdirSync(OUT, { recursive: true });
const tracks: { src: string; title: string; artist: string; license: string; source: string }[] = [];

try {
  for (const c of COLLECTIONS) {
    const zip = join(tmp, basename(c.zip));
    console.log(`fetching ${c.zip}`);
    const res = await fetch(c.zip);
    if (!res.ok) throw new Error(`${c.zip}: HTTP ${res.status}`);
    writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
    const dir = join(tmp, slug(basename(c.zip, ".zip")));
    run("unzip", ["-q", "-o", zip, "-d", dir]);

    for (const file of walk(dir).sort().slice(0, PER)) {
      const title = titleOf(file);
      const name = `${slug(title)}.mp3`;
      // Lofi survives 112k joint stereo fine; ~0.8 MB a minute.
      run("ffmpeg", ["-y", "-loglevel", "error", "-i", file, "-vn", "-ac", "2", "-b:a", "112k", "-map_metadata", "-1", join(OUT, name)]);
      tracks.push({ src: `/lofi/${name}`, title, artist: "Holizna", license: "CC0-1.0", source: c.page });
      console.log(`  + ${title}`);
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

writeFileSync(join(OUT, "playlist.json"), JSON.stringify({ name: "Moss tapes", tracks }, null, 2) + "\n");
console.log(`wrote ${tracks.length} tracks to ${OUT}/playlist.json`);
