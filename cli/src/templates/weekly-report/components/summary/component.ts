import { defineComponent } from "../../../../core/types";
import type { DocxBlock } from "../../../../core/docx-kit";

/** 本周概况：开篇一段话，代替流水账。 */
export default defineComponent({
  meta: {
    id: "summary",
    name: "本周概况",
    order: 10,
    description: "整体概况段落：做成了什么、和目标的差距、下周最重要的事",
  },

  render(ctx): DocxBlock[] {
    const text = String(ctx.data.summary ?? "").trim();
    if (!text) return [];
    return [...ctx.docx.h1("本周概况"), ...ctx.docx.p(text)];
  },
});
