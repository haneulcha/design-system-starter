// scripts/analysis/fetch.ts
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_URL = "https://github.com/VoltAgent/awesome-design-md";
const REPO_DIR = "data/raw-repo";
const OUT_DIR = "data/raw";

function clone(): void {
  if (existsSync(REPO_DIR)) {
    rmSync(REPO_DIR, { recursive: true, force: true });
  }
  console.log(`Cloning ${REPO_URL} → ${REPO_DIR}`);
  execFileSync("git", ["clone", "--depth", "1", REPO_URL, REPO_DIR], { stdio: "inherit" });
}

function listSystems(): string[] {
  const root = join(REPO_DIR, "design-md");
  return readdirSync(root)
    .filter((entry) => statSync(join(root, entry)).isDirectory())
    .sort();
}

function fetchSystem(system: string, outPath: string): { ok: boolean; reason?: string } {
  try {
    execFileSync("npx", ["-y", "getdesign@latest", "add", system, "--out", outPath], {
      stdio: ["ignore", "ignore", "pipe"],
    });
  } catch (err) {
    const e = err as { status?: number; stderr?: Buffer; message?: string };
    const stderr = e.stderr ? e.stderr.toString().trim().split("\n").slice(-2).join(" | ") : "";
    return { ok: false, reason: `exit=${e.status ?? "?"} ${stderr || e.message || ""}`.slice(0, 200) };
  }
  if (!existsSync(outPath)) return { ok: false, reason: "DESIGN.md not produced" };
  return { ok: true };
}

function main(): void {
  clone();
  const systems = listSystems();
  console.log(`Found ${systems.length} systems`);

  if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  let ok = 0;
  for (const [i, system] of systems.entries()) {
    process.stdout.write(`[${i + 1}/${systems.length}] ${system} ... `);
    const outPath = resolve(OUT_DIR, `${system}.md`);
    const result = fetchSystem(system, outPath);
    if (result.ok) {
      ok++;
      console.log("ok");
    } else {
      console.log(`FAILED (${result.reason})`);
    }
  }

  console.log(`\nCollected ${ok}/${systems.length} DESIGN.md files into ${OUT_DIR}/`);
}

main();
