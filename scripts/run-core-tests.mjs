import { rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const outDir = ".tmp-core-tests";
rmSync(outDir, { recursive: true, force: true });

const tsc = spawnSync(
  process.execPath,
  [
    join("node_modules", "typescript", "bin", "tsc"),
    "--outDir",
    outDir,
    "--module",
    "commonjs",
    "--target",
    "es2020",
    "--moduleResolution",
    "node",
    "--esModuleInterop",
    "--skipLibCheck",
    "tests/core.test.ts"
  ],
  { stdio: "inherit" }
);

if (tsc.status !== 0) {
  process.exit(tsc.status ?? 1);
}

const test = spawnSync(process.execPath, ["--test", join(outDir, "tests", "core.test.js")], {
  stdio: "inherit"
});

rmSync(outDir, { recursive: true, force: true });
process.exit(test.status ?? 1);
