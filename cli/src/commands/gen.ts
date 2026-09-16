/**
 * paper gen <模板 id> -d data.json [-o out.docx] [--component id]... [--set k=v]
 */

import { existsSync } from "node:fs";
import { COMMON_ALIASES, flagBool, flagList, flagStr, parseArgs, type ParsedArgs } from "../core/args";
import { dataError, usage } from "../core/errors";
import { defaultExt, materialize } from "../core/artifact";
import { emit, fail, hint, ok, step, warn, type IO } from "../core/output";
import { requireTemplate } from "../core/registry";
import { validateData } from "../core/schema";
import { renderTemplate } from "../core/run";
import { readJson, writeBytes } from "../core/fsx";
import { resolve } from "node:path";

export const genUsage =
  "paper gen <模板 id> -d data.json [-o out.docx] [--component <组件 id>]... [--set k=v] [--open] [--json]";

function parseParams(args: ParsedArgs): Record<string, string> {
  const params: Record<string, string> = {};
  for (const item of flagList(args, "--set")) {
    const eq = item.indexOf("=");
    if (eq < 0) throw usage("--set 需要 k=v 形式，收到：" + item);
    params[item.slice(0, eq)] = item.slice(eq + 1);
  }
  return params;
}

export async function genCommand(argv: string[], io: IO): Promise<void> {
  const args = parseArgs(argv, COMMON_ALIASES);
  const id = args.positionals[1];
  if (!id) throw usage("缺少模板 id", "用法：" + genUsage);
  const dataPath = flagStr(args, "--data");
  if (!dataPath) throw usage("缺少 -d/--data 数据文件", "先用 paper sample " + id + " > data.json 生成一份");
  if (!existsSync(dataPath)) throw dataError("数据文件不存在：" + dataPath);

  const template = requireTemplate(id);
  const raw = await readJson(dataPath);
  const { errors, warnings } = validateData(template.schema, raw);

  for (const warning of warnings) warn(io, "字段 " + warning.path + "：" + warning.message);
  if (errors.length > 0) {
    for (const error of errors) fail(io, "数据校验失败 " + error.path + "：" + error.message);
    throw dataError("共 " + errors.length + " 处数据问题", "参考 paper describe " + id + " 的字段说明，或 paper sample " + id + " 重新生成示例");
  }

  const components = flagList(args, "--component");
  const data = raw as Record<string, any>;

  step(io, "渲染 " + template.meta.name + "（" + template.meta.format + "）");
  const { artifact, selected } = await renderTemplate({
    template,
    data,
    components,
    params: parseParams(args),
    assetDir: resolve(dataPath, ".."),
  });

  const outArg = flagStr(args, "--out") ?? (id + "." + defaultExt(template));
  const materialized = await materialize(artifact);
  const outPath = await writeBytes(outArg, materialized.data);
  const sizeKb = Math.max(1, Math.round(materialized.data.byteLength / 1024));

  ok(io, "已生成 " + outPath + "（" + sizeKb + " KB）");

  const payload = {
    ok: true,
    template: template.meta.id,
    format: template.meta.format,
    out: outPath,
    bytes: materialized.data.byteLength,
    components: selected,
    dataFile: resolve(dataPath),
  };

  if (io.json) {
    emit(io, "", payload);
  } else {
    if (selected.length > 0) {
      emit(io, "  组件：" + selected.join(" → "), null);
    }
    if (warnings.length > 0) hint(io, "有 " + warnings.length + " 个字段未在 schema 中，已忽略");
  }

  if (flagBool(args, "--open") && process.platform === "darwin") {
    Bun.spawn(["open", outPath], { stdout: "ignore", stderr: "ignore" });
  }
}
