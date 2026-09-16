import { defineComponent } from "../../../../core/types";

/** 关键指标：3 列卡片，适合放在摘要后面给读者一个总量印象。 */
export default defineComponent({
  meta: {
    id: "metrics",
    name: "关键指标卡",
    order: 30,
    optional: true,
    description: "关键指标卡：每行 3 张大数字卡片",
    useWhen: "data.metrics 有内容时自动出现",
    when: (data) => Array.isArray(data.metrics) && data.metrics.length > 0,
  },

  render(ctx): void {
    const metrics = Array.isArray(ctx.data.metrics) ? ctx.data.metrics : [];
    ctx.pdf.h1("关键指标");
    ctx.pdf.metricCards(
      metrics.map((metric: Record<string, any>) => ({
        label: String(metric.label ?? ""),
        value: String(metric.value ?? ""),
        hint: metric.hint ? String(metric.hint) : undefined,
      })),
      3,
    );
  },
});
