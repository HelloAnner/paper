import { defineComponent } from "../../../../core/types";
import { planBlocks } from "../../blocks";

/** 文本类块：h1 / h2 / h3 / p / list / quote / note / pageBreak。 */
export default defineComponent({
  meta: {
    id: "prose",
    name: "正文",
    order: 30,
    description: "多级标题（自动编号）、正文段落（首行缩进 2 字符）、列表、引文、注释、分页",
  },

  render(): any[] {
    return [];
  },

  renderBlock(ctx, block): any[] {
    const kit = ctx.docx;
    const type = String(block?.type ?? "");
    const index = Number(block.__index ?? 0);

    switch (type) {
      case "h1":
      case "h2":
      case "h3": {
        const blocks = Array.isArray(ctx.data.blocks) ? ctx.data.blocks : [];
        const plan = planBlocks(blocks);
        const text = plan.heading[index] ?? String(block.text ?? "").trim();
        if (!text) return [];
        const roleId = type === "h1" ? "paper-h1" : type === "h2" ? "paper-h2" : "paper-h3";
        const bookmark = plan.bookmark[index];
        const runs = kit.rich(text);
        const children = bookmark ? [kit.bookmark(bookmark, runs)] : runs;
        return [kit.para(roleId, children)];
      }
      case "p":
        return kit.blocks("paper-body", block.text);
      case "quote":
        return kit.blocks("paper-quote", block.text);
      case "note":
        return kit.blocks("paper-note", block.text);
      case "list": {
        const items = Array.isArray(block.items) ? block.items : [];
        return kit.list("paper-list", items, block.ordered === true);
      }
      case "pageBreak":
        return kit.pageBreak();
      default:
        return [];
    }
  },
});
