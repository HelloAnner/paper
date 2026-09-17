import { defineComponent } from "../../../../core/types";

/** 封面：密级编号 -> 主标题 -> 副标题 -> 项目要素表 -> 编制单位 / 日期。 */
export default defineComponent({
  meta: {
    id: "cover",
    name: "封面",
    order: 10,
    description: "封面：主标题、副标题、项目要素表、编制单位与日期（独立一节，不带页脚）",
  },

  render(ctx) {
    const kit = ctx.docx;
    const cover = (ctx.data.cover ?? {}) as Record<string, any>;
    const blocks: any[] = [];

    const metaLine = [String(cover.classify ?? "").trim(), String(cover.code ?? "").trim()].filter(Boolean).join("    ");
    if (metaLine) blocks.push(...kit.blocks("paper-cover-meta", metaLine));

    blocks.push(...kit.heading("paper-cover-title", cover.title));

    const subtitle = String(cover.subtitle ?? "").trim();
    if (subtitle) blocks.push(...kit.heading("paper-cover-subtitle", subtitle));

    const fields = (Array.isArray(cover.fields) ? cover.fields : [])
      .filter((row: unknown) => Array.isArray(row) && String(row[1] ?? "").trim().length > 0)
      .map((row: any[]) => [String(row[0] ?? ""), String(row[1] ?? "")] as [string, string]);
    if (fields.length > 0) {
      blocks.push(...kit.spacer(320));
      blocks.push(...kit.coverTable(fields, { labelRole: "paper-cover-label", valueRole: "paper-cover-value" }));
    }

    const org = String(cover.org ?? "").trim();
    const date = String(cover.date ?? "").trim();
    if (org) blocks.push(...kit.heading("paper-cover-org", org));
    if (date) blocks.push(...kit.heading("paper-cover-date", date));

    return blocks;
  },
});
