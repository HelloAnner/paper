import { defineComponent } from "../../../../core/types";

/**
 * 场景家族卡：.scene-family-grid + .scene-family（kicker / h3 / total）+ .scene-item*。
 * 某一组 title 为空表示"只给一组条目"，不套家族卡，直接排 scene-item。
 */
function sceneItem(ctx: any, item: Record<string, any>): string {
  const name = String(item.name ?? "").trim();
  const value = String(item.value ?? "").trim();
  const unit = String(item.unit ?? "").trim();
  const meta = String(item.meta ?? "").trim();
  const examples = String(item.examples ?? "").trim();
  return (
    "<div class=\"scene-item\">" +
    "<div class=\"scene-item-top\">" +
    "<div class=\"scene-item-name\">" + ctx.html.inline(name) + "</div>" +
    "<div class=\"scene-item-value\">" + ctx.html.inline(value) + (unit ? "<small>" + ctx.html.inline(unit) + "</small>" : "") + "</div>" +
    "</div>" +
    (meta ? "<div class=\"scene-item-meta\">" + ctx.html.inline(meta) + "</div>" : "") +
    (examples ? "<div class=\"scene-item-examples\">" + ctx.html.inline(examples) + "</div>" : "") +
    "</div>"
  );
}

/** 某类块是否出现在任意章节里 —— 可选组件靠它决定参不参与渲染。 */
function hasBlock(data: Record<string, any>, types: string[]): boolean {
  const sections: Record<string, any>[] = Array.isArray(data.sections) ? data.sections : [];
  return sections.some((section) => Array.isArray(section?.blocks) && section.blocks.some((block: Record<string, any>) => types.includes(String(block?.type ?? ""))));
}

export default defineComponent({
  meta: {
    id: "scenes",
    name: "场景卡",
    order: 60,
    optional: true,
    description: "场景家族卡：家族头（kicker + 标题 + 总量）+ 若干场景条目（名称 / 次数 / 表单数与租户数 / 代表案例）",
    useWhen: "blocks 里出现 scenes 时自动出现",
    when: (data) => hasBlock(data, ["scenes"]),
  },

  render(): string {
    return "";
  },

  renderBlock(ctx, block): string {
    const families: Record<string, any>[] = (Array.isArray(block?.items) ? block.items : []).filter((item: unknown) => Boolean(item) && typeof item === "object");
    if (families.length === 0) return "";

    const blockKicker = String(block.kicker ?? "").trim();
    const cards: string[] = [];

    for (const family of families) {
      const title = String(family.title ?? "").trim();
      // 家族小标优先用家族自己的 kicker（原文档是「业务领域 01」），缺省回落到块级 kicker
      const kicker = String(family.kicker ?? "").trim() || blockKicker;
      const nested: Record<string, any>[] = (Array.isArray(family.items) ? family.items : []).filter((item: unknown) => Boolean(item) && typeof item === "object");

      if (!title) {
        // 没有家族标题：只排条目，不渲染家族卡
        for (const item of nested.length > 0 ? nested : [family]) cards.push(sceneItem(ctx, item));
        continue;
      }

      const tone = ["green", "red", "amber", "blue"].includes(String(family.tone ?? "")) ? " " + String(family.tone) : "";
      const total = String(family.total ?? "").trim();
      const totalUnit = String(family.totalUnit ?? "").trim();
      cards.push(
        "<div class=\"scene-family" + tone + "\">" +
          "<div class=\"scene-family-head\">" +
          "<div>" +
          (kicker ? "<div class=\"scene-family-kicker\">" + ctx.html.inline(kicker) + "</div>" : "") +
          "<h3>" + ctx.html.inline(title) + "</h3>" +
          "</div>" +
          (total ? "<div class=\"scene-family-total\">" + ctx.html.inline(total) + (totalUnit ? "<small>" + ctx.html.inline(totalUnit) + "</small>" : "") + "</div>" : "") +
          "</div>" +
          nested.map((item) => sceneItem(ctx, item)).join("") +
          "</div>",
      );
    }

    if (cards.length === 0) return "";
    return "<div class=\"scene-family-grid\">" + cards.join("") + "</div>";
  },
});
