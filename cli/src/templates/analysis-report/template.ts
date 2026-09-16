/**
 * 模板：分析报告 · 打印版（pdf）
 *
 * 结构：封面（独立一页）→ 执行摘要 → 关键指标 → 分章节正文 → 数据表 → 结论建议。
 * pdf 的组件是"顺序往 builder 上画"，所以 render 里的调用顺序就是文档顺序。
 */

import { defineTemplate } from "../../core/types";
import cover from "./components/cover/component";
import summary from "./components/summary/component";
import metrics from "./components/metrics/component";
import sections from "./components/sections/component";
import tables from "./components/tables/component";
import conclusion from "./components/conclusion/component";

export default defineTemplate({
  meta: {
    id: "analysis-report",
    name: "分析报告（打印版）",
    format: "pdf",
    description: "带封面的深度分析报告：摘要 + 指标卡 + 分章节正文 + 数据表 + 结论建议，A4 可直接打印",
    useWhen: "需要一份可正式发送或打印的 PDF 分析报告，强调结论先行、有数据支撑、篇幅 3-10 页",
    tags: ["分析报告", "打印", "正式文档"],
    page: {
      size: "A4",
      margin: 56,
      pageNumber: true,
      cover: true, // 第 1 页是封面组件画的整页封面
    },
  },

  schema: {
    title: { type: "string", required: true, desc: "报告主标题", example: "2026 Q1 用户增长分析报告" },
    subtitle: { type: "string", desc: "副标题，一句话点出结论", example: "渠道 ROI 分化明显，建议把预算向内容渠道倾斜" },
    author: { type: "string", desc: "作者", example: "增长分析组" },
    org: { type: "string", desc: "机构 / 部门", example: "数据与增长中心" },
    date: { type: "string", desc: "日期", example: "2026-04-08" },
    footer: { type: "string", desc: "页脚左侧文字（保密标识等）", example: "内部资料 · 请勿外传" },
    summary: {
      type: "string",
      required: true,
      desc: "执行摘要：3-5 句讲清结论、依据、建议动作（领导只读这一段）",
      example:
        "Q1 新增用户 128.4 万，完成目标的 107%，但获客成本同比上升 34%。分渠道看，内容渠道 ROI 为 3.2，付费投放 ROI 降至 1.1。建议 Q2 把付费预算的 30% 转移到内容渠道，并暂停 ROI 低于 1 的 2 个投放位。",
    },
    highlights: {
      type: "string[]",
      desc: "摘要要点，3-5 条短句",
      example: ["新增用户 128.4 万，达成率 107%", "综合获客成本上升 34%", "内容渠道 ROI 3.2，显著优于付费投放"],
    },
    metrics: {
      type: "array",
      desc: "关键指标卡片，建议 3 或 6 个（每行 3 个）",
      items: {
        type: "object",
        desc: "一张指标卡",
        fields: {
          label: { type: "string", required: true, desc: "指标名", example: "新增用户" },
          value: { type: "string", required: true, desc: "数值（含单位）", example: "128.4 万" },
          hint: { type: "string", desc: "右上角小字，用来写同比 / 达成率", example: "达成 107%" },
        },
      },
    },
    sections: {
      type: "array",
      desc: "正文章节，按顺序输出；每章一个小标题 + 若干段落 + 可选要点",
      items: {
        type: "object",
        desc: "一个章节",
        fields: {
          heading: { type: "string", required: true, desc: "章节标题", example: "一、整体表现" },
          paragraphs: { type: "string[]", desc: "段落列表，每段一个字符串", example: ["Q1 新增用户 128.4 万，环比增长 12%。"] },
          bullets: { type: "string[]", desc: "本章要点（可选，会排在段落后面）", example: ["3 月新增 52.1 万，为季度峰值"] },
        },
      },
    },
    tables: {
      type: "array",
      desc: "数据表，放在正文之后",
      items: {
        type: "object",
        desc: "一张表",
        fields: {
          caption: { type: "string", desc: "表标题，显示在表格上方", example: "表 1 各渠道投放效果对比" },
          head: { type: "string[]", required: true, desc: "表头", example: ["渠道", "花费", "新增用户", "ROI"] },
          rows: { type: "array", required: true, desc: "二维数组，每一行是字符串数组，长度与表头一致", example: [["内容渠道", "42 万", "18.6 万", "3.2"]] },
          widths: { type: "array", desc: "列宽比例数组，缺省等分", example: [3, 2, 2, 1] },
        },
      },
    },
    conclusion: {
      type: "object",
      desc: "结论与建议",
      fields: {
        text: { type: "string", desc: "结论段落", example: "整体增长质量好于去年，但成本结构需要调整。" },
        actions: { type: "string[]", desc: "行动项列表", example: ["4 月起将付费预算的 30% 转移至内容渠道"] },
      },
    },
  },

  components: [cover, summary, metrics, sections, tables, conclusion],

  sample: {
    title: "2026 Q1 用户增长分析报告",
    subtitle: "渠道 ROI 分化明显，建议把预算向内容渠道倾斜",
    author: "增长分析组",
    org: "数据与增长中心",
    date: "2026-04-08",
    footer: "内部资料 · 请勿外传",
    summary:
      "Q1 新增用户 128.4 万，完成季度目标的 107%，但综合获客成本同比上升 34%。分渠道看，内容渠道 ROI 达到 3.2，而付费投放 ROI 从 1.8 降到 1.1。建议 Q2 把付费预算的 30% 转移到内容渠道，同时暂停 ROI 低于 1 的两个投放位；产品侧优先修复注册漏斗第二步的流失。",
    highlights: [
      "新增用户 128.4 万，达成率 107%，3 月单月贡献 52.1 万",
      "综合获客成本上升 34%，主要来自付费渠道竞价上涨",
      "内容渠道 ROI 3.2，付费投放 ROI 1.1，差距扩大",
      "注册漏斗第二步流失率 41%，是当前最大的单点损耗",
    ],
    metrics: [
      { label: "新增用户", value: "128.4 万", hint: "达成 107%" },
      { label: "综合 CAC", value: "￥38.6", hint: "同比 +34%" },
      { label: "注册转化率", value: "22.1%", hint: "环比 +3.7pp" },
      { label: "内容渠道 ROI", value: "3.2", hint: "环比 +0.4" },
      { label: "付费投放 ROI", value: "1.1", hint: "环比 -0.7" },
      { label: "D7 留存", value: "31.5%", hint: "与上季持平" },
    ],
    sections: [
      {
        heading: "一、整体表现",
        paragraphs: [
          "Q1 累计新增用户 128.4 万，完成季度目标的 107%，其中 3 月单月新增 52.1 万，为近四个季度峰值。用户结构上，自然流量与内容渠道合计占比 58%，比去年同期提高 14 个百分点。",
          "成本侧压力明显：综合获客成本从 28.8 元升到 38.6 元，涨幅 34%。拆开看，付费渠道单价的上涨贡献了其中约 80% 的增量。",
        ],
        bullets: ["3 月新增 52.1 万，创近四季新高", "自然 + 内容渠道占比 58%，同比 +14pp", "CAC 上涨 34%，主要来自付费竞价"],
      },
      {
        heading: "二、渠道效率对比",
        paragraphs: [
          "内容渠道在 Q1 持续放量，单条内容平均带来 1240 个新增，ROI 3.2；相比之下，付费投放 ROI 从 1.8 降到 1.1，其中信息流和开屏两个投放位已经低于盈亏线。",
        ],
        bullets: ["内容渠道 ROI 3.2，环比 +0.4", "付费投放 ROI 1.1，环比 -0.7", "信息流、开屏两个投放位 ROI < 1"],
      },
      {
        heading: "三、漏斗与留存",
        paragraphs: [
          "注册漏斗第一步（落地页 → 表单）转化率 46%，与上季持平；第二步（表单 → 完成注册）流失率高达 41%，是当前最大的单点损耗。按现有流量规模估算，修复这一步到行业常见的 25% 流失率，每月可多获得约 3.2 万新增。",
          "留存方面，D7 留存 31.5%，与上季基本持平，说明产品价值感知没有明显恶化。",
        ],
        bullets: ["漏斗第二步流失 41%，修复后可月增约 3.2 万", "D7 留存 31.5%，保持稳定"],
      },
    ],
    tables: [
      {
        caption: "表 1 各渠道投放效果对比（Q1）",
        head: ["渠道", "花费", "新增用户", "CAC", "ROI"],
        rows: [
          ["内容渠道", "42.0 万", "18.6 万", "￥22.6", "3.2"],
          ["信息流", "186.5 万", "52.3 万", "￥35.7", "1.4"],
          ["开屏", "88.2 万", "21.4 万", "￥41.2", "0.9"],
          ["搜索", "56.4 万", "19.8 万", "￥28.5", "1.9"],
          ["自然 / 推荐", "—", "16.3 万", "—", "—"],
        ],
        widths: [3, 2, 2, 2, 1],
      },
      {
        caption: "表 2 注册漏斗各步骤转化（Q1）",
        head: ["步骤", "进入人数", "转化率", "环比"],
        rows: [
          ["落地页访问", "412 万", "—", "—"],
          ["提交表单", "189 万", "46.0%", "+0.4pp"],
          ["完成注册", "111 万", "58.9%", "-2.1pp"],
          ["首次激活", "78 万", "70.2%", "+1.5pp"],
        ],
      },
    ],
    conclusion: {
      text: "Q1 的增长数量达标，但结构上过度依赖付费投放，成本已经接近不可持续。内容渠道具备可复制性，应当在 Q2 成为主力；同时漏斗第二步的流失是当前性价比最高的修复点。",
      actions: [
        "4 月起把付费预算的 30% 转移至内容渠道，每周复盘 ROI",
        "暂停开屏投放位，信息流限价至 CAC 30 元以内",
        "产品侧 4 月内完成注册漏斗第二步的简化改版",
        "建立渠道 ROI 周报，异常波动 24 小时内归因",
      ],
    },
  },

  async render(ctx) {
    const { data, pdf } = ctx;
    if (data.footer) pdf.setFooter(String(data.footer));
    else pdf.setFooter(String(data.title ?? "paper"));

    ctx.use("cover");
    pdf.pageBreak();
    ctx.use("summary");
    ctx.use("metrics");
    ctx.use("sections");
    ctx.use("tables");
    ctx.use("conclusion");

    return { kind: "pdf", pdf };
  },
});
