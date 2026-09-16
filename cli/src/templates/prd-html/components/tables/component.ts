import { defineComponent } from "../../../../core/types";

/**
 * 数据表：支持三种单元格形态
 *   1. 字符串（可带 **粗体** / 代码 / ==强调==）
 *   2. 状态圆标 { status: "yes"|"no"|"na", text }
 *   3. 块数组 [{ type: "p"|"list"|"group" }]，用来在单元格里放多段、列表、分组
 * 行也可以写成 { cells: [...], groupStart: true }，用于表格内部分组分隔线。
 */
const STATUS_ICON: Record<string, { cls: string; icon: string }> = {
  yes: { cls: "support-yes", icon: "✓" },
  no: { cls: "support-no", icon: "−" },
  na: { cls: "support-na", icon: "·" },
};

/** 状态圆标：yes 绿底 ✓ / no 红底 − / na 浅底 · */
function renderStatus(ctx: any, cell: Record<string, any>): string {
  const { cls, icon } = STATUS_ICON[String(cell.status)] as { cls: string; icon: string };
  return (
    "<span class=\"support-status " + cls + "\">" +
    "<span class=\"status-icon\" aria-hidden=\"true\">" + icon + "</span>" +
    "<span>" + ctx.html.inline(cell.text ?? "") + "</span>" +
    "</span>"
  );
}

function renderCellBlock(ctx: any, block: Record<string, any>): string {
  const type = String(block?.type ?? "");
  // 单元格里也能放状态圆标（例如「支持 / 需明确目标成员」这种多段内容）
  if (block?.status && STATUS_ICON[String(block.status)]) return renderStatus(ctx, block);
  if (type === "text") return "<span class=\"cell-text\">" + ctx.html.inline(block.text) + "</span>";
  if (type === "p") return "<p>" + ctx.html.inline(block.text) + "</p>";
  if (type === "list") {
    const items: unknown[] = Array.isArray(block.items) ? block.items : [];
    const list = items.map((item) => String(item ?? "")).filter((item) => item.trim().length > 0);
    if (list.length === 0) return "";
    const tag = block.ordered ? "ol" : "ul";
    return "<" + tag + " class=\"cell-list\">" + list.map((item) => "<li>" + ctx.html.inline(item) + "</li>").join("") + "</" + tag + ">";
  }
  if (type === "group") {
    const title = String(block.title ?? "").trim();
    const inner = (Array.isArray(block.blocks) ? block.blocks : [])
      .map((child: Record<string, any>) => renderCellBlock(ctx, child))
      .filter(Boolean)
      .join("");
    return (
      "<div class=\"cell-group\">" +
      (title ? "<div class=\"cell-group-title\"><strong>" + ctx.html.inline(title) + "</strong></div>" : "") +
      inner +
      "</div>"
    );
  }
  return "";
}

function renderCell(ctx: any, cell: unknown): string {
  if (cell === null || cell === undefined) return "";
  if (typeof cell === "string" || typeof cell === "number") return ctx.html.inline(cell);
  if (Array.isArray(cell)) {
    return cell.map((block: Record<string, any>) => renderCellBlock(ctx, block)).filter(Boolean).join("");
  }
  const record = cell as Record<string, any>;
  const status = String(record.status ?? "");
  if (status && STATUS_ICON[status]) return renderStatus(ctx, record);
  if (record.text !== undefined) return ctx.html.inline(record.text);
  return renderCellBlock(ctx, record);
}

export default defineComponent({
  meta: {
    id: "tables",
    name: "数据表",
    order: 50,
    optional: true,
    description: "表头 + 数据行；单元格可放状态圆标、表内列表、分组块",
    useWhen: "blocks 里出现 table 时自动出现",
    when: (data) => Array.isArray(data.blocks) && data.blocks.some((block: any) => block?.type === "table"),
  },

  render(): string {
    return "";
  },

  renderBlock(ctx, block): string {
    const head: unknown[] = Array.isArray(block?.head) ? block.head : [];
    const rows: unknown[] = Array.isArray(block?.rows) ? block.rows : [];
    const variant = String(block?.variant ?? "plain");
    const widths: number[] = Array.isArray(block?.widths) ? block.widths.map((value: unknown) => Number(value)) : [];

    const cls = variant && variant !== "plain" ? " class=\"" + variant + "\"" : "";
    const colgroup =
      widths.length > 0
        ? "<colgroup>" + widths.map((width) => "<col style=\"width:" + width + "%\">").join("") + "</colgroup>"
        : "";
    const thead =
      head.length > 0
        ? "<thead><tr>" + head.map((cell) => "<th>" + renderCell(ctx, cell) + "</th>").join("") + "</tr></thead>"
        : "";
    const tbody =
      rows.length > 0
        ? "<tbody>" +
          rows
            .map((row) => {
              const isRecord = row !== null && typeof row === "object" && !Array.isArray(row);
              const cells: unknown[] = isRecord ? ((row as Record<string, any>).cells ?? []) : (row as unknown[]);
              const groupStart = isRecord && (row as Record<string, any>).groupStart === true;
              return (
                "<tr" + (groupStart ? " class=\"field-group-start\"" : "") + ">" +
                cells.map((cell) => "<td>" + renderCell(ctx, cell) + "</td>").join("") +
                "</tr>"
              );
            })
            .join("") +
          "</tbody>"
        : "";

    if (!thead && !tbody) return "";
    return "<div class=\"table-wrap\"><table" + cls + ">" + colgroup + thead + tbody + "</table></div>";
  },
});
