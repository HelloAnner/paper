/**
 * 准备 pdf 用的中文字体到 cli/assets/fonts。
 *
 * 做法：下载 Noto Sans SC 可变字体（ttf/glyf），再用 fontTools 实例化出
 * 常规（wght=400）与粗体（wght=700）两个静态 ttf。
 *
 * 为什么要 ttf：
 *   - pdf-lib 自带的 CFF 子集化有 bug（中文乱码）；
 *   - paper 的稀疏子集化只支持 glyf 轮廓。
 *
 * 没有 python3/fontTools 时退化为"两个权重共用可变字体"，仍可正常出文档，
 * 只是粗体不生效、单份 PDF 会大一些。
 */

import { mkdir, stat, writeFile, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(here, "..");
const outDir = join(cliRoot, "assets", "fonts");
const vfPath = join(outDir, "NotoSansSC-VF.ttf");

const VF_URL =
  "https://raw.githubusercontent.com/google/fonts/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf";

const force = process.argv.includes("--force");

const TARGETS = [
  { file: "NotoSansSC-Regular.ttf", weight: 400, psName: "NotoSansSC-Regular" },
  { file: "NotoSansSC-Bold.ttf", weight: 700, psName: "NotoSansSC-Bold" },
];

await mkdir(outDir, { recursive: true });

function sizeMb(path: string): Promise<string> {
  return stat(path).then((info) => (info.size / 1024 / 1024).toFixed(1) + " MB");
}

async function hasFontTools(): Promise<boolean> {
  const probe = Bun.spawnSync(["python3", "-c", "import fontTools"], { stdout: "ignore", stderr: "ignore" });
  return (probe.exitCode ?? 1) === 0;
}

// 1) 可变字体
if (!existsSync(vfPath) || force) {
  process.stdout.write("→ 下载 NotoSansSC-VF.ttf ...\n");
  const response = await fetch(VF_URL);
  if (!response.ok) {
    process.stderr.write("✗ 下载失败 " + VF_URL + "（HTTP " + response.status + "）\n");
    process.exit(1);
  }
  await writeFile(vfPath, new Uint8Array(await response.arrayBuffer()));
  process.stdout.write("  ✓ " + (await sizeMb(vfPath)) + "\n");
} else {
  process.stdout.write("· 已存在 NotoSansSC-VF.ttf（" + (await sizeMb(vfPath)) + "）\n");
}

// 2) 实例化静态字重
const todo = TARGETS.filter((target) => force || !existsSync(join(outDir, target.file)));
if (todo.length > 0 && (await hasFontTools())) {
  for (const target of todo) {
    const output = join(outDir, target.file);
    process.stdout.write("→ 实例化 " + target.file + "（wght=" + target.weight + "）...\n");
    const result = Bun.spawnSync(
      [
        "python3",
        join(here, "instance-font.py"),
        vfPath,
        output,
        "--weight",
        String(target.weight),
        "--ps-name",
        target.psName,
      ],
      { stdout: "inherit", stderr: "inherit" },
    );
    if ((result.exitCode ?? 1) !== 0) {
      process.stderr.write("✗ 实例化失败：" + target.file + "\n");
      process.exit(1);
    }
  }
} else if (todo.length > 0) {
  process.stdout.write("! 未检测到 python3/fontTools，改用可变字体兜底（粗体不生效）\n");
  for (const target of todo) await copyFile(vfPath, join(outDir, target.file));
}

// 3) 清理旧的 otf（CFF 轮廓不可用于子集化）
for (const stale of ["NotoSansSC-Regular.otf", "NotoSansSC-Bold.otf"]) {
  const path = join(outDir, stale);
  if (existsSync(path)) {
    await Bun.write(path, "");
    const { unlink } = await import("node:fs/promises");
    await unlink(path);
    process.stdout.write("· 已移除旧文件 " + stale + "\n");
  }
}

for (const target of TARGETS) {
  const path = join(outDir, target.file);
  if (existsSync(path)) process.stdout.write("✓ " + target.file + "（" + (await sizeMb(path)) + "）\n");
}
process.stdout.write("✓ 字体就绪：" + outDir + "\n");
