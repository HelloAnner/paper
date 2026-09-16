/**
 * paper describe <模板 id>
 * 给 AI 的"完整说明书"：模板定位、数据契约（逐字段说明）、组件、示例数据。
 */

import { flagBool, parseArgs, type ParsedArgs } from "../core/args";
import { emit, renderTable, type IO } from "../core/output";
import { requireTemplate, sortedComponents } from "../core/registry";
import { sampleFromSchema, schemaRows } from "../core/schema";
import { usage } from "../core/errors";

export const describeUsage = "paper describe <模板 id> [--json]";

export function runDescribe(args: ParsedArgs, io: IO): void {
  const id = args.positionals[1];
  if (!id) throw usage("缺少模板 id", "用法：" + describeUsage);
  const template = requireTemplate(id);
  const sample = template.sample ?? sampleFromSchema(template.schema);
  const components = sortedComponents(template);

  if (io.json) {
    emit(io, "", {
      id: template.meta.id,
      name: template.meta.name,
      format: template.meta.format,
      description: template.meta.description,
      useWhen: template.meta.useWhen,
      schema: template.schema,
      components: components.map((c) => ({
        id: c.meta.id,
        name: c.meta.name,
        description: c.meta.description,
        optional: Boolean(c.meta.optional),
        useWhen: c.meta.useWhen ?? "",
      })),
      sample,
      commands: {
        sample: "paper sample " + template.meta.id,
        generate: "paper gen " + template.meta.id + " -d data.json -o out." + template.meta.format,
      },
    });
    return;
  }

  const lines: string[] = [];
  lines.push("# " + template.meta.name + "  (" + template.meta.id + ")");
  lines.push("");
  lines.push("格式：" + template.meta.format);
  lines.push("产出：" + template.meta.description);
  lines.push("适用：" + template.meta.useWhen);
  if (template.meta.tags?.length) lines.push("标签：" + template.meta.tags.join(" / "));
  lines.push("");
  lines.push("## 数据契约（data.json）");
  lines.push("");
  lines.push(renderTable([["字段", "类型", "必填", "说明"], ...schemaRows(template.schema).map((r) => [r.path, r.type, r.required, r.desc])]));
  lines.push("");
  lines.push("## 组件");
  lines.push("");
  lines.push(
    renderTable([
      ["组件 id", "必选", "作用"],
      ...components.map((c) => [c.meta.id, c.meta.optional ? "可选" : "必选", c.meta.description]),
    ]),
  );
  lines.push("");
  lines.push("## 示例数据");
  lines.push("");
  lines.push(JSON.stringify(sample, null, 2));
  lines.push("");
  lines.push("## 常用命令");
  lines.push("");
  lines.push("  paper sample " + template.meta.id + " > data.json");
  lines.push("  paper gen " + template.meta.id + " -d data.json -o out." + template.meta.format);
  emit(io, lines.join("\n"), null);
}

export async function describeCommand(argv: string[], io: IO): Promise<void> {
  runDescribe(parseArgs(argv), io);
}
