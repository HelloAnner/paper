import { defineComponent } from "../../../../core/types";

/**
 * 结构类块：table / details。
 * 表格单元格支持四种写法：字符串、{value,bar}（数字列 + mini-bar）、{text,code,className}（主展示 + 编号）、{tags}。
 * details 的正文块在这里就地渲染（list/p/h3/callout），这样 -c tables 也能出完整折叠说明。
 */

function renderTags(ctx: any, tags: unknown[]): string {
  const list = tags.map((tag) => String(tag ?? "")).filter((tag) => tag.trim().length > 0);
  const inner = list.length > 0
    ? list.map((tag) => "<span class=\"field-tag\">" + ctx.html.inline(tag) + "</span>").join("")
    : "<span class=\"field-tag none\">无</span>";
  return "<td><div class=\"field-tags\">" + inner + "</div></td>";
}

function renderCell(ctx: any, cell: unknown): string {
  if (cell === null || cell === undefined) return "<td></td>";
  if (typeof cell === "string" || typeof cell === "number") return "<td>" + ctx.html.inline(cell) + "</td>";
  if (Array.isArray(cell)) return "<td>" + cell.map((item) => ctx.html.inline(item)).join("") + "</td>";

  const record = cell as Record<string, any>;
  if (Array.isArray(record.tags)) return renderTags(ctx, record.tags);

  if (record.value !== undefined) {
    const value = ctx.html.inline(record.value);
    if (record.bar === undefined || record.bar === null) return "<td class=\"num-cell\">" + value + "</td>";
    const bar = Math.min(100, Math.max(0, Number(record.bar) || 0));
    return "<td class=\"num-cell\">" + value + "<span class=\"mini-bar\"><i style=\"width:" + bar + "%\"></i></span></td>";
  }

  if (record.text !== undefined || record.code !== undefined) {
    const className = String(record.className ?? "").trim();
    const code = String(record.code ?? "").trim();
    return (
      "<td" + (className ? " class=\"" + ctx.html.inline(className) + "\"" : "") + ">" +
      ctx.html.inline(record.text ?? "") +
      (code ? "<code>" + ctx.html.inline(code) + "</code>" : "") +
      "</td>"
    );
  }
  return "<td></td>";
}

/** details 正文里的块：只支持文字类，版式交给 .detail-body 的 CSS。 */
function renderDetailBlocks(ctx: any, value: unknown): string {
  const blocks: Record<string, any>[] = Array.isArray(value) ? value.filter((block: unknown) => Boolean(block) && typeof block === "object") : [];
  return blocks
    .map((block) => {
      const type = String(block.type ?? "");
      if (type === "list") {
        const items = (Array.isArray(block.items) ? block.items : []).map((item: unknown) => String(item ?? "")).filter((item: string) => item.trim().length > 0);
        if (items.length === 0) return "";
        const tag = block.ordered ? "ol" : "ul";
        return "<" + tag + ">" + items.map((item: string) => "<li>" + ctx.html.inline(item) + "</li>").join("") + "</" + tag + ">";
      }
      if (type === "p") {
        const text = String(block.text ?? "");
        return text.trim().length > 0 ? "<p>" + ctx.html.inline(text) + "</p>" : "";
      }
      if (type === "h3") {
        const text = String(block.text ?? "").trim();
        return text ? "<h3>" + ctx.html.inline(text) + "</h3>" : "";
      }
      if (type === "callout") {
        const text = String(block.text ?? "").trim();
        const title = String(block.title ?? "").trim();
        if (!title && !text) return "";
        return "<div class=\"callout\">" + (title ? "<strong>" + ctx.html.inline(title) + "</strong>" : "") + (text ? ctx.html.inline(text) : "") + "</div>";
      }
      return "";
    })
    .join("");
}

/** 某类块是否出现在任意章节里 —— 可选组件靠它决定参不参与渲染。 */
function hasBlock(data: Record<string, any>, types: string[]): boolean {
  const sections: Record<string, any>[] = Array.isArray(data.sections) ? data.sections : [];
  return sections.some((section) => Array.isArray(section?.blocks) && section.blocks.some((block: Record<string, any>) => types.includes(String(block?.type ?? ""))));
}

export default defineComponent({
  meta: {
    id: "tables",
    name: "表格与折叠",
    order: 70,
    optional: true,
    description: "明细表（tenant-name / num-cell + mini-bar / field-tags 四种单元格）与折叠说明（details + detail-body）",
    useWhen: "blocks 里出现 table 或 details 时自动出现",
    when: (data) => hasBlock(data, ["table", "details"]),
  },

  render(): string {
    return "";
  },

  renderBlock(ctx, block): string {
    const type = String(block?.type ?? "");

    if (type === "table") {
      const head: unknown[] = Array.isArray(block.head) ? block.head : [];
      const rows: unknown[] = Array.isArray(block.rows) ? block.rows : [];
      if (head.length === 0 && rows.length === 0) return "";
      const caption = String(block.caption ?? "").trim();
      const thead = head.length > 0 ? "<thead><tr>" + head.map((cell) => "<th>" + ctx.html.inline(cell) + "</th>").join("") + "</tr></thead>" : "";
      const tbody = rows.length > 0
        ? "<tbody>" +
          rows
            .map((row) => {
              const cells: unknown[] = Array.isArray(row) ? row : Array.isArray((row as any)?.cells) ? (row as any).cells : [];
              return "<tr>" + cells.map((cell) => renderCell(ctx, cell)).join("") + "</tr>";
            })
            .join("") +
          "</tbody>"
        : "";
      return (
        "<div class=\"table-wrap\">" +
        "<table>" +
        (caption ? "<caption>" + ctx.html.inline(caption) + "</caption>" : "") +
        thead +
        tbody +
        "</table></div>"
      );
    }

    if (type === "details") {
      const items: Record<string, any>[] = (Array.isArray(block.items) ? block.items : []).filter((item: unknown) => Boolean(item) && typeof item === "object");
      if (items.length === 0) return "";
      return items
        .map((item) => {
          const summary = String(item.summary ?? "").trim();
          const open = item.open === true ? " open" : "";
          return (
            "<details" + open + ">" +
            "<summary>" + ctx.html.inline(summary) + "</summary>" +
            "<div class=\"detail-body\">" + renderDetailBlocks(ctx, item.blocks) + "</div>" +
            "</details>"
          );
        })
        .join("");
    }

    return "";
  },
});
