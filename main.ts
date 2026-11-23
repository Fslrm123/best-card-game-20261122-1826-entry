// Aetherfall Duels — entrypoint.
// Copies the static game (game/) and its screenshots (screenshots/)
// into the grader's output directory. All paths resolve from this
// module's own location, never from the process working directory.
import { cpSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || process.env.OUTPUT_DIR || join(here, "out");

mkdirSync(outDir, { recursive: true });

for (const dir of ["game", "screenshots"]) {
  const src = join(here, dir);
  if (existsSync(src)) {
    cpSync(src, join(outDir, dir), { recursive: true });
  }
}

console.log(`Aetherfall Duels written to ${outDir}`);
