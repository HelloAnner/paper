/**
 * 打包：生成注册表 -> 编译成单文件二进制 dist/paper。
 * 产物直接拷到 PREFIX/bin 即可运行，不依赖 node_modules。
 */

import { mkdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outfile = join(root, "dist", "paper");

function run(cmd: string[], cwd: string): void {
  const result = Bun.spawnSync(cmd, { cwd, stdout: "inherit", stderr: "inherit" });
  if ((result.exitCode ?? 1) !== 0) process.exit(result.exitCode ?? 1);
}

run(["bun", "run", join(here, "gen-registry.ts")], root);
await mkdir(dirname(outfile), { recursive: true });
run(["bun", "build", "--compile", "--minify", "--outfile", outfile, join(root, "src", "cli.ts")], root);

const info = await stat(outfile);
process.stdout.write("✓ 已编译 " + outfile + "（" + (info.size / 1024 / 1024).toFixed(1) + " MB）\n");
