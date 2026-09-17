/**
 * 模板：国企阶段性进度报告 · Word（progress-docx）
 *
 * 场景：国企 / 科研项目按阶段（月度、季度、里程碑）向上级或甲方提交的进展报告。
 * 版式从真实样板 docx 里提取固化：封面 + 自动目录 + 三级标题 + 首行缩进正文 +
 * 灰底表头数据表 + 居中图表题 + 页脚页码；字体按角色统一（宋体正文 / 黑体标题 / 楷体引文）。
 *
 * 文档顺序：cover（独占一节，无页脚）→ toc（独占一节，无页码）→ 正文（页码从 1 起）。
 * 正文顺序由 blocks[] 决定，模板逐块分发给负责它的组件。
 */

import { defineTemplate } from "../../core/types";
import { PROGRESS_DOCX_SPEC } from "./style";
import { BLOCK_OWNER } from "./blocks";
import cover from "./components/cover/component";
import toc from "./components/toc/component";
import prose from "./components/prose/component";
import tables from "./components/tables/component";
import figures from "./components/figures/component";
import signoff from "./components/signoff/component";

const BLOCK_TYPES = ["h1", "h2", "h3", "p", "list", "quote", "note", "table", "figure", "pageBreak"];

export default defineTemplate({
  meta: {
    id: "progress-docx",
    name: "国企阶段性进度报告（Word）",
    format: "docx",
    description:
      "Word 版阶段性进度报告：封面（密级/编号/要素表/编制单位）+ 自动目录 + 三级标题自动编号 + 首行缩进正文 + 灰底表头数据表 + 居中图表题 + 页脚页码",
    useWhen:
      "要向甲方、上级单位或科技管理部门提交阶段进展报告 / 中期报告 / 里程碑汇报，需要正式 Word 版式、封面、目录、统一字体与页码；内容以章节 + 段落 + 数据表为主，可插图片",
    tags: ["进度报告", "阶段报告", "国企", "Word", "docx"],
    docx: PROGRESS_DOCX_SPEC,
  },

  schema: {
    cover: {
      type: "object",
      required: true,
      desc: "封面内容。title 必填，其余按需；fields 会渲染成封面上的项目要素表",
      fields: {
        title: { type: "string", required: true, desc: "报告主标题（封面最大字号，居中）", example: "城市轨道交通区间隧道施工监测与风险管控技术研究" },
        subtitle: { type: "string", desc: "封面副标题，例如阶段名", example: "阶段进展报告" },
        classify: { type: "string", desc: "密级，显示在封面右上角；不填则不显示", example: "内部资料" },
        code: { type: "string", desc: "文档编号，显示在封面右上角（与密级同行）", example: "JZTJ-2026-08" },
        fields: {
          type: "array",
          desc: "封面项目要素表，每项是 [标签, 内容] 两个字符串；单数项最后一行右侧留空",
          example: [
            ["依托工程", "轨道交通 5 号线 XX 站—XX 站区间"],
            ["协作单位", "XX 勘察设计院、XX 监测中心"],
            ["牵头单位", "XX 建设集团有限公司"],
            ["统计截止", "2026 年 8 月 20 日"],
          ],
        },
        org: { type: "string", desc: "封面底部编制单位（黑体加粗）", example: "XX 建设集团有限公司项目组" },
        date: { type: "string", desc: "封面底部编制日期", example: "2026 年 8 月 22 日" },
      },
    },
    tocLabel: { type: "string", desc: "目录标题，缺省「目  录」；填 false 可关闭目录", example: "目  录" },
    header: { type: "string", desc: "正文页眉文字（可选，右对齐小字）", example: "阶段进展报告" },
    footer: { type: "string", desc: "页脚左侧文字；右侧自动是「第 X 页 / 共 Y 页」", example: "XX 建设集团有限公司项目组" },
    blocks: {
      type: "array",
      required: true,
      desc: "正文块数组，顺序即版面顺序；标题编号、表图编号都由模板自动计算",
      items: {
        type: "object",
        desc: "一个内容块",
        fields: {
          type: { type: "enum", values: BLOCK_TYPES, required: true, desc: "块类型" },
          text: { type: "string", desc: "h1/h2/h3/p/quote/note 的文字；行内支持 **粗体**、单反引号代码、==强调==", example: "本阶段完成无人机倾斜摄影与三维建模主体工作。" },
          items: { type: "string[]", desc: "list 的条目", example: ["完成全域影像采集", "完成模型初步生产"] },
          ordered: { type: "boolean", desc: "list 是否有序列表，缺省无序", example: true },
          numbered: { type: "boolean", desc: "标题是否关闭自动编号；缺省自动编号（1 / 1.1 / 1.1.1）", example: false },
          head: { type: "string[]", desc: "table 表头", example: ["成果维度", "已完成工作量", "阶段成果"] },
          rows: { type: "array", desc: "table 数据行，单元格是字符串或数字", example: [["原始影像", "1774 张", "按批次只读归档"]] },
          widths: { type: "array", desc: "table 相对列宽，例如 [2, 3, 3]；缺省等分", example: [2, 3, 3] },
          align: { type: "array", desc: "table 逐列对齐，取值 left / center / right；缺省表头居中、内容左对齐", example: ["left", "center", "left"] },
          zebra: { type: "boolean", desc: "table 是否隔行浅灰底纹，缺省不加（正式报告建议不加）" },
          caption: { type: "string", desc: "table 表题 / figure 图注文字；前面的「表 N-M」「图 N-M」由模板自动加", example: "阶段成果对照" },
          src: { type: "string", desc: "figure 图片路径，相对 data.json 所在目录，支持 png/jpg/gif/bmp", example: "figures/01-chart.png" },
          png: { type: "string", desc: "figure 内联 PNG 的 base64（与 src 二选一，样例数据或临时图用它）" },
          widthMm: { type: "number", desc: "figure 图片宽度（mm）；缺省撑满版心并按原比例定高" },
        },
      },
    },
    signoff: {
      type: "object",
      desc: "正文末尾落款（可选，右对齐）",
      fields: {
        text: { type: "string", desc: "落款说明文字", example: "本报告经项目组审核，数据与结论真实可追溯。" },
        org: { type: "string", desc: "编制单位", example: "XX 建设集团有限公司项目组" },
        date: { type: "string", desc: "编制日期", example: "2026 年 8 月 22 日" },
      },
    },
  },

  components: [cover, toc, prose, tables, figures, signoff],

  sample: {
    cover: {
      title: "城市轨道交通区间隧道施工监测与风险管控技术研究",
      subtitle: "阶段进展报告",
      classify: "内部资料",
      code: "JZTJ-2026-08",
      fields: [
        ["依托工程", "轨道交通 5 号线 XX 站—XX 站区间"],
        ["协作单位", "XX 勘察设计院、XX 监测中心"],
        ["牵头单位", "XX 建设集团有限公司"],
        ["统计截止", "2026 年 8 月 20 日"],
        ["研究周期", "2026 年 3 月至 2028 年 6 月"],
        ["编制日期", "2026 年 8 月 22 日"],
      ],
      org: "XX 建设集团有限公司项目组",
      date: "2026 年 8 月 22 日",
    },
    tocLabel: "目  录",
    header: "阶段进展报告",
    footer: "XX 建设集团有限公司项目组",
    blocks: [
      { type: "h1", text: "阶段工作摘要" },
      {
        type: "p",
        text: "本阶段围绕区间隧道穿越既有建构筑物段的施工监测与风险管控开展研究，完成了监测方案细化、基准网布设、自动化监测设备安装与首期数据采集，==监测数据已具备连续分析条件==。",
      },
      {
        type: "table",
        widths: [2, 3, 4],
        caption: "阶段成果对照",
        head: ["成果维度", "已完成工作量", "已形成的阶段成果"],
        rows: [
          ["监测点位", "布设 96 个", "覆盖洞内外沉降、收敛与建构筑物倾斜"],
          ["自动化设备", "安装 24 套", "静力水准仪与测斜仪完成联调并稳定回传"],
          ["数据采集", "连续 42 天", "形成首期连续监测序列，缺失率低于 1%"],
        ],
      },
      { type: "h1", text: "项目背景与阶段定位" },
      { type: "h2", text: "工程背景与科研任务" },
      {
        type: "p",
        text: "区间隧道在里程 K3+250 至 K3+480 段下穿既有住宅与市政管线，覆土厚度变化大，是本标段**风险等级最高的控制性区段**。申报书将研究任务概括为三条主线：监测指标与预警阈值、数据驱动的变形预测、施工参数动态调整。",
      },
      { type: "h2", text: "研究进度中的阶段位置" },
      {
        type: "table",
        widths: [2, 3, 3],
        caption: "阶段进度判断",
        head: ["计划阶段", "申报书安排", "本次进展判断"],
        rows: [
          ["第一阶段", "监测方案与基准网建设", "已完成，待独立复核"],
          ["第二阶段", "数据采集与预测模型开发", "已启动，完成数据采集"],
          ["第三阶段", "工程示范与成果验收", "尚未开始"],
        ],
      },
      { type: "h1", text: "本阶段完成的主要工作" },
      { type: "h2", text: "现场监测实施" },
      {
        type: "list",
        items: [
          "完成洞内外 96 个监测点的布设与初始值采集，基准点联测闭合差满足二等水准要求。",
          "完成 24 套自动化监测设备安装与联调，数据回传间隔 10 分钟。",
          "完成周边 3 处既有建构筑物的裂缝与倾斜初始调查，建立台账。",
        ],
      },
      { type: "h2", text: "数据整理与初步分析" },
      {
        type: "p",
        text: "对连续 42 天的监测序列做了缺失值与粗差剔除，形成日变化量与累计变化量两类指标。当前洞内沉降累计值均在控制值的三分之一以内，测斜曲线形态与施工工序对应关系清晰。",
      },
      { type: "quote", text: "监测数据的价值在于连续和可比：口径不清、断点过多的序列，不能作为预警依据。" },
      {
        type: "note",
        text: "注：本阶段结论仅用于方法验证，涉及施工参数调整的结论需结合第三方复核后另行报审。",
      },
      { type: "h1", text: "当前问题与下一阶段计划" },
      { type: "h2", text: "主要技术风险" },
      {
        type: "table",
        widths: [3, 4, 4],
        caption: "阶段风险与控制措施",
        head: ["问题/风险", "可能影响", "控制措施"],
        rows: [
          ["部分测点受施工干扰", "序列出现短时跳变", "加装防护罩，跳变点单独标记不参与拟合"],
          ["预测模型样本不足", "预测精度难以评估", "下一阶段补充两期扰动工况数据后再训练"],
          ["多源数据口径不一", "对比结论不一致", "统一时间基准与坐标基准，建立数据字典"],
        ],
      },
      { type: "h2", text: "下一阶段工作安排" },
      {
        type: "list",
        ordered: true,
        items: [
          "完成基准网与测点的独立复核，形成复核报告。",
          "补充扰动工况监测数据，完成变形预测模型初版训练。",
          "接入项目管控平台，实现超限自动预警与处置闭环。",
        ],
      },
    ],
    signoff: {
      text: "本报告经项目组审核，数据与结论真实可追溯。",
      org: "XX 建设集团有限公司项目组",
      date: "2026 年 8 月 22 日",
    },
  },

  async render(ctx) {
    const kit = ctx.docx;
    const blocks: Record<string, any>[] = Array.isArray(ctx.data.blocks) ? ctx.data.blocks : [];

    const coverBlocks: any[] = ctx.has("cover") ? await ctx.use("cover") : [];
    const tocBlocks: any[] = ctx.has("toc") ? await ctx.use("toc") : [];

    const bodyBlocks: any[] = [];
    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index] as Record<string, any>;
      const owner = BLOCK_OWNER[String(block?.type ?? "")];
      if (!owner) {
        ctx.log("未知块类型 " + String(block?.type ?? "") + "（第 " + (index + 1) + " 块），已跳过");
        continue;
      }
      const rendered = await ctx.renderBlock(owner, { ...block, __index: index });
      if (Array.isArray(rendered)) bodyBlocks.push(...rendered);
    }
    if (ctx.has("signoff")) bodyBlocks.push(...(await ctx.use("signoff")));

    const header = String(ctx.data.header ?? "").trim();
    const footer = String(ctx.data.footer ?? "").trim();

    const sections: any[] = [];
    if (coverBlocks.length > 0) sections.push({ blocks: coverBlocks, footer: null });
    if (tocBlocks.length > 0) sections.push({ blocks: tocBlocks, footer: null });
    sections.push({
      blocks: bodyBlocks,
      footer: { text: footer, pageNumber: true },
      pageNumberStart: 1,
      header: header || undefined,
    });

    const cover = (ctx.data.cover ?? {}) as Record<string, any>;
    const document = kit.document({
      sections,
      title: String(cover.title ?? ctx.template.name),
      author: String(cover.org ?? "paper"),
      subject: String(cover.subtitle ?? ctx.template.description),
    });

    return { kind: "docx", document };
  },
});
