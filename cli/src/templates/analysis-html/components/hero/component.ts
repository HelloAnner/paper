import { defineComponent } from "../../../../core/types";

/**
 * 结论头图：蓝色 eyebrow → 主标题（46px）→ 导语 → meta 胶囊 → 绿色结论框。
 * title 里的 \n 是作者手动断行，渲染成 <br>。
 */
export default defineComponent({
  meta: {
    id: "hero",
    name: "结论头图",
    order: 20,
    description: "eyebrow + 主标题 + 导语 + meta 胶囊 + 绿色结论框（hero-verdict）",
  },

  render(ctx): string[] {
    const data = ctx.data;
    const eyebrow = String(data.eyebrow ?? "").trim();
    const title = String(data.title ?? "").trim();
    const lead = String(data.lead ?? "").trim();
    const meta: unknown[] = Array.isArray(data.meta) ? data.meta : [];
    const verdict = data.verdict && typeof data.verdict === "object" ? (data.verdict as Record<string, any>) : null;

    if (!eyebrow && !title && !lead && !verdict) return [];

    const parts: string[] = ["<header class=\"hero\">"];
    if (eyebrow) parts.push("<div class=\"eyebrow\">" + ctx.html.inline(eyebrow) + "</div>");
    if (title) {
      parts.push("<h1>" + title.split("\n").map((line) => ctx.html.inline(line)).join("<br>") + "</h1>");
    }
    if (lead) parts.push("<p>" + ctx.html.inline(lead) + "</p>");

    const pills = meta.map((item) => String(item ?? "")).filter((text) => text.trim().length > 0);
    if (pills.length > 0) {
      parts.push("<div class=\"meta\">" + pills.map((text) => "<span>" + ctx.html.inline(text) + "</span>").join("") + "</div>");
    }

    if (verdict) {
      const index = String(verdict.index ?? "").trim();
      const vTitle = String(verdict.title ?? "").trim();
      const vText = String(verdict.text ?? "").trim();
      if (vTitle || vText) {
        parts.push(
          "<div class=\"hero-verdict\">" +
            (index ? "<div class=\"index\">" + ctx.html.inline(index) + "</div>" : "") +
            "<div>" +
            (vTitle ? "<h2>" + ctx.html.inline(vTitle) + "</h2>" : "") +
            (vText ? "<p>" + ctx.html.inline(vText) + "</p>" : "") +
            "</div>" +
            "</div>",
        );
      }
    }
    parts.push("</header>");
    return [parts.join("")];
  },
});
