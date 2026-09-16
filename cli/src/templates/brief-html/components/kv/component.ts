import { defineComponent } from "../../../../core/types";

/** 键值信息块（负责人、周期、链接等）。 */
export default defineComponent({
  meta: {
    id: "kv",
    name: "键值信息",
    order: 30,
    optional: true,
    description: "键值信息块：负责人、周期、链接等",
    useWhen: "data.kv 有内容时自动出现",
    when: (data) => Array.isArray(data.kv) && data.kv.length > 0,
  },

  render(ctx): string {
    const rows = Array.isArray(ctx.data.kv) ? ctx.data.kv : [];
    return ctx.html.kv(rows.map((row: Record<string, any>) => [String(row.label ?? ""), String(row.value ?? "")]));
  },
});
