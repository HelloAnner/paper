import { defineComponent } from "../../../../core/types";
import { planBlocks } from "../../blocks";

/** 目录：条目由 blocks 里的标题自动生成，页码是 PAGEREF 动态域。 */
export default defineComponent({
  meta: {
    id: "toc",
    name: "目录",
    order: 20,
    optional: true,
    description: "自动目录：标题文字 + 点线 + 右对齐动态页码（打开文档后自动更新）",
    useWhen: "blocks 里有 h1/h2/h3 且 tocLabel 不为 false 时自动出现",
    when: (data) =>
      data.tocLabel !== false &&
      Array.isArray(data.blocks) &&
      data.blocks.some((block: any) => ["h1", "h2", "h3"].includes(String(block?.type ?? ""))),
  },

  render(ctx) {
    const blocks = Array.isArray(ctx.data.blocks) ? ctx.data.blocks : [];
    const plan = planBlocks(blocks);
    if (plan.toc.length === 0) return [];
    const label = ctx.data.tocLabel === undefined || ctx.data.tocLabel === "" ? "目  录" : String(ctx.data.tocLabel);
    return ctx.docx.toc({ entries: plan.toc, title: label });
  },
});
