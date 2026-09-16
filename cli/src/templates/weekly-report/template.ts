/**
 * 模板：工作周报（docx）
 *
 * 整体框架把样式定死：大标题 + 元信息 + 概况 + 指标 + 进展 + 风险 + 计划。
 * 每个组件只负责自己那一段的排版细节，互不感知。
 */

import { defineTemplate } from "../../core/types";
import type { DocxBlock } from "../../core/docx-kit";
import summary from "./components/summary/component";
import metrics from "./components/metrics/component";
import progress from "./components/progress/component";
import risks from "./components/risks/component";
import nextPlan from "./components/next-plan/component";

export default defineTemplate({
  meta: {
    id: "weekly-report",
    name: "工作周报",
    format: "docx",
    description: "一页式周报：概况 + 关键指标 + 进展表 + 风险 + 下阶段计划，可直接发主管",
    useWhen: "需要按周/按双周汇报进展、指标、风险与下阶段计划；数据来源是团队成员各自的口头同步或任务系统导出",
    tags: ["周报", "汇报", "团队协作"],
  },

  schema: {
    title: { type: "string", required: true, desc: "文档标题，例如「增长组周报」", example: "增长组周报" },
    period: { type: "string", required: true, desc: "统计周期，例如「2026-03-02 ~ 03-06」", example: "2026-03-02 ~ 03-06" },
    author: { type: "string", desc: "汇报人；多人用「、」分隔", example: "张一鸣" },
    team: { type: "string", desc: "所属团队，会出现在副标题里", example: "增长工程组" },
    summary: {
      type: "string",
      required: true,
      desc: "本周整体概况，2-4 句：做成了什么、比预期好还是差、下周最关键的一件事",
      example: "本周完成新用户引导流程改版上线，注册转化率从 18.4% 提升到 22.1%，超出目标 2 个百分点。",
    },
    metrics: {
      type: "array",
      desc: "关键指标，3-5 条最合适（组件自动按行排列）",
      items: {
        type: "object",
        desc: "一条指标",
        fields: {
          name: { type: "string", required: true, desc: "指标名，例如「注册转化率」", example: "注册转化率" },
          value: { type: "string", required: true, desc: "本周数值，带单位，例如「22.1%」", example: "22.1%" },
          delta: { type: "string", desc: "环比变化，例如「+3.7pp」或「-120ms」", example: "+3.7pp" },
          note: { type: "string", desc: "一句话解释变化原因", example: "引导步骤由 5 步减到 3 步" },
        },
      },
    },
    progress: {
      type: "array",
      desc: "本周完成/推进的事项，按重要性从高到低排",
      items: {
        type: "object",
        desc: "一条进展",
        fields: {
          item: { type: "string", required: true, desc: "事项名称", example: "新用户引导流程改版" },
          owner: { type: "string", desc: "负责人", example: "李然" },
          status: { type: "string", desc: "状态，建议用「已完成 / 进行中 / 阻塞」", example: "已完成" },
          progress: { type: "string", desc: "进度百分比或阶段，例如「100%」", example: "100%" },
          note: { type: "string", desc: "补充说明或证据链接", example: "AB 实验第 3 天显著，已全量" },
        },
      },
    },
    risks: {
      type: "array",
      desc: "风险与问题，只写真的会影响交付的",
      items: {
        type: "object",
        desc: "一条风险",
        fields: {
          title: { type: "string", required: true, desc: "风险或问题描述", example: "埋点数据缺失导致归因不准" },
          impact: { type: "string", desc: "影响范围/严重程度", example: "影响下周渠道投放决策" },
          mitigation: { type: "string", desc: "已采取或计划采取的应对", example: "周三前补齐埋点，先按大盘数据兜底" },
        },
      },
    },
    nextPlan: {
      type: "array",
      desc: "下阶段计划，3-5 条，每条都要有负责人",
      items: {
        type: "object",
        desc: "一条计划",
        fields: {
          item: { type: "string", required: true, desc: "要做的事", example: "完成邀请裂变 MVP 开发" },
          owner: { type: "string", desc: "负责人", example: "王倩" },
          due: { type: "string", desc: "截止时间", example: "03-13" },
        },
      },
    },
    closing: { type: "string", desc: "结语：需要谁支持什么（没有就不填）", example: "需要设计同学在周三前给出裂变分享页终稿。" },
  },

  components: [summary, metrics, progress, risks, nextPlan],

  sample: {
    title: "增长组周报",
    period: "2026-03-02 ~ 03-06",
    author: "张一鸣",
    team: "增长工程组",
    summary:
      "本周核心目标是把新用户引导流程的转化提上来：改版已全量上线，注册转化率 18.4% → 22.1%。同时补齐了渠道归因看板的 P0 缺口。下周重点是邀请裂变 MVP。",
    metrics: [
      { name: "注册转化率", value: "22.1%", delta: "+3.7pp", note: "引导步骤 5 步减到 3 步" },
      { name: "D1 留存", value: "41.2%", delta: "+1.1pp", note: "首日任务弹窗提前到注册后 30 秒" },
      { name: "首屏加载", value: "1.24s", delta: "-0.38s", note: "图片改走 WebP + 懒加载" },
    ],
    progress: [
      { item: "新用户引导流程改版", owner: "李然", status: "已完成", progress: "100%", note: "AB 实验第 3 天显著，已全量" },
      { item: "渠道归因看板补齐 P0 指标", owner: "王倩", status: "已完成", progress: "100%", note: "覆盖 6 个投放渠道" },
      { item: "首屏性能专项", owner: "陈默", status: "进行中", progress: "70%", note: "还剩首屏 SDK 拆包" },
    ],
    risks: [
      {
        title: "埋点数据缺失导致归因不准",
        impact: "影响下周渠道投放预算分配",
        mitigation: "周三前补齐埋点，先用大盘数据做兜底判断",
      },
      { title: "裂变 MVP 依赖分享页设计稿", impact: "可能推迟 2 天上线", mitigation: "已与设计约周三上午评审" },
    ],
    nextPlan: [
      { item: "完成邀请裂变 MVP 开发并灰度 10%", owner: "王倩", due: "03-13" },
      { item: "首屏 SDK 拆包收尾，目标 1.0s 内", owner: "陈默", due: "03-11" },
      { item: "沉淀引导改版的实验复盘文档", owner: "张一鸣", due: "03-12" },
    ],
    closing: "需要设计同学在周三前给出裂变分享页终稿，否则灰度时间要顺延。",
  },

  async render(ctx) {
    const { data, docx } = ctx;
    const blocks: DocxBlock[] = [];

    blocks.push(...docx.title(String(data.title ?? ""), data.team ? String(data.team) : undefined));

    const metaLine = [
      data.author ? "汇报人：" + data.author : "",
      data.period ? "周期：" + data.period : "",
    ]
      .filter(Boolean)
      .join("        ");
    blocks.push(...docx.meta(metaLine));

    blocks.push(...ctx.use("summary"));
    blocks.push(...ctx.use("metrics"));
    blocks.push(...ctx.use("progress"));
    blocks.push(...ctx.use("risks"));
    blocks.push(...ctx.use("next-plan"));

    if (ctx.data.closing) {
      blocks.push(...docx.h1("需要支持"));
      blocks.push(...docx.quote(String(ctx.data.closing)));
    }

    const document = docx.document(blocks, {
      title: String(data.title ?? "周报"),
      author: String(data.author ?? "paper"),
      subject: "工作周报",
      footer: String(data.title ?? ""),
      pageNumber: true,
      marginMm: 22,
    });

    return { kind: "docx", document };
  },
});
