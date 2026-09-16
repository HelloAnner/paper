/**
 * 生成 src/generated/registry.ts。
 *
 * 约定：新增文档模板 = 在 src/templates 下新建一个文件夹（文件夹名就是模板 id），
 * 里面导出 template.ts。build / dev / typecheck 前都会自动跑这个脚本，
 * 所以模板作者不需要手动登记。
 */

import { readdir, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const templatesDir = join(root, "src", "templates");
const outFile = join(root, "src", "generated", "registry.ts");

function ident(id: string): string {
  return "t_" + id.replace(/[^a-zA-Z0-9]/g, "_");
}

async function main(): Promise<void> {
  let dirs: string[] = [];
  if (existsSync(templatesDir)) {
    const entries = await readdir(templatesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      if (!existsSync(join(templatesDir, entry.name, "template.ts"))) continue;
      dirs.push(entry.name);
    }
  }
  dirs.sort();

  const lines: string[] = [];
  lines.push("// 本文件由 scripts/gen-registry.ts 自动生成，请勿手工修改。");
  lines.push("// 重新生成：bun run registry（make build / make dev 会自动执行）");
  lines.push("");
  lines.push("import type { TemplateModule } from \"../core/types\";");
  for (const id of dirs) {
    lines.push("import " + ident(id) + " from \"../templates/" + id + "/template\";");
  }
  lines.push("");
  lines.push("export const templates: TemplateModule[] = [");
  for (const id of dirs) lines.push("  " + ident(id) + ",");
  lines.push("];");
  lines.push("");

  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, lines.join("\n"), "utf8");
  console.log("registry: " + dirs.length + " template(s) -> " + outFile);
}

await main();
