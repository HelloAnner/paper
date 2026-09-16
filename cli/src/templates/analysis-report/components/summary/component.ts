import { defineComponent } from "../../../../core/types";

/** 执行摘要：一段摘要 + 要点列表。 */
export default defineComponent({
  meta: {
    id: "summary",
    name: "执行摘要",
    order: 20,
    description: "结论先行的摘要段落，可选要点列表 highlights",
  },

  render(ctx): void {
    const pdf = ctx.pdf;
    const data = ctx.data;
    pdf.h1("执行摘要");
    pdf.p(String(data.summary ?? ""));
    if (Array.isArray(data.highlights) && data.highlights.length > 0) {
      pdf.bullets(data.highlights.map((item: unknown) => String(item)));
    }
  },
});
