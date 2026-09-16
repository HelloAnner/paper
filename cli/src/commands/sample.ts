/**
 * paper sample <模板 id> [-o data.json]
 * 输出可直接编辑的示例数据；默认打到 stdout 方便 AI 直接读。
 */

import { COMMON_ALIASES, flagStr, parseArgs } from "../core/args";
import { emit, ok, type IO } from "../core/output";
import { requireTemplate } from "../core/registry";
import { sampleFromSchema } from "../core/schema";
import { usage } from "../core/errors";
import { writeText } from "../core/fsx";

export const sampleUsage = "paper sample <模板 id> [-o data.json]";

export async function sampleCommand(argv: string[], io: IO): Promise<void> {
  const args = parseArgs(argv, COMMON_ALIASES);
  const id = args.positionals[1];
  if (!id) throw usage("缺少模板 id", "用法：" + sampleUsage);
  const template = requireTemplate(id);
  const sample = template.sample ?? sampleFromSchema(template.schema);
  const json = JSON.stringify(sample, null, 2) + "\n";
  const out = flagStr(args, "--out");
  if (out) {
    const path = await writeText(out, json);
    ok(io, "示例数据已写入 " + path);
    emit(io, path, { out: path, template: template.meta.id });
    return;
  }
  if (io.json) {
    emit(io, "", { template: template.meta.id, sample });
    return;
  }
  process.stdout.write(json);
}
