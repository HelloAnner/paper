import { defineComponent } from "../../../../core/types";

/** 页脚备注。 */
export default defineComponent({
  meta: {
    id: "note",
    name: "备注",
    order: 50,
    optional: true,
    description: "页脚备注与数据来源",
    useWhen: "data.note 有内容时自动出现",
    when: (data) => Boolean(data.note),
  },

  render(ctx): string {
    const note = String(ctx.data.note ?? "").trim();
    if (!note) return "";
    return ctx.html.rule() + ctx.html.meta(note);
  },
});
