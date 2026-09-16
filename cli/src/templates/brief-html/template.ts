/**
 * 模板：一页速览（html）
 *
 * 产出单文件 HTML（CSS 内联，可直接打印成 PDF，也可以直接发链接）。
 * html 模板的组件返回 HTML 字符串，模板负责拼装顺序。
 */

import { defineTemplate } from "../../core/types";
import hero from "./components/hero/component";
import highlights from "./components/highlights/component";
import kv from "./components/kv/component";
import table from "./components/table/component";
import note from "./components/note/component";

export default defineTemplate({
  meta: {
    id: "brief-html",
    name: "一页速览（HTML）",
    format: "html",
    description: "单文件 HTML 速览页：标题 + 要点 + 键值信息 + 一张表，浏览器打开即可，也能直接打印",
    useWhen: "需要快速产出一份可分享/可粘贴的单文件网页纪要，内容量在一页以内",
    tags: ["网页", "速览", "分享"],
  },

  schema: {
    title: { type: "string", required: true, desc: "页面标题", example: "Q1 增长复盘速览" },
    subtitle: { type: "string", desc: "副标题", example: "三个结论 + 一张渠道表" },
    updatedAt: { type: "string", desc: "更新时间", example: "2026-04-08 更新" },
    highlights: {
      type: "string[]",
      required: true,
      desc: "核心要点，3-5 条",
      example: ["新增用户达成 107%", "内容渠道 ROI 3.2", "付费投放 ROI 降到 1.1"],
    },
    kv: {
      type: "array",
      desc: "键值信息，例如负责人、周期、链接",
      items: {
        type: "object",
        desc: "一行信息",
        fields: {
          label: { type: "string", required: true, desc: "标签", example: "负责人" },
          value: { type: "string", required: true, desc: "内容", example: "张一鸣" },
        },
      },
    },
    table: {
      type: "object",
      desc: "一张数据表（可选）",
      fields: {
        caption: { type: "string", desc: "表标题", example: "各渠道效果" },
        head: { type: "string[]", required: true, desc: "表头", example: ["渠道", "ROI"] },
        rows: { type: "array", required: true, desc: "二维数组", example: [["内容渠道", "3.2"]] },
      },
    },
    note: { type: "string", desc: "页脚备注", example: "数据来源：增长看板，口径见内部文档" },
  },

  components: [hero, highlights, kv, table, note],

  sample: {
    title: "Q1 增长复盘速览",
    subtitle: "三个结论 + 一张渠道表",
    updatedAt: "2026-04-08 更新",
    highlights: [
      "新增用户 128.4 万，达成率 107%，3 月为季度峰值",
      "内容渠道 ROI 3.2，付费投放降到 1.1",
      "注册漏斗第二步流失 41%，是性价比最高的修复点",
    ],
    kv: [
      { label: "负责人", value: "张一鸣" },
      { label: "数据周期", value: "2026-01-01 ~ 03-31" },
      { label: "看板链接", value: "growth-dashboard/internal/q1" },
    ],
    table: {
      caption: "各渠道效果",
      head: ["渠道", "花费", "新增", "ROI"],
      rows: [
        ["内容渠道", "42.0 万", "18.6 万", "3.2"],
        ["信息流", "186.5 万", "52.3 万", "1.4"],
        ["开屏", "88.2 万", "21.4 万", "0.9"],
      ],
    },
    note: "数据来源：增长看板；口径与 Q4 保持一致。",
  },

  async render(ctx) {
    const { data, html } = ctx;
    const parts = [
      html.title(String(data.title ?? ""), data.subtitle ? String(data.subtitle) : undefined),
      data.updatedAt ? html.meta(String(data.updatedAt)) : "",
      ctx.use("highlights"),
      ctx.use("kv"),
      ctx.use("table"),
      ctx.use("note"),
    ];
    return {
      kind: "html",
      html: html.page({ title: String(data.title ?? "速览"), body: parts.filter(Boolean).join("\n") }),
    };
  },
});
