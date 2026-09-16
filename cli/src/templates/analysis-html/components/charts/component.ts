import { defineComponent } from "../../../../core/types";
import { ownerOf } from "../../blocks";

/**
 * 图表类块：bars（排行条形）/ dualBars（双指标）/ reasons（原因行）/ heatmap（热力网格）
 * / donut（环形占比）/ panel（chart-panel 与 attribution-panel 卡片容器）。
 * 图表卡片的标题、副标题统一由 panel 提供，条形图这些块只出内容本身。
 */

/** 环形图默认蓝系三段，剩余部分用 --surface-alt 兜底（和原 CSS 的写死值一致）。 */
const DONUT_COLORS = ["var(--blue)", "#7595EB", "#ABC0F5"];

function colorOf(color: unknown): string {
  const value = String(color ?? "").trim();
  if (!value) return "var(--blue)";
  if (value.startsWith("#")) return value;
  if (["green", "red", "amber", "blue"].includes(value)) return "var(--" + value + ")";
  return value;
}

function objectItems(value: unknown): Record<string, any>[] {
  const list: unknown[] = Array.isArray(value) ? value : [];
  return list.filter((item): item is Record<string, any> => Boolean(item) && typeof item === "object");
}

function ariaAttr(ctx: any, block: Record<string, any>): string {
  const aria = String(block.aria ?? "").trim();
  return aria ? " role=\"img\" aria-label=\"" + ctx.html.inline(aria) + "\"" : "";
}

/** 省略 levels 时按全表最大值分 5 档：0 恒为 heat-0，其余 ceil(值/最大值*4)。 */
function autoLevel(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((value / max) * 4)));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** panel 里的内部块仍走 ctx.renderBlock，-c 选择不到时自然为空。 */
async function renderInner(ctx: any, value: unknown): Promise<string> {
  const parts: string[] = [];
  for (const child of objectItems(value)) {
    const owner = ownerOf(child.type);
    if (!owner) {
      ctx.log("panel 内出现未知块类型 " + String(child.type ?? "") + "，已跳过");
      continue;
    }
    const html = await ctx.renderBlock(owner, child);
    if (html) parts.push(String(html));
  }
  return parts.join("");
}

async function chartPanel(ctx: any, spec: Record<string, any>): Promise<string> {
  const title = String(spec.title ?? "").trim();
  const subtitle = String(spec.subtitle ?? "").trim();
  const inner = await renderInner(ctx, spec.blocks);
  return (
    "<div class=\"chart-panel\">" +
    (title ? "<div class=\"chart-title\">" + ctx.html.inline(title) + "</div>" : "") +
    (subtitle ? "<div class=\"chart-subtitle\">" + ctx.html.inline(subtitle) + "</div>" : "") +
    inner +
    "</div>"
  );
}

async function attributionPanel(ctx: any, spec: Record<string, any>): Promise<string> {
  const step = String(spec.step ?? "").trim();
  const title = String(spec.title ?? "").trim();
  const text = String(spec.text ?? "").trim();
  const inner = await renderInner(ctx, spec.blocks);
  return (
    "<div class=\"attribution-panel\">" +
    (step ? "<div class=\"step\">" + ctx.html.inline(step) + "</div>" : "") +
    (title ? "<h3>" + ctx.html.inline(title) + "</h3>" : "") +
    (text ? "<p>" + ctx.html.inline(text) + "</p>" : "") +
    inner +
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
    id: "charts",
    name: "图表",
    order: 50,
    optional: true,
    description: "排行条形图、双指标对比（使用范围 / 受阻）、原因行、热力网格、环形占比，以及 chart-panel / attribution-panel 卡片容器",
    useWhen: "blocks 里出现 bars / dualBars / reasons / heatmap / donut / panel 时自动出现",
    when: (data) => hasBlock(data, ["bars", "dualBars", "reasons", "heatmap", "donut", "panel"]),
  },

  render(): string {
    return "";
  },

  async renderBlock(ctx, block): Promise<string> {
    const type = String(block?.type ?? "");

    if (type === "panel") {
      const variant = String(block.variant ?? "chart").trim();
      if (variant === "attribution") {
        const items = objectItems(block.items);
        // items 形式：原文档的 .attribution-grid 是两列，放一组归因卡
        if (items.length > 0) {
          const panels = await Promise.all(items.map((item) => attributionPanel(ctx, item)));
          const body = panels.filter(Boolean).join("");
          return items.length > 1 ? "<div class=\"attribution-grid\">" + body + "</div>" : body;
        }
        return attributionPanel(ctx, block);
      }
      return chartPanel(ctx, block);
    }

    if (type === "bars") {
      const items = objectItems(block.items);
      if (items.length === 0) return "";
      const rows = items
        .map((item) => {
          const sub = String(item.sub ?? "").trim();
          const percent = Math.min(100, Math.max(0, Number(item.percent ?? 0) || 0));
          const tone = String(item.tone ?? "").trim();
          const fill = ["green", "red", "amber", "blue"].includes(tone) ? "bar-fill " + tone : "bar-fill";
          const number = String(item.number ?? "").trim();
          const unit = String(item.unit ?? "").trim();
          return (
            "<div class=\"bar-row\">" +
            "<div class=\"name\">" + ctx.html.inline(item.name ?? "") + (sub ? "<small>" + ctx.html.inline(sub) + "</small>" : "") + "</div>" +
            "<div class=\"bar-track\"><div class=\"" + fill + "\" style=\"width:" + percent + "%\"></div></div>" +
            "<div class=\"number\">" + (number ? "<strong>" + ctx.html.inline(number) + "</strong>" : "") + (unit ? "<small>" + ctx.html.inline(unit) + "</small>" : "") + "</div>" +
            "</div>"
          );
        })
        .join("");
      return "<div class=\"bar-chart\"" + ariaAttr(ctx, block) + ">" + rows + "</div>";
    }

    if (type === "dualBars") {
      const items = objectItems(block.items);
      if (items.length === 0) return "";
      const rows = items
        .map((item) => {
          const bars = objectItems(item.bars)
            .map((bar) => {
              const tone = ["blue", "red", "green", "amber"].includes(String(bar.tone ?? "")) ? String(bar.tone) : "blue";
              const percent = Math.min(100, Math.max(0, Number(bar.percent ?? 0) || 0));
              return (
                "<div class=\"dual-metric\">" +
                "<div class=\"dual-head\"><span>" + ctx.html.inline(bar.label ?? "") + "</span><strong>" + ctx.html.inline(bar.value ?? "") + "</strong></div>" +
                "<div class=\"track\"><div class=\"fill " + tone + "\" style=\"width:" + percent + "%\"></div></div>" +
                "</div>"
              );
            })
            .join("");
          return "<div class=\"blocker-row\"><div class=\"blocker-name\">" + ctx.html.inline(item.name ?? "") + "</div>" + bars + "</div>";
        })
        .join("");
      return "<div class=\"blocker-chart\"" + ariaAttr(ctx, block) + ">" + rows + "</div>";
    }

    if (type === "reasons") {
      const items = objectItems(block.items);
      if (items.length === 0) return "";
      return (
        "<div class=\"reason-list\">" +
        items
          .map((item) => "<div class=\"reason-row\"><span>" + ctx.html.inline(item.label ?? "") + "</span><strong>" + ctx.html.inline(item.value ?? "") + "</strong></div>")
          .join("") +
        "</div>"
      );
    }

    if (type === "heatmap") {
      const columns: unknown[] = Array.isArray(block.columns) ? block.columns : [];
      const rows = objectItems(block.rows);
      if (columns.length === 0 || rows.length === 0) return "";

      let max = 0;
      for (const row of rows) {
        for (const value of Array.isArray(row.values) ? row.values : []) max = Math.max(max, Number(value) || 0);
      }

      const cells: string[] = ["<div class=\"heat-cell heat-head\"></div>"];
      for (const column of columns) cells.push("<div class=\"heat-cell heat-head\">" + ctx.html.inline(column) + "</div>");
      for (const row of rows) {
        cells.push("<div class=\"heat-cell heat-label\">" + ctx.html.inline(row.label ?? "") + "</div>");
        columns.forEach((_, index) => {
          const values: unknown[] = Array.isArray(row.values) ? row.values : [];
          const value = Number(values[index] ?? 0) || 0;
          const levels: unknown[] = Array.isArray(row.levels) ? row.levels : [];
          const level = levels.length > 0 ? Math.min(4, Math.max(0, Number(levels[index] ?? 0) || 0)) : autoLevel(value, max);
          cells.push("<div class=\"heat-cell heat-" + level + "\">" + value + "</div>");
        });
      }
      // CSS 的 .heatmap 写死了 5 列，列数不同时用行内 grid-template-columns 覆盖
      const grid = "<div class=\"heatmap\" style=\"grid-template-columns:220px repeat(" + columns.length + ",1fr)\" " + ariaAttr(ctx, block).trim() + ">" + cells.join("") + "</div>";
      return "<div class=\"heatmap-wrap\">" + grid + "</div>";
    }

    if (type === "donut") {
      const segments = objectItems(block.segments);
      const stops: string[] = [];
      let acc = 0;
      segments.forEach((segment, index) => {
        if (acc >= 100) return;
        const percent = Math.min(100, Math.max(0, Number(segment.percent ?? 0) || 0));
        if (percent <= 0) return;
        const from = round2(acc);
        const to = Math.min(100, round2(acc + percent));
        const color = segment.color ? colorOf(segment.color) : DONUT_COLORS[Math.min(index, DONUT_COLORS.length - 1)];
        stops.push(color + " " + from + "% " + to + "%");
        acc = to;
      });
      if (stops.length === 0) return "";
      // 剩余部分用底色补满，环才不会出现透明缺口
      if (acc < 100) stops.push("var(--surface-alt) " + round2(acc) + "% 100%");

      const inside = block.inside && typeof block.inside === "object" ? (block.inside as Record<string, any>) : {};
      const value = String(inside.value ?? "").trim();
      const label = String(inside.label ?? "").trim();
      const circle =
        "<div class=\"donut\" style=\"background:conic-gradient(" + stops.join(",") + ")\">" +
        (value || label ? "<div class=\"inside\">" + (value ? "<strong>" + ctx.html.inline(value) + "</strong>" : "") + (label ? "<span>" + ctx.html.inline(label) + "</span>" : "") + "</div>" : "") +
        "</div>";

      const title = String(block.title ?? "").trim();
      const text = String(block.text ?? "").trim();
      if (!title && !text) return circle;
      // 原文档这张卡是 .chart-panel.concentration：左边环，右边文案
      return (
        "<div class=\"chart-panel concentration\">" + circle +
        "<div class=\"concentration-copy\">" +
        (title ? "<h3>" + ctx.html.inline(title) + "</h3>" : "") +
        (text ? "<p>" + ctx.html.inline(text) + "</p>" : "") +
        "</div></div>"
      );
    }

    return "";
  },
});
