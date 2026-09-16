/**
 * paper doctor：环境自检。
 * 逐项检查 bun / 模板完整性 / 字体 / pdf 链路 / 安装状态。
 */

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { flagBool, parseArgs } from "../core/args";
import { emit, fail, ok, renderTable, warn, type IO } from "../core/output";
import { allTemplates, sortedComponents } from "../core/registry";
import { sampleFromSchema, validateData } from "../core/schema";
import { createPdf, subsetFontsForTexts } from "../core/pdf-kit";
import { fontSearchDirs, resolveFonts } from "../core/fonts";

interface Check {
  name: string;
  status: "ok" | "warn" | "fail";
  detail: string;
}

export async function doctorCommand(argv: string[], io: IO): Promise<void> {
  const args = parseArgs(argv);
  const checks: Check[] = [];

  const push = (name: string, status: Check["status"], detail: string): void => {
    checks.push({ name, status, detail });
  };

  push("bun", "ok", "v" + (Bun.version ?? "unknown"));

  const templates = allTemplates();
  if (templates.length === 0) {
    push("模板", "fail", "src/templates 下没有可用模板");
  } else {
    push("模板", "ok", templates.length + " 个：" + templates.map((t) => t.meta.id).join(", "));
  }

  // 每个模板：组件数 + 示例数据是否通过自己的 schema
  for (const template of templates) {
    const components = sortedComponents(template);
    const ids = components.map((c) => c.meta.id);
    const duplicated = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicated.length > 0) {
      push("模板 " + template.meta.id, "fail", "组件 id 重复：" + duplicated.join(", "));
    }
    const sample = template.sample ?? sampleFromSchema(template.schema);
    const { errors } = validateData(template.schema, sample);
    if (errors.length > 0) {
      push("模板 " + template.meta.id, "warn", "示例数据不符合 schema：" + errors.map((e) => e.path).join(", "));
    } else {
      push("模板 " + template.meta.id, "ok", template.meta.format + " / " + components.length + " 组件");
    }
  }

  // 字体
  try {
    const fonts = resolveFonts();
    push(
      "字体",
      fonts.fallback ? "warn" : "ok",
      fonts.regular + (fonts.fallback ? "（系统兜底，建议 make fonts）" : ""),
    );
  } catch (e) {
    push("字体", "fail", e instanceof Error ? e.message : String(e));
  }

  // pdf 链路：真跑一次最小文档
  if (!fontSearchDirs().length) {
    push("pdf", "warn", "未找到字体目录，pdf 会走系统字体兜底");
  }
  try {
    const draw = (pdf: Awaited<ReturnType<typeof createPdf>>): void => {
      pdf.title("paper 自检");
      pdf.p("如果你能在 PDF 里看到这行中文，说明字体与排版链路正常。");
      pdf.p("子集化后这份文档应当只有几十 KB。");
    };
    // 和 paper gen 一样走两遍：先收集文本，再嵌子集字体
    const first = await createPdf({ footer: "paper doctor" });
    draw(first);
    const subsets = await subsetFontsForTexts(first.getUsedTexts());
    const pdf = subsets ? await createPdf({ footer: "paper doctor" }, subsets) : first;
    if (subsets) draw(pdf);
    const bytes = await pdf.save();
    push(
      "pdf",
      bytes.byteLength > 1000 ? "ok" : "fail",
      "最小文档 " + Math.round(bytes.byteLength / 1024) + " KB" + (subsets ? "（字体已子集化）" : "（完整字体嵌入）"),
    );
  } catch (e) {
    push("pdf", "fail", e instanceof Error ? e.message : String(e));
  }

  // 安装状态
  const skillLink = join(homedir(), ".agents", "skills", "paper");
  if (existsSync(skillLink)) {
    push("skill", "ok", skillLink + " 已就绪");
  } else {
    push("skill", "warn", "未安装：仓库根目录执行 make install");
  }

  const hasFail = checks.some((c) => c.status === "fail");
  if (io.json || flagBool(args, "--json")) {
    emit(io, "", { ok: !hasFail, checks });
    if (hasFail) process.exitCode = 1;
    return;
  }

  const icon: Record<Check["status"], string> = { ok: "✓", warn: "!", fail: "✗" };
  const rows: string[][] = [["", "项目", "结果"]];
  for (const check of checks) rows.push([icon[check.status], check.name, check.detail]);
  emit(io, renderTable(rows), null);
  emit(io, hasFail ? "自检发现问题，先修 fail 项" : "自检通过，可以开始生成文档", null);
  if (hasFail) process.exitCode = 1;
}
