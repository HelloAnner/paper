/**
 * 模板：产品需求文档 · HTML（prd-html）
 *
 * 复刻"设计过的 PRD 文档"版式：页眉条 → 标题区 → 阅读目录 → h2/h3/h4 + 正文
 * → 表格（含状态圆标、表内列表、分组）→ 内联 SVG 图 → 落款。
 *
 * 文档顺序怎么保证：
 *   blocks[] 是一个有序数组，模板按顺序遍历；每个块交给"负责这类块"的组件，
 *   通过 ctx.renderBlock(组件 id, 块) 调用。这样既保证版面顺序，又让
 *   --component 能只出某几类块（例如只出表格）。
 */

import { defineTemplate } from "../../core/types";
import { readAsset } from "../../core/fsx";
import { PRD_CSS } from "./style";
import masthead from "./components/masthead/component";
import title from "./components/title/component";
import toc from "./components/toc/component";
import prose from "./components/prose/component";
import tables from "./components/tables/component";
import figures from "./components/figures/component";
import footer from "./components/footer/component";

/** 样例用的小示意图：直接内联，保证 paper sample 产出的数据自带图。 */
const SAMPLE_FIGURE_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1000\" height=\"260\" viewBox=\"0 0 1000 260\" role=\"img\"><rect width=\"1000\" height=\"260\" fill=\"white\"/><style>text{font-family:\"PingFang SC\",\"Noto Sans SC\",sans-serif}</style><text x=\"36\" y=\"38\" font-size=\"12\" fill=\"#65726d\">图 01 / 示例数据</text><text x=\"36\" y=\"76\" font-size=\"24\" fill=\"#1e2d29\" font-weight=\"650\">三端链路：填报 → 问数 → 办理</text><line x1=\"36\" y1=\"98\" x2=\"964\" y2=\"98\" stroke=\"#d9e1dc\" stroke-width=\"1.5\"/><rect x=\"36\" y=\"128\" width=\"260\" height=\"72\" rx=\"6\" fill=\"#f6f8f5\" stroke=\"#d9e1dc\"/><text x=\"56\" y=\"158\" font-size=\"15\" fill=\"#1e2d29\" font-weight=\"600\">填报</text><text x=\"56\" y=\"182\" font-size=\"12\" fill=\"#65726d\">探测表单结构，按字段类型写入</text><rect x=\"370\" y=\"128\" width=\"260\" height=\"72\" rx=\"6\" fill=\"#f6f8f5\" stroke=\"#d9e1dc\"/><text x=\"390\" y=\"158\" font-size=\"15\" fill=\"#1e2d29\" font-weight=\"600\">问数</text><text x=\"390\" y=\"182\" font-size=\"12\" fill=\"#65726d\">自然语言转查询条件，返回明细</text><rect x=\"704\" y=\"128\" width=\"260\" height=\"72\" rx=\"6\" fill=\"#eef4ef\" stroke=\"#247356\"/><text x=\"724\" y=\"158\" font-size=\"15\" fill=\"#247356\" font-weight=\"600\">办理</text><text x=\"724\" y=\"182\" font-size=\"12\" fill=\"#65726d\">按流程串联多个原子工具</text><line x1=\"300\" y1=\"164\" x2=\"362\" y2=\"164\" stroke=\"#7b8e83\" stroke-width=\"1.3\"/><path d=\"M362,164 L354,160 L354,168 Z\" fill=\"#7b8e83\"/><line x1=\"634\" y1=\"164\" x2=\"696\" y2=\"164\" stroke=\"#7b8e83\" stroke-width=\"1.3\"/><path d=\"M696,164 L688,160 L688,168 Z\" fill=\"#7b8e83\"/><text x=\"36\" y=\"238\" font-size=\"12\" fill=\"#65726d\">每个环节都可以单独使用，也可以在同一次对话里连续完成。</text></svg>";

/** 块类型 -> 负责渲染它的组件 id */
export const BLOCK_OWNER: Record<string, string> = {
  h2: "prose",
  h3: "prose",
  h4: "prose",
  p: "prose",
  list: "prose",
  quote: "prose",
  table: "tables",
  figure: "figures",
};

const VARIANTS = [
  "plain",
  "capability-table",
  "field-support-table",
  "goals-table",
  "acceptance-table",
  "acceptance-tools-table",
  "acceptance-fields-table",
  "acceptance-skill-table",
  "acceptance-index-table",
];

export default defineTemplate({
  meta: {
    id: "prd-html",
    name: "产品需求文档（HTML）",
    format: "html",
    description: "单文件 HTML 需求文档：页眉条 + 标题区 + 阅读目录 + 多级标题 + 数据表（含状态矩阵）+ 内联 SVG 图，可直接分享或浏览器打印成 A4",
    useWhen: "要交付一份能被评审、能打印、能直接发链接的完整 PRD / 技术方案；内容包含多级章节、大量表格与示意图，需要稳定统一的排版",
    tags: ["PRD", "需求文档", "HTML", "评审"],
  },

  schema: {
    masthead: { type: "string", desc: "顶部页眉条左侧文字，例如「悟帆 / 产品需求文档」", example: "悟帆 / 产品需求文档" },
    mastheadRight: { type: "string", desc: "页眉条右侧文字（可选），例如版本或密级", example: "V1.0 · 评审稿" },
    title: { type: "string", required: true, desc: "文档主标题", example: "悟帆 × 简道云能力套件升级" },
    tagline: { type: "string", desc: "主标题下方的绿色一句话主张（24px）", example: "让 AI 员工走进业务现场" },
    meta: { type: "string", desc: "标题区最下方的灰色元信息：文档类型 · 版本 · 评审状态 · 关联事项 · 作者", example: "产品需求文档 · V1.0 · 方案评审稿 · 关联事项 m-7097382752 · 产品研发：夏天" },
    tocLabel: { type: "string", desc: "阅读目录的标题；不填则不出目录", example: "阅读目录" },
    toc: { type: "string[]", desc: "手写目录条目（按 h2 文本匹配锚点）；不填则自动收集全部 h2", example: ["背景", "一、看现状"] },
    tocStyle: { type: "enum", values: ["auto", "inline", "list"], desc: "目录排布：inline 行内链接（短标题，原设计）；list 两列编号（长标题）；auto 按标题长度自动选（缺省）", example: "auto" },
    footer: { type: "string", desc: "文档底部落款文字", example: "悟帆 · 产品需求文档" },
    blocks: {
      type: "array",
      required: true,
      desc: "正文块数组，顺序即版面顺序。每个块必须有 type；表格用 head+rows，图用 src 指向 svg",
      items: {
        type: "object",
        desc: "一个内容块",
        fields: {
          type: { type: "enum", values: ["h2", "h3", "h4", "p", "list", "quote", "table", "figure"], required: true, desc: "块类型" },
          text: { type: "string", desc: "h2/h3/h4/p/quote 的文字。行内支持 **粗体**、单反引号代码、==绿色强调==", example: "1.1 客户场景：具体卡在哪一步" },
          items: { type: "string[]", desc: "list 的条目（ordered 为 true 时是有序列表）", example: ["第一条", "第二条"] },
          ordered: { type: "boolean", desc: "list 是否有序，缺省无序", example: true },
          head: { type: "string[]", desc: "table 表头", example: ["核心判断", "事实与局限"] },
          rows: { type: "array", desc: "table 数据行。单元格可以是字符串、状态对象 {status,text}，或块数组 [{type:'p'|'list'|'group'}]", example: [["对齐问题", "用户已让 AI 员工值守业务"]] },
          variant: { type: "enum", values: VARIANTS, desc: "table 版式（决定列宽与细节），缺省 plain", example: "field-support-table" },
          widths: { type: "array", desc: "table 列宽百分比数组，覆盖 variant 的默认列宽", example: [21, 79] },
          src: { type: "string", desc: "figure 的 svg 文件路径，相对 data.json 所在目录", example: "figures/01-usage.svg" },
          svg: { type: "string", desc: "figure 的 SVG 源码（与 src 二选一；样例数据和临时图用它，不需要额外文件）" },
          caption: { type: "string", desc: "figure 右下角图注", example: "PNG 画幅 · SVG 源图" },
          id: { type: "string", desc: "可选：自定义锚点 id（缺省按块序号生成 section-N）" },
        },
      },
    },
  },

  components: [masthead, title, toc, prose, tables, figures, footer],

  sample: {
    masthead: "悟帆 / 产品需求文档",
    mastheadRight: "V1.0 · 评审稿",
    title: "悟帆 × 简道云能力套件升级",
    tagline: "让 AI 员工走进业务现场",
    meta: "产品需求文档 · V1.0 · 方案评审稿 · 关联事项 m-7097382752 · 产品研发：夏天",
    tocLabel: "阅读目录",
    footer: "悟帆 · 产品需求文档",
    blocks: [
      { type: "h2", text: "背景" },
      {
        type: "p",
        text: "悟帆集成简道云要解决的核心命题很清楚：**让 AI 员工进入客户已经在运行的业务，真正执行业务动作。** 简道云承载应用、数据和流程，悟帆让 AI 员工在这些业务现场里查信息、做判断、办理业务。",
      },
      {
        type: "p",
        text: "当前已上线的能力以 CLI 支撑填报、以原生 MCP 提供问数。==个人查询与部分填报可用==，但客户还需要预审回写、跨表分析、多人办理和业务自动化。",
      },
      { type: "h3", text: "1.1 客户场景：具体卡在哪一步" },
      {
        type: "table",
        head: ["核心判断", "事实与局限"],
        rows: [
          [
            "**入口仍偏个人工具**",
            [
              { type: "p", text: "用户已经在生产环境里让 AI 员工值守业务，但套件呈现的主要用法仍是「我来问数、我来填报」。" },
              { type: "list", ordered: true, items: ["从自己办一件事，到让 AI 员工长期负责一类业务，缺少认知衔接", "构建依赖用户经验，运行质量因场景而异"] },
            ],
          ],
          [
            "**能力上限与套件范围不一致**",
            [
              {
                type: "group",
                title: "平台与开放能力",
                blocks: [{ type: "list", ordered: false, items: ["开放 API 可查明细、新建或修改记录", "结合悟帆工具可组装出复杂办理流程"] },
                ],
              },
              {
                type: "group",
                title: "套件直接支持",
                blocks: [{ type: "p", text: "只覆盖个人查询与部分填报，跨表分析需要用户自己拼装。" }],
              },
            ],
          ],
        ],
      },
      { type: "h3", text: "1.2 字段支持矩阵" },
      {
        type: "table",
        variant: "field-support-table",
        head: ["字段类型", "个人模式", "企业授权模式", "处理规则"],
        rows: [
          ["单行文本", { status: "yes", text: "支持" }, { status: "yes", text: "支持" }, "写入字符串。"],
          ["数字", { status: "yes", text: "支持" }, { status: "yes", text: "支持" }, "写入真实数值，例如 `1200.5`；不传带单位或千分位的展示文本。"],
          ["附件", { status: "no", text: "不支持" }, { status: "yes", text: "支持" }, "先上传拿到文件编号，再写入记录。"],
          ["公式字段", { status: "na", text: "只读" }, { status: "na", text: "只读" }, "由表单计算，写入时忽略。"],
        ],
      },
      { type: "quote", text: "字段类型的写入规则以表单实际配置为准：先读结构，再写数据，不要凭字段名猜类型。" },
      { type: "h3", text: "1.3 三端链路示意" },
      { type: "figure", caption: "PNG 画幅 · SVG 源图", svg: SAMPLE_FIGURE_SVG },
      { type: "h2", text: "四、详细设计" },
      { type: "h4", text: "4.1.1 业务应用面板与三个功能入口" },
      { type: "list", ordered: true, items: ["填报：基于表单结构探测生成可填字段", "问数：自然语言转查询条件并返回明细", "办理：按业务流程串联多个原子工具"] },
    ],
  },

  async render(ctx) {
    const data = ctx.data;
    const blocks: Record<string, any>[] = Array.isArray(data.blocks) ? data.blocks : [];
    const parts: string[] = [];

    /** 取出一个"整块"组件的结果；未选中时 use() 已返回空数组。 */
    const part = (id: string): string[] => (ctx.has(id) ? (ctx.use(id) as string[]) : []);

    parts.push(...part("masthead"));
    parts.push(...part("title"));
    parts.push(...part("toc"));

    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index] as Record<string, any>;
      const type = String(block.type ?? "");
      const owner = BLOCK_OWNER[type];
      if (!owner) {
        ctx.log("未知块类型 " + type + "（第 " + (index + 1) + " 块），已跳过");
        continue;
      }
      const html = await ctx.renderBlock(owner, { ...block, __index: index });
      if (html) parts.push(String(html));
    }

    parts.push(...part("footer"));

    const titleText = String(data.title ?? "文档");
    const html = [
      "<!doctype html>",
      "<html lang=\"zh-CN\">",
      "<head>",
      "<meta charset=\"utf-8\">",
      "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">",
      "<title>" + ctx.html.raw(ctx.html.inline(titleText)) + "</title>",
      "<style>",
      PRD_CSS,
      "</style>",
      "</head>",
      "<body>",
      "<article>",
      parts.filter(Boolean).join("\n"),
      "</article>",
      "</body>",
      "</html>",
      "",
    ].join("\n");

    return { kind: "html", html };
  },
});
