import { defineComponent } from "../../../../core/types";

/** 落款：2px 黑线 + 小字。 */
export default defineComponent({
  meta: {
    id: "footer",
    name: "落款",
    order: 70,
    optional: true,
    description: "文档底部横线 + 落款小字",
    useWhen: "data.footer 有内容时自动出现",
    when: (data) => Boolean(String(data.footer ?? "").trim()),
  },

  render(ctx): string[] {
    const text = String(ctx.data.footer ?? "").trim();
    if (!text) return [];
    return ["<footer>" + ctx.html.inline(text) + "</footer>"];
  },
});
