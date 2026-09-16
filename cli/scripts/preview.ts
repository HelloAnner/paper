/**
 * 开发辅助：把 PDF 的指定页导出成 PNG，方便肉眼检查排版。
 *
 * 用法：
 *   bun run scripts/preview.ts out/report.pdf 1,2,3
 * 产物：out/report.p1.png 等（用 macOS 自带 sips 转换）
 */

import { PDFDocument } from "pdf-lib";
import { basename, dirname, extname, join } from "node:path";

const [, , file, pagesArg] = process.argv;
if (!file) {
  process.stderr.write("用法：bun run scripts/preview.ts <pdf> [页码，如 1,2,3]\n");
  process.exit(1);
}

const source = await PDFDocument.load(await Bun.file(file).arrayBuffer());
const total = source.getPageCount();
const pages = (pagesArg ?? "1")
  .split(",")
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isInteger(value) && value >= 1 && value <= total);

if (pages.length === 0) {
  process.stderr.write("页码无效，该 PDF 共 " + total + " 页\n");
  process.exit(1);
}

const dir = dirname(file);
const stem = basename(file, extname(file));

for (const pageNumber of pages) {
  const single = await PDFDocument.create();
  const [page] = await single.copyPages(source, [pageNumber - 1]);
  if (page) single.addPage(page);
  const pdfPath = join(dir, stem + ".p" + pageNumber + ".pdf");
  await Bun.write(pdfPath, await single.save());

  const pngPath = join(dir, stem + ".p" + pageNumber + ".png");
  const result = Bun.spawnSync(["sips", "-s", "format", "png", pdfPath, "--out", pngPath], {
    stdout: "ignore",
    stderr: "pipe",
  });
  if ((result.exitCode ?? 1) !== 0) {
    process.stderr.write("✗ sips 转换失败：" + result.stderr.toString() + "\n");
    process.exit(1);
  }
  process.stdout.write("✓ 第 " + pageNumber + " 页 -> " + pngPath + "\n");
}

process.stdout.write("（共 " + total + " 页）\n");
