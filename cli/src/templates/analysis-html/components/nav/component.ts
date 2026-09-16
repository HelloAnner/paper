import { defineComponent } from "../../../../core/types";

/**
 * 顶部导航：左侧品牌 + 右侧章节锚点。
 * 数据里没写 nav 时，退化成"用 sections 里有 id + title 的章节自动生成"，AI 不用重复写一份。
 */
export default defineComponent({
  meta: {
    id: "nav",
    name: "顶部导航",
    order: 10,
    description: "sticky 导航条：左侧品牌文字，右侧章节锚点链接",
  },

  render(ctx): string[] {
    const data = ctx.data;
    const brand = String(data.brand ?? "").trim();
    const sections: Record<string, any>[] = Array.isArray(data.sections) ? data.sections : [];
    const manual: Record<string, any>[] = Array.isArray(data.nav) ? data.nav : [];

    const links = (manual.length > 0
      ? manual.map((item) => ({ text: String(item?.text ?? ""), href: String(item?.href ?? "") }))
      : sections.map((section) => ({ text: String(section?.title ?? ""), href: String(section?.id ?? "") }))
    ).filter((item) => item.text.trim().length > 0 && item.href.trim().length > 0);

    if (!brand && links.length === 0) return [];
    const anchors = links
      .map((item) => {
        const href = item.href.startsWith("#") ? item.href : "#" + item.href;
        return "<a href=\"" + ctx.html.inline(href) + "\">" + ctx.html.inline(item.text) + "</a>";
      })
      .join("");

    return [
      "<nav><div class=\"inner\">" +
        "<div class=\"brand\">" + ctx.html.inline(brand) + "</div>" +
        "<div class=\"links\">" + anchors + "</div>" +
        "</div></nav>",
    ];
  },
});
