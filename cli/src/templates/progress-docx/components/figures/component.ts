import { defineComponent } from "../../../../core/types";
import { readBytes } from "../../../../core/fsx";
import { planBlocks, figureCaption } from "../../blocks";

type ImageKind = "png" | "jpg" | "gif" | "bmp";

function kindOf(src: string): ImageKind {
  const ext = src.toLowerCase().split(".").pop() ?? "";
  if (ext === "jpg" || ext === "jpeg") return "jpg";
  if (ext === "gif") return "gif";
  if (ext === "bmp") return "bmp";
  return "png";
}

/** 插图：图片居中 + 自动「图 N-M」图注；支持 png/jpg/gif/bmp 文件或内联 base64 PNG。 */
export default defineComponent({
  meta: {
    id: "figures",
    name: "插图",
    order: 50,
    optional: true,
    description: "插图：按原始比例缩放到版心宽度，图注自动编号（图 N-M）居中在图下方",
    useWhen: "blocks 里出现 type=figure 时自动出现",
    when: (data) => Array.isArray(data.blocks) && data.blocks.some((block: any) => block?.type === "figure"),
  },

  render(): any[] {
    return [];
  },

  async renderBlock(ctx, block): Promise<any[]> {
    const src = String(block.src ?? "").trim();
    const inline = String(block.png ?? "").trim();
    let data: Uint8Array | null = null;
    let kind: ImageKind = "png";

    if (inline) {
      data = new Uint8Array(Buffer.from(inline, "base64"));
    } else if (src) {
      kind = kindOf(src);
      data = await readBytes(ctx.assetDir, src);
    }
    if (!data || data.byteLength === 0) {
      ctx.log("第 " + (Number(block.__index ?? 0) + 1) + " 块 figure 没有 src/png，已跳过");
      return [];
    }

    const blocks = Array.isArray(ctx.data.blocks) ? ctx.data.blocks : [];
    const plan = planBlocks(blocks);
    const index = Number(block.__index ?? 0);
    const widthMm = Number(block.widthMm);
    return ctx.docx.figure({
      data,
      type: kind,
      widthMm: Number.isFinite(widthMm) && widthMm > 0 ? widthMm : undefined,
      caption: figureCaption(block, plan.figure[index]),
      alt: String(block.caption ?? "").trim() || undefined,
    });
  },
});
