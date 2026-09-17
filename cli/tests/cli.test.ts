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
import { planBlocks, tableCaption, figureCaption } from "../src/templates/progress-docx/blocks";

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
    const { code, stdout } = runCli(["list", "prd-html", "--json"]);
    expect(code).toBe(0);
    const payload = JSON.parse(stdout) as { components: { id: string }[] };
    expect(payload.components.map((c) => c.id)).toContain("tables");
  });

  test("describe --json 带 schema 与 sample", () => {
    const { code, stdout } = runCli(["describe", "prd-html", "--json"]);
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

describe("analysis-html 报告模型", () => {
  const template = () => allTemplates().find((t) => t.meta.id === "analysis-html")!;

  async function renderHtml(data: Record<string, unknown>, components?: string[]): Promise<string> {
    const { artifact } = await renderTemplate({ template: template(), data, components });
    const { data: bytes } = await materialize(artifact);
    return Buffer.from(bytes).toString("utf8");
  }

  const sample = () => template().sample as Record<string, unknown>;

  test("样例渲染出导航、分节头、指标卡与热力格", async () => {
    const html = await renderHtml(sample());
    expect(html).toContain("<!doctype html>");
    expect(html).toContain('<nav><div class="inner">');
    expect(html).toContain('href="#overview"');
    expect(html).toContain('class="hero-verdict"');
    expect(html).toContain('<section class="section" id="overview">');
    expect(html).toContain('<div class="section-head">');
    expect(html).toContain("<h2>巡检全景</h2>");
    expect(html).toContain('class="side-note"');
    expect(html).toContain('class="card metric blue"');
    expect(html).toContain('class="card metric red"');
    expect(html).toContain('class="flow-connector"');
    expect(html).toContain('class="bar-row"');
    expect(html).toContain('class="blocker-row"');
    expect(html).toContain('class="heat-cell heat-4"');
    expect(html).toContain('class="heat-cell heat-label"');
    expect(html).toContain('class="scene-family-grid"');
    expect(html).toContain('class="stacked-bar"');
  });

  test("v2 独立块：panel / banner / proofs / steps / donut / stats / note", async () => {
    const html = await renderHtml(sample());
    expect(html).toContain('<div class="chart-panel">');
    expect(html).toContain('class="chart-subtitle"');
    expect(html).toContain('<div class="attribution-grid">');
    expect(html).toContain('<div class="attribution-panel">');
    expect(html).toContain('<div class="step">');
    expect(html).toContain('<div class="attribution-kpis">');
    expect(html).toContain('<div class="truth-banner"><div class="mark">!</div>');
    expect(html).toContain('<div class="proof-grid">');
    expect(html).toContain('class="proof-card amber"');
    expect(html).toContain('class="proof-value">184<small>次</small>');
    expect(html).toContain('<div class="roadmap">');
    expect(html).toContain('class="roadmap-step"');
    expect(html).toContain('<div class="distribution-line"');
    expect(html).toContain('class="donut"');
    expect(html).toContain("conic-gradient(var(--blue) 0% 22.3%");
    expect(html).toContain('class="concentration-copy"');
    expect(html).toContain('<div class="evidence-note"><strong>');
    expect(html).toContain('<div class="card green"><div class="metric label">最容易形成结果</div>');
    expect(html).toContain('<div class="scene-family-kicker">业务领域 01</div>');
    expect(html).toContain('<div class="insight-grid">');
    expect(html).toContain('<div class="insight-card"><div class="signal">综合共创</div><h3>一号车间点检班</h3>');
    expect(html).toContain('<div class="priority-grid">');
    expect(html).toContain('class="priority-card p0"><div class="rank">第一优先 · 受阻最多</div><h3>关联设备</h3>');
    expect(html).toContain('class="priority-card p1"');
    expect(html).toContain('class="priority-card p2"');

    // panel 的 items 形式：即使只有一张卡，容器也必须是 .attribution-grid
    const single = await renderHtml({
      title: "T",
      sections: [{ id: "p", title: "P", blocks: [{ type: "panel", variant: "attribution", items: [{ step: "S", title: "T", text: "x" }] }] }],
    });
    expect(single).toContain('<div class="attribution-grid"><div class="attribution-panel">');
  });

  test("callout 三种卡片样式：card / insight / priority", async () => {
    const html = await renderHtml({
      title: "T",
      sections: [
        {
          id: "cards",
          title: "卡片",
          blocks: [
            { type: "callout", tone: "green", kicker: "口径", title: "单张卡片", text: "x" },
            { type: "callout", variant: "insight", kicker: "综合共创", title: "白卡", text: "y" },
            { type: "callout", variant: "priority", tone: "red", kicker: "第一优先", title: "优先级卡", text: "z" },
            { type: "callout", variant: "insight", items: [{ kicker: "A", title: "B", text: "C" }] },
            { type: "callout", variant: "priority", items: [{ tone: "amber", kicker: "D", title: "E", text: "F" }] },
          ],
        },
      ],
    });
    expect(html).toContain('<div class="card green"><div class="metric label">口径</div><div class="chart-title">单张卡片</div>');
    expect(html).toContain('<div class="insight-card"><div class="signal">综合共创</div><h3>白卡</h3><p>y</p></div>');
    expect(html).toContain('<div class="priority-card p0"><div class="rank">第一优先</div><h3>优先级卡</h3><p>z</p></div>');
    expect(html).toContain('<div class="insight-grid"><div class="insight-card">');
    expect(html).toContain('<div class="priority-grid"><div class="priority-card p1">');
  });

  test("明细表三种单元格写法与折叠说明", async () => {
    const html = await renderHtml(sample());
    expect(html).toContain('<div class="table-wrap">');
    expect(html).toContain("<caption>");
    expect(html).toContain('<td class="tenant-name">一号车间点检班<code>…4c9a21</code></td>');
    expect(html).toContain('<td class="num-cell">412</td>');
    expect(html).toContain('<td class="num-cell">268<span class="mini-bar"><i style="width:100%"></i></span></td>');
    expect(html).toContain('<span class="field-tag">照片 8</span>');
    expect(html).toContain('<span class="field-tag none">无</span>');
    expect(html).toContain("<details open>");
    expect(html).toContain('<div class="detail-body">');
  });

  test("-c 只选部分组件时，其它块族不出现", async () => {
    const proseOnly = await renderHtml(sample(), ["prose"]);
    expect(proseOnly).toContain("<h3>");
    expect(proseOnly).toContain('class="sub-label blue"');
    expect(proseOnly).toContain('class="truth-banner"');
    expect(proseOnly).toContain('class="callout"');
    expect(proseOnly).not.toContain("<nav");
    expect(proseOnly).not.toContain("<table");
    expect(proseOnly).not.toContain('class="card metric');
    expect(proseOnly).not.toContain('class="chart-panel"');
    expect(proseOnly).not.toContain('class="donut"');
    expect(proseOnly).not.toContain('class="proof-grid"');

    const chartsOnly = await renderHtml(sample(), ["charts"]);
    expect(chartsOnly).toContain('class="chart-panel"');
    expect(chartsOnly).toContain('class="bar-row"');
    expect(chartsOnly).toContain('class="heat-cell heat-0"');
    expect(chartsOnly).toContain('class="donut"');
    expect(chartsOnly).toContain('<div class="attribution-grid">');
    expect(chartsOnly).not.toContain("<table");
    expect(chartsOnly).not.toContain('class="card metric');
    expect(chartsOnly).not.toContain('class="attribution-kpi');
  });

  test("静态产出不使用 reveal 类，可见性不依赖 JS", async () => {
    const html = await renderHtml(sample());
    expect(html).not.toMatch(/class="[^"]*reveal/);
    expect(html).not.toContain("<script");
  });
});

describe("progress-docx 报告模型", () => {
  const template = () => allTemplates().find((t) => t.meta.id === "progress-docx")!;

  async function renderDocx(data: Record<string, unknown>, components?: string[]): Promise<Uint8Array> {
    const { artifact } = await renderTemplate({ template: template(), data, components });
    const { data: bytes } = await materialize(artifact);
    return bytes;
  }

  // 1x1 PNG：只用来验证图片链路，不参与断言图片内容
  const TINY_PNG =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  test("标题自动编号：1 / 1.1 / 1.1.1，表图按一级章节编号", () => {
    const plan = planBlocks([
      { type: "h1", text: "阶段工作摘要" },
      { type: "p", text: "x" },
      { type: "table", caption: "成果" },
      { type: "h1", text: "背景与定位" },
      { type: "h2", text: "工程背景" },
      { type: "h3", text: "地质条件" },
      { type: "table", caption: "进度" },
      { type: "figure", caption: "分布" },
      { type: "table", caption: "风险" },
    ]);
    expect(plan.heading[0]).toBe("1  阶段工作摘要");
    expect(plan.heading[3]).toBe("2  背景与定位");
    expect(plan.heading[4]).toBe("2.1  工程背景");
    expect(plan.heading[5]).toBe("2.1.1  地质条件");
    expect(plan.table[2]).toBe("1-1");
    expect(plan.table[6]).toBe("2-1");
    expect(plan.table[8]).toBe("2-2");
    expect(plan.figure[7]).toBe("2-1");
    expect(plan.bookmark[5]).toBe("H_2_1_1");
    expect(plan.toc.map((entry) => entry.text)).toEqual(["1  阶段工作摘要", "2  背景与定位", "2.1  工程背景", "2.1.1  地质条件"]);
  });

  test("已带编号的标题不重复加编号，numbered:false 可关闭", () => {
    const plan = planBlocks([
      { type: "h1", text: "1 阶段工作摘要" },
      { type: "h2", text: "工程背景", numbered: false },
    ]);
    expect(plan.heading[0]).toBe("1 阶段工作摘要");
    expect(plan.heading[1]).toBe("工程背景");
  });

  test("题注自动加「表 N-M / 图 N-M」，数据自带编号时不重复", () => {
    expect(tableCaption({ caption: "阶段成果" }, "1-1")).toBe("表 1-1  阶段成果");
    expect(figureCaption({ caption: "航线分布" }, "2-1")).toBe("图 2-1  航线分布");
    expect(tableCaption({ caption: "表 3-2 自定义" }, "1-1")).toBe("表 3-2 自定义");
  });

  test("样例产出 docx；-c 只选 prose 时不出表格和图", async () => {
    const sample = template().sample as Record<string, unknown>;
    const full = await renderDocx(sample);
    expect(Buffer.from(full.slice(0, 2)).toString("latin1")).toBe("PK");
    expect(full.byteLength).toBeGreaterThan(5000);

    const { selected } = await renderTemplate({ template: template(), data: sample, components: ["prose"] });
    expect(selected).toEqual(["prose"]);
  });

  test("内联 PNG 与图片文件都能出图，图片会使产物体积变大", async () => {
    const base = {
      cover: { title: "T", fields: [["依托工程", "X"]] },
      blocks: [
        { type: "h1", text: "图表示例" },
        { type: "p", text: "正文" },
      ],
    };
    const without = await renderDocx(base);
    const withFigure = await renderDocx({
      ...base,
      blocks: [...base.blocks, { type: "figure", png: TINY_PNG, caption: "内联图" }],
    });
    expect(withFigure.byteLength).toBeGreaterThan(without.byteLength);
  });

  test("缺少必填的 cover.title 会被 schema 拦下", () => {
    const { errors } = validateData(template().schema, { cover: { subtitle: "x" }, blocks: [] });
    expect(errors.some((issue) => issue.path === "cover.title")).toBe(true);
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
