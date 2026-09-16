import { defineComponent } from "../../../../core/types";
import type { DocxBlock } from "../../../../core/docx-kit";

/** 本周进展：事项 / 负责人 / 状态 / 进度 / 说明 五列表。 */
export default defineComponent({
  meta: {
    id: "progress",
    name: "本周进展",
    order: 30,
    optional: true,
    description: "进展表：事项 / 负责人 / 状态 / 进度 / 说明",
    useWhen: "data.progress 有内容时自动出现",
    when: (data) => Array.isArray(data.progress) && data.progress.length > 0,
  },

  render(ctx): DocxBlock[] {
    const progress = Array.isArray(ctx.data.progress) ? ctx.data.progress : [];
    const rows = progress.map((item: Record<string, any>) => [
      String(item.item ?? ""),
      item.owner ? String(item.owner) : "—",
      item.status ? String(item.status) : "—",
      item.progress ? String(item.progress) : "—",
      item.note ? String(item.note) : "",
    ]);
    return [
      ...ctx.docx.h1("本周进展"),
      ...ctx.docx.table({
        head: ["事项", "负责人", "状态", "进度", "说明"],
        rows,
        widths: [4, 2, 2, 2, 4],
        align: ["left", "left", "center", "right", "left"],
      }),
    ];
  },
});
