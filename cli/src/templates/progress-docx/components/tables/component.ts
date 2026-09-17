import { defineComponent } from "../../../../core/types";
import { planBlocks, tableCaption } from "../../blocks";

/** 数据表：自动加「表 N-M」题注，浅灰细线 + 灰底表头 + 跨页重复表头。 */
export default defineComponent({
  meta: {
    id: "tables",
    name: "数据表",
    order: 40,
    optional: true,
    description: "数据表：自动编号表题（表 N-M）、灰底表头、可选相对列宽与逐列对齐、斑马纹",
    useWhen: "blocks 里出现 type=table 时自动出现",
    when: (data) => Array.isArray(data.blocks) && data.blocks.some((block: any) => block?.type === "table"),
  },

  render(): any[] {
    return [];
  },

  renderBlock(ctx, block): any[] {
    const blocks = Array.isArray(ctx.data.blocks) ? ctx.data.blocks : [];
    const plan = planBlocks(blocks);
    const index = Number(block.__index ?? 0);
    return ctx.docx.table({
      head: Array.isArray(block.head) ? block.head.map((cell: unknown) => String(cell ?? "")) : undefined,
      rows: Array.isArray(block.rows) ? block.rows : [],
      widths: Array.isArray(block.widths) ? block.widths.map((width: unknown) => Number(width) || 1) : undefined,
      align: Array.isArray(block.align) ? block.align : undefined,
      caption: tableCaption(block, plan.table[index]),
      captionRole: "paper-table-caption",
      zebra: block.zebra === true,
    });
  },
});
