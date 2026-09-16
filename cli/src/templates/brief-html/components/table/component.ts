import { defineComponent } from "../../../../core/types";

/** 数据表。 */
export default defineComponent({
  meta: {
    id: "table",
    name: "数据表",
    order: 40,
    optional: true,
    description: "一张数据表（带可选标题）",
    useWhen: "data.table.head 与 data.table.rows 都有内容时自动出现",
    when: (data) => Boolean(data.table && Array.isArray(data.table.head) && Array.isArray(data.table.rows) && data.table.rows.length > 0),
  },

  render(ctx): string {
    const table = ctx.data.table ?? {};
    const head = Array.isArray(table.head) ? table.head.map((cell: unknown) => String(cell)) : undefined;
    const rows = Array.isArray(table.rows)
      ? table.rows.map((row: unknown) => (Array.isArray(row) ? row.map((cell: unknown) => String(cell)) : [String(row)]))
      : [];
    if (rows.length === 0) return "";
    const caption = table.caption ? ctx.html.h2(String(table.caption)) : "";
    return caption + ctx.html.table({ head, rows });
  },
});
