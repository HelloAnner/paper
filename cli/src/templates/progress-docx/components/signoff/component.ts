import { defineComponent } from "../../../../core/types";
import { hasContent } from "../../../../core/registry";

/** 落款：正文结束后的编制单位 / 日期 / 补充说明，右对齐。 */
export default defineComponent({
  meta: {
    id: "signoff",
    name: "落款",
    order: 60,
    optional: true,
    description: "正文末尾的落款：说明文字、编制单位、日期（右对齐）",
    useWhen: "data.signoff 有内容时自动出现",
    when: (data) => hasContent(data.signoff),
  },

  render(ctx) {
    const signoff = (ctx.data.signoff ?? {}) as Record<string, any>;
    const kit = ctx.docx;
    const blocks: any[] = [];
    blocks.push(...kit.spacer(320));
    blocks.push(...kit.blocks("paper-signoff", signoff.text));
    if (String(signoff.org ?? "").trim()) blocks.push(...kit.heading("paper-signoff", signoff.org));
    if (String(signoff.date ?? "").trim()) blocks.push(...kit.heading("paper-signoff", signoff.date));
    return blocks;
  },
});
