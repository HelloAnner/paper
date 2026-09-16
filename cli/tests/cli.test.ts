/**
 * 冒烟测试：
 *   1. CLI 命令返回结构正确（list / describe / sample / doctor）
 *   2. 每个模板用自带 sample 跑一遍渲染，产出文件头正确
 * 风格：只测"对 AI 有用的契约"，不测具体排版像素。
 */

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { allTemplates } from "../src/core/registry";
import { renderTemplate } from "../src/core/run";
import { materialize, defaultExt } from "../src/core/artifact";
import { sampleFromSchema, validateData } from "../src/core/schema";
import { parseInline, plainText } from "../src/core/richtext";

const CLI = join(import.meta.dir, "..", "src", "cli.ts");

function runCli(args: string[]): { code: number; stdout: string; stderr: string } {
  const result = Bun.spawnSync(["bun", "run", CLI, ...args], { stdout: "pipe", stderr: "pipe" });
  return { code: result.exitCode ?? 1, stdout: result.stdout.toString(), stderr: result.stderr.toString() };
}

describe("cli 契约", () => {
  test("list --json 输出全部模板及其场景", () => {
    const { code, stdout } = runCli(["list", "--json"]);
    expect(code).toBe(0);
    const payload = JSON.parse(stdout) as { templates: { id: string; format: string; useWhen: string }[] };
    expect(payload.templates.length).toBe(allTemplates().length);
    for (const template of payload.templates) {
      expect(template.id.length).toBeGreaterThan(0);
      expect(template.useWhen.length).toBeGreaterThan(0);
      expect(["docx", "pdf", "html"]).toContain(template.format);
    }
  });

  test("list <id> --json 输出组件清单", () => {
    const { code, stdout } = runCli(["list", "weekly-report", "--json"]);
    expect(code).toBe(0);
    const payload = JSON.parse(stdout) as { components: { id: string }[] };
    expect(payload.components.map((c) => c.id)).toContain("summary");
  });

  test("describe --json 带 schema 与 sample", () => {
    const { code, stdout } = runCli(["describe", "analysis-report", "--json"]);
    expect(code).toBe(0);
    const payload = JSON.parse(stdout) as { schema: Record<string, unknown>; sample: Record<string, unknown> };
    expect(Object.keys(payload.schema).length).toBeGreaterThan(3);
    expect(Object.keys(payload.sample).length).toBeGreaterThan(3);
  });

  test("gen 缺数据文件时报错且退出码为 1", () => {
    const { code, stdout } = runCli(["gen", "weekly-report", "--json"]);
    expect(code).toBe(1);
    const payload = JSON.parse(stdout) as { ok: boolean };
    expect(payload.ok).toBe(false);
  });

  test("未知子命令退出码为 1", () => {
    const { code } = runCli(["nope"]);
    expect(code).toBe(1);
  });

  test("doctor --json 全绿", () => {
    const { code, stdout } = runCli(["doctor", "--json"]);
    const payload = JSON.parse(stdout) as { checks: { name: string; status: string; detail: string }[] };
    const failed = payload.checks.filter((c) => c.status === "fail");
    expect(failed.map((c) => c.name + ": " + c.detail).join(", ")).toBe("");
    expect(code).toBe(0);
  });
});

describe("prd-html 文档模型", () => {
  const template = () => allTemplates().find((t) => t.meta.id === "prd-html")!;

  async function renderHtml(data: Record<string, unknown>): Promise<string> {
    const { artifact } = await renderTemplate({ template: template(), data });
    const { data: bytes } = await materialize(artifact);
    return Buffer.from(bytes).toString("utf8");
  }

  test("样例渲染出目录锚点、状态标、表版式与内联 SVG", async () => {
    const html = await renderHtml(template().sample as Record<string, unknown>);
    expect(html).toContain('<nav class="reading-toc"');
    expect(html).toContain('<a href="#section-');
    expect(html).toContain('<h2 id="section-');
    expect(html).toContain('class="field-support-table"');
    expect(html).toContain("support-status support-yes");
    expect(html).toContain("support-status support-no");
    expect(html).toContain('class="cell-group"');
    expect(html).toContain("<figure>");
    expect(html).toContain("<svg");
    expect(html).toContain('class="can-do"');
    expect(html).toContain("<strong>");
    expect(html).toContain("<code>");
  });

  test("未选中组件不出现在产物里（-c prose 时没有表格和图）", async () => {
    const data = template().sample as Record<string, unknown>;
    const { artifact } = await renderTemplate({ template: template(), data, components: ["prose"] });
    const { data: bytes } = await materialize(artifact);
    const html = Buffer.from(bytes).toString("utf8");
    expect(html).toContain("<h2 id=");
    expect(html).not.toContain("<table");
    expect(html).not.toContain("<figure");
    expect(html).not.toContain('<nav class="reading-toc"');
  });

  test("缺少必填字段 title 时报错", () => {
    const { errors } = validateData(template().schema, { blocks: [] });
    expect(errors.some((issue) => issue.path === "title")).toBe(true);
  });

  test("长标题的目录自动切到两列编号（is-list），短标题保持行内", async () => {
    const long = await renderHtml({
      title: "T",
      tocLabel: "阅读目录",
      tocStyle: "auto",
      blocks: [
        { type: "h2", text: "架构与工程：为什么 552B 能打得过 1.6T" },
        { type: "p", text: "x" },
      ],
    });
    expect(long).toContain('class="reading-toc is-list"');
    expect(long).toContain("counter(toc");

    const short = await renderHtml({
      title: "T",
      tocLabel: "阅读目录",
      blocks: [{ type: "h2", text: "背景" }],
    });
    expect(short).toContain('<nav class="reading-toc"');
    expect(short).not.toContain('class="reading-toc is-list"');

    const forced = await renderHtml({
      title: "T",
      tocLabel: "阅读目录",
      tocStyle: "inline",
      blocks: [{ type: "h2", text: "架构与工程：为什么 552B 能打得过 1.6T" }],
    });
    expect(forced).not.toContain('class="reading-toc is-list"');
  });

  test("未知块类型不会让渲染失败，只是被跳过", async () => {
    const html = await renderHtml({ title: "T", blocks: [{ type: "wat", text: "x" }, { type: "p", text: "活着" }] });
    expect(html).toContain("活着");
  });
});

describe("内联富文本", () => {
  test("嵌套标记：加粗里套绿色强调", () => {
    const runs = parseInline("**结论：==数字== 要突出**");
    expect(runs.map((run) => [run.text, run.bold ? "b" : "", run.accent ? "a" : ""].join(":"))).toEqual([
      "结论：:b:",
      "数字:b:a",
      " 要突出:b:",
    ]);
  });

  test("未配对的标记按普通字符保留", () => {
    const tick = String.fromCharCode(96);
    const text = "单个 * 与 " + tick + " 反引号";
    expect(plainText(text)).toBe(text);
  });
});

describe("模板渲染", () => {
  for (const template of allTemplates()) {
    test(template.meta.id + " 用示例数据能产出 " + template.meta.format, async () => {
      const sample = template.sample ?? sampleFromSchema(template.schema);
      const { errors } = validateData(template.schema, sample);
      expect(errors).toEqual([]);

      const { artifact, selected } = await renderTemplate({ template, data: sample });
      expect(selected.length).toBeGreaterThan(0);
      const { data, ext } = await materialize(artifact);
      expect(data.byteLength).toBeGreaterThan(1000);
      expect(ext).toBe(defaultExt(template));

      const head = Buffer.from(data.slice(0, 4)).toString("latin1");
      if (ext === "docx") expect(head.startsWith("PK")).toBe(true);
      if (ext === "pdf") expect(head.startsWith("%PDF")).toBe(true);
      if (ext === "html") expect(Buffer.from(data).toString("utf8")).toContain("<!doctype html>");
    });
  }

  test("gen 端到端写文件", async () => {
    const dir = await mkdtemp(join(tmpdir(), "paper-test-"));
    try {
      const template = allTemplates()[0];
      if (!template) return;
      const dataPath = join(dir, "data.json");
      const outPath = join(dir, "out." + defaultExt(template));
      await writeFile(dataPath, JSON.stringify(template.sample ?? sampleFromSchema(template.schema)), "utf8");
      const { code, stdout } = runCli(["gen", template.meta.id, "-d", dataPath, "-o", outPath, "--json"]);
      expect(code).toBe(0);
      const payload = JSON.parse(stdout) as { ok: boolean; out: string; components: string[] };
      expect(payload.ok).toBe(true);
      expect(payload.components.length).toBeGreaterThan(0);
      const file = Bun.file(outPath);
      expect(await file.exists()).toBe(true);
      expect(file.size).toBeGreaterThan(1000);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
