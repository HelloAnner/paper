import { defineComponent } from "../../../../core/types";
import type { DocxBlock } from "../../../../core/docx-kit";

/** 风险与问题：风险 / 影响 / 应对 三列。 */
export default defineComponent({
  meta: {
    id: "risks",
    name: "风险与问题",
    order: 40,
    optional: true,
    description: "风险表：风险 / 影响 / 应对",
    useWhen: "data.risks 有内容时自动出现",
    when: (data) => Array.isArray(data.risks) && data.risks.length > 0,
  },

  render(ctx): DocxBlock[] {
    const risks = Array.isArray(ctx.data.risks) ? ctx.data.risks : [];
    const rows = risks.map((risk: Record<string, any>) => [
      String(risk.title ?? ""),
      risk.impact ? String(risk.impact) : "待评估",
      risk.mitigation ? String(risk.mitigation) : "待定",
    ]);
    return [
      ...ctx.docx.h1("风险与问题"),
      ...ctx.docx.table({
        head: ["风险 / 问题", "影响", "应对措施"],
        rows,
        widths: [4, 3, 4],
        align: ["left", "left", "left"],
      }),
    ];
  },
});
