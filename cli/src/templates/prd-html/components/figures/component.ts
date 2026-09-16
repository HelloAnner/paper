import { defineComponent } from "../../../../core/types";
import { readAsset } from "../../../../core/fsx";

/**
 * 图：把 SVG 内联进 HTML（保持单文件自包含），外面套 <figure> 描边 + 右对齐图注。
 *   src  -> 相对 data.json 所在目录的 svg 文件（推荐，方便单独维护图）
 *   svg  -> 直接给 SVG 源码（样例数据 / 临时图用，不需要额外文件）
 */
export default defineComponent({
  meta: {
    id: "figures",
    name: "图",
    order: 60,
    optional: true,
    description: "内联 SVG 示意图 + 右下角图注",
    useWhen: "blocks 里出现 figure 时自动出现",
    when: (data) => Array.isArray(data.blocks) && data.blocks.some((block: any) => block?.type === "figure"),
  },

  render(): string {
    return "";
  },

  async renderBlock(ctx, block): Promise<string> {
    const inline = String(block?.svg ?? "").trim();
    const src = String(block?.src ?? "").trim();
    let svg = inline;
    if (!svg && src) svg = (await readAsset(ctx.assetDir, src)).trim();
    if (!svg) {
      ctx.log("figure 缺少 svg/src，已跳过");
      return "";
    }
    const caption = String(block?.caption ?? "").trim();
    const id = String(block?.id ?? "").trim();
    return (
      "<figure" + (id ? " id=\"" + id + "\"" : "") + ">" +
      svg +
      (caption ? "<figcaption>" + ctx.html.inline(caption) + "</figcaption>" : "") +
      "</figure>"
    );
  },
});
