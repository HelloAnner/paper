/**
 * paper list [<模板 id>]
 *   不带参数：列出全部文档模板（给 AI 挑模板用）
 *   带参数：列出该模板的组件构成
 */

import { parseArgs, type ParsedArgs } from "../core/args";
import { emit, renderTable, type IO } from "../core/output";
import { allTemplates, requireTemplate, sortedComponents } from "../core/registry";
import { compactSignature } from "../core/schema";

export const listUsage = "paper list [<模板 id>] [--json]";

export function runList(args: ParsedArgs, io: IO): void {
  const id = args.positionals[1];

  if (!id) {
    const templates = allTemplates();
    if (templates.length === 0) {
      throw new Error("没有找到任何模板，请检查 src/templates 目录");
    }
    if (io.json) {
      emit(io, "", {
        templates: templates.map((t) => ({
          id: t.meta.id,
          name: t.meta.name,
          format: t.meta.format,
          description: t.meta.description,
          useWhen: t.meta.useWhen,
          tags: t.meta.tags ?? [],
          components: sortedComponents(t).map((c) => c.meta.id),
        })),
      });
      return;
    }
    const rows: string[][] = [["模板 id", "名称", "格式", "适用场景"]];
    for (const t of templates) {
      rows.push([
        t.meta.id,
        t.meta.name,
        t.meta.format,
        t.meta.useWhen,
      ]);
    }
    const lines = [renderTable(rows), ""];
    lines.push("用法：paper list <模板 id>  看组件；paper describe <模板 id>  看数据契约。");
    emit(io, lines.join("\n"), null);
    return;
  }

  const template = requireTemplate(id);
  const components = sortedComponents(template);
  if (io.json) {
    emit(io, "", {
      id: template.meta.id,
      name: template.meta.name,
      format: template.meta.format,
      dataContract: compactSignature(template.schema),
      components: components.map((c) => ({
        id: c.meta.id,
        name: c.meta.name,
        optional: Boolean(c.meta.optional),
        order: c.meta.order ?? 100,
        description: c.meta.description,
        useWhen: c.meta.useWhen ?? "",
      })),
    });
    return;
  }

  const rows: string[][] = [["组件 id", "名称", "必选", "作用"]];
  for (const c of components) {
    rows.push([c.meta.id, c.meta.name, c.meta.optional ? "可选" : "必选", c.meta.description]);
  }
  const lines: string[] = [];
  lines.push(template.meta.name + "（" + template.meta.id + "，" + template.meta.format + "）");
  lines.push(template.meta.description);
  lines.push("");
  lines.push(renderTable(rows));
  const optional = components.filter((c) => c.meta.optional);
  if (optional.length > 0) {
    lines.push("");
    lines.push("可选组件的自动触发条件：");
    for (const c of optional) {
      lines.push("  · " + c.meta.id + "：" + (c.meta.useWhen ?? "需要显式 --component 指定"));
    }
  }
  lines.push("");
  lines.push("生成：paper sample " + template.meta.id + " > data.json && paper gen " + template.meta.id + " -d data.json");
  emit(io, lines.join("\n"), null);
}

export async function listCommand(argv: string[], io: IO): Promise<void> {
  const args = parseArgs(argv);
  runList(args, io);
}
