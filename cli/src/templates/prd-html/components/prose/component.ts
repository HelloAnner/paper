import { defineComponent } from "../../../../core/types";

/**
 * 文本类块：h2 / h3 / h4 / p / list / quote。
 * 标题锚点：section-<块序号+1>，与 toc 组件保持同一规则。
 */
function anchorOf(block: Record<string, any>): string {
  const custom = String(block.id ?? "").trim();
  if (custom.length > 0) return custom;
  const index = Number(block.__index ?? 0);
  return "section-" + (index + 1);
}

export default defineComponent({
  meta: {
    id: "prose",
    name: "正文",
    order: 40,
    description: "多级标题、段落、无序/有序列表、引用块",
  },

  render(): string {
    return "";
  },

  renderBlock(ctx, block): string {
    const type = String(block?.type ?? "");
    switch (type) {
      case "h2":
      case "h3":
      case "h4": {
        const text = String(block.text ?? "").trim();
        if (!text) return "";
        return "<" + type + " id=\"" + anchorOf(block) + "\">" + ctx.html.inline(text) + "</" + type + ">";
      }
      case "p": {
        const text = String(block.text ?? "");
        if (!text.trim()) return "";
        return "<p>" + ctx.html.inline(text) + "</p>";
      }
      case "quote": {
        const text = String(block.text ?? "");
        if (!text.trim()) return "";
        return "<blockquote>" + ctx.html.inline(text) + "</blockquote>";
      }
      case "list": {
        const items: unknown[] = Array.isArray(block.items) ? block.items : [];
        const list = items.map((item) => String(item ?? "")).filter((item) => item.trim().length > 0);
        if (list.length === 0) return "";
        const tag = block.ordered ? "ol" : "ul";
        return (
          "<" + tag + " class=\"doc-list\">" +
          list.map((item) => "<li>" + ctx.html.inline(item) + "</li>").join("") +
          "</" + tag + ">"
        );
      }
      default:
        return "";
    }
  },
});
