import { defineComponent } from "../../../../core/types";
import { plainText } from "../../../../core/richtext";

/**
 * 阅读目录：只列 h2，行内排布。
 * 锚点规则与 prose 组件一致：section-<块序号+1>（块上写了 id 就用 id）。
 */
function anchorOf(block: Record<string, any>, index: number): string {
  const custom = String(block.id ?? "").trim();
  return custom.length > 0 ? custom : "section-" + (index + 1);
}

export default defineComponent({
  meta: {
    id: "toc",
    name: "阅读目录",
    order: 30,
    optional: true,
    description: "把全部 h2 列成一行行内目录；也可用 data.toc 手写条目",
    useWhen: "data.tocLabel 或 data.toc 有内容时自动出现",
    when: (data) => Boolean(data.tocLabel) || (Array.isArray(data.toc) && data.toc.length > 0),
  },

  render(ctx): string[] {
    const blocks: Record<string, any>[] = Array.isArray(ctx.data.blocks) ? ctx.data.blocks : [];
    const headings = blocks
      .map((block, index) => ({ block, index }))
      .filter((entry) => entry.block && entry.block.type === "h2");

    const manual: string[] = Array.isArray(ctx.data.toc) ? ctx.data.toc.map((text: unknown) => String(text)) : [];
    const items = manual.length > 0
      ? manual.map((text) => {
          const hit = headings.find((entry) => plainText(entry.block.text) === text);
          return hit ? { text, anchor: anchorOf(hit.block, hit.index) } : { text, anchor: "" };
        })
      : headings.map((entry) => ({ text: plainText(entry.block.text), anchor: anchorOf(entry.block, entry.index) }));

    if (items.length === 0) return [];
    const label = String(ctx.data.tocLabel ?? "").trim();

    // 目录形态：inline（原设计的行内链接，适合短标题）/ list（两列编号，适合长标题）
    const mode = String(ctx.data.tocStyle ?? "auto");
    const longest = items.reduce((max, item) => Math.max(max, plainText(item.text).length), 0);
    const useList = mode === "list" || (mode === "auto" && (longest > 10 || items.length > 8));

    const links = items
      .map((item) =>
        item.anchor
          ? "<a href=\"#" + item.anchor + "\">" + ctx.html.inline(item.text) + "</a>"
          : "<a>" + ctx.html.inline(item.text) + "</a>",
      )
      .join("");

    return [
      "<nav class=\"reading-toc" + (useList ? " is-list" : "") + "\" aria-label=\"文档目录\">" +
        (label ? "<span class=\"toc-label\">" + ctx.html.inline(label) + "</span>" : "") +
        links +
        "</nav>",
    ];
  },
});
