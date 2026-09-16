import { defineComponent } from "../../../../core/types";

/** 页眉条：3px 黑线 + 左侧文档类别（右可选版本/密级）。 */
export default defineComponent({
  meta: {
    id: "masthead",
    name: "页眉条",
    order: 10,
    description: "顶部横线 + 文档类别小字（左）与版本/密级（右）",
  },

  render(ctx): string[] {
    const left = String(ctx.data.masthead ?? "").trim();
    const right = String(ctx.data.mastheadRight ?? "").trim();
    if (!left && !right) return [];
    const cells = [left, right]
      .filter((text) => text.length > 0)
      .map((text) => "<span>" + ctx.html.inline(text) + "</span>");
    return ["<div class=\"masthead\">" + cells.join("") + "</div>"];
  },
});
