import { defineComponent } from "../../../../core/types";
import type { DocxBlock } from "../../../../core/docx-kit";

/** 下阶段计划：编号列表，负责人和截止时间挂在条目后面。 */
export default defineComponent({
  meta: {
    id: "next-plan",
    name: "下阶段计划",
    order: 50,
    optional: true,
    description: "下阶段计划编号清单，带负责人与截止时间",
    useWhen: "data.nextPlan 有内容时自动出现",
    when: (data) => Array.isArray(data.nextPlan) && data.nextPlan.length > 0,
  },

  render(ctx): DocxBlock[] {
    const plan = Array.isArray(ctx.data.nextPlan) ? ctx.data.nextPlan : [];
    const items = plan.map((entry: Record<string, any>) => {
      const suffix = [
        entry.owner ? "负责人 " + entry.owner : "",
        entry.due ? "截止 " + entry.due : "",
      ]
        .filter(Boolean)
        .join(" · ");
      return suffix ? String(entry.item ?? "") + "（" + suffix + "）" : String(entry.item ?? "");
    });
    return [...ctx.docx.h1("下阶段计划"), ...ctx.docx.numbered(items)];
  },
});
