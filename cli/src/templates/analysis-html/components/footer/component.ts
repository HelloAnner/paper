import { defineComponent } from "../../../../core/types";

/** 页脚：左右两条小字，footer 里写 \n 分段。 */
export default defineComponent({
  meta: {
    id: "footer",
    name: "页脚",
    order: 80,
    optional: true,
    description: "页面尾部说明：横线上方左右排布的小字",
    useWhen: "data.footer 有内容时自动出现",
    when: (data) => Boolean(String(data.footer ?? "").trim()),
  },

  render(ctx): string[] {
    const text = String(ctx.data.footer ?? "").trim();
    if (!text) return [];
    const lines = text.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
    return ["<footer>" + lines.map((line) => "<p>" + ctx.html.inline(line) + "</p>").join("") + "</footer>"];
  },
});
