import { defineComponent } from "../../../../core/types";

/** 封面：整页居中，标题 + 副标题 + 作者/机构/日期。 */
export default defineComponent({
  meta: {
    id: "cover",
    name: "封面",
    order: 10,
    description: "独立一页的封面：主标题、副标题、作者、机构、日期、页脚说明",
  },

  render(ctx): void {
    const data = ctx.data;
    const meta = [
      data.author ? "作者：" + data.author : "",
      data.org ? "机构：" + data.org : "",
      data.date ? "日期：" + data.date : "",
    ].filter(Boolean);

    ctx.pdf.cover({
      title: String(data.title ?? ""),
      subtitle: data.subtitle ? String(data.subtitle) : undefined,
      meta,
      footer: data.footer ? String(data.footer) : undefined,
    });
  },
});
