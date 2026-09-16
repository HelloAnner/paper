import { defineComponent } from "../../../../core/types";

/** 标题区：h1（36px）+ 绿色一句话主张（24px）+ 灰色元信息（13px，带下划线）。 */
export default defineComponent({
  meta: {
    id: "title",
    name: "标题区",
    order: 20,
    description: "文档主标题、绿色副标题（tagline）、灰色元信息（meta）",
  },

  render(ctx): string[] {
    const data = ctx.data;
    const title = String(data.title ?? "").trim();
    if (!title) return [];

    const parts = ["<h1 id=\"title\">" + ctx.html.inline(title) + "</h1>"];
    const tagline = String(data.tagline ?? "").trim();
    if (tagline) parts.push("<p class=\"tagline\">" + ctx.html.inline(tagline) + "</p>");
    const meta = String(data.meta ?? "").trim();
    if (meta) parts.push("<p class=\"doc-meta\">" + ctx.html.inline(meta) + "</p>");
    return parts;
  },
});
