import { defineComponent } from "../../../../core/types";
import type { DocxBlock } from "../../../../core/docx-kit";

/** 关键指标：表格形式，数值右对齐方便纵向对比。 */
export default defineComponent({
  meta: {
    id: "metrics",
    name: "关键指标",
    order: 20,
    optional: true,
    description: "关键指标表：指标 / 本周 / 环比 / 说明",
    useWhen: "data.metrics 有内容时自动出现",
    when: (data) => Array.isArray(data.metrics) && data.metrics.length > 0,
  },

  render(ctx): DocxBlock[] {
    const metrics = Array.isArray(ctx.data.metrics) ? ctx.data.metrics : [];
    const rows = metrics.map((metric: Record<string, any>) => [
      String(metric.name ?? ""),
      String(metric.value ?? ""),
      metric.delta ? String(metric.delta) : "—",
      metric.note ? String(metric.note) : "",
    ]);
    return [
      ...ctx.docx.h1("关键指标"),
      ...ctx.docx.table({
        head: ["指标", "本周", "环比", "说明"],
        rows,
        widths: [3, 2, 2, 5],
        align: ["left", "right", "right", "left"],
      }),
    ];
  },
});
