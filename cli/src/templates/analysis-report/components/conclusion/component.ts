import { defineComponent } from "../../../../core/types";

/** 结论与建议：结论段落 + 行动项清单。 */
export default defineComponent({
  meta: {
    id: "conclusion",
    name: "结论与建议",
    order: 60,
    optional: true,
    description: "结论段落 + 行动项编号清单",
    useWhen: "data.conclusion 有内容时自动出现",
    when: (data) => Boolean(data.conclusion && (data.conclusion.text || (data.conclusion.actions ?? []).length)),
  },

  render(ctx): void {
    const pdf = ctx.pdf;
    const conclusion = ctx.data.conclusion ?? {};
    pdf.h1("结论与建议");
    if (conclusion.text) pdf.p(String(conclusion.text));
    const actions = Array.isArray(conclusion.actions) ? conclusion.actions : [];
    if (actions.length > 0) {
      pdf.h3("行动项");
      pdf.numbered(actions.map((item: unknown) => String(item)));
    }
  },
});
