import { defineComponent } from "../../../../core/types";

/** 核心要点列表。 */
export default defineComponent({
  meta: {
    id: "highlights",
    name: "核心要点",
    order: 20,
    description: "三条以内的核心结论，用无序列表呈现",
  },

  render(ctx): string {
    const items = Array.isArray(ctx.data.highlights) ? ctx.data.highlights : [];
    if (items.length === 0) return "";
    return ctx.html.h1("核心要点") + ctx.html.bullets(items.map((item: unknown) => String(item)));
  },
});
