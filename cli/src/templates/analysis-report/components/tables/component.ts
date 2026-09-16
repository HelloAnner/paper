import { defineComponent } from "../../../../core/types";

/** 数据表：caption + 表头 + 二维数据，跨页自动重画表头。 */
export default defineComponent({
  meta: {
    id: "tables",
    name: "数据表",
    order: 50,
    optional: true,
    description: "数据表：表头 + 明细，跨页自动重画表头",
    useWhen: "data.tables 有内容时自动出现",
    when: (data) => Array.isArray(data.tables) && data.tables.length > 0,
  },

  render(ctx): void {
    const pdf = ctx.pdf;
    const tables = Array.isArray(ctx.data.tables) ? ctx.data.tables : [];
    tables.forEach((table: Record<string, any>, index: number) => {
      const head = Array.isArray(table.head) ? table.head.map((cell: unknown) => String(cell)) : undefined;
      const rows = Array.isArray(table.rows)
        ? table.rows.map((row: unknown) =>
            Array.isArray(row) ? row.map((cell: unknown) => String(cell)) : [String(row)],
          )
        : [];
      if (index > 0) pdf.space(8);
      pdf.table({
        head,
        rows,
        widths: Array.isArray(table.widths) ? table.widths.map((w: unknown) => Number(w)) : undefined,
        caption: table.caption ? String(table.caption) : undefined,
      });
    });
  },
});
