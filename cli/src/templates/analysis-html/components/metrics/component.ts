import { defineComponent } from "../../../../core/types";

/**
 * 卡片与指标类块：metrics / flow / tags / kpis / stackedBar / proofs / steps / stats。
 * 图表卡（chart-panel）和归因卡（attribution-panel）由 charts 的 panel 块负责，这里只出内容本身。
 */

/** 语义色名 -> CSS 变量；#hex 与 var(...) 原样透传。 */
function colorOf(color: unknown): string {
  const value = String(color ?? "").trim();
  if (!value) return "var(--blue)";
  if (value.startsWith("#")) return value;
  if (["green", "red", "amber", "blue"].includes(value)) return "var(--" + value + ")";
  return value;
}

/** 只接受设计里存在的语义色，其它值一律当"无色"处理。 */
function toneOf(tone: unknown, allowed: string[]): string {
  const value = String(tone ?? "").trim();
  return allowed.includes(value) ? value : "";
}

function objectItems(value: unknown): Record<string, any>[] {
  const list: unknown[] = Array.isArray(value) ? value : [];
  return list.filter((item): item is Record<string, any> => Boolean(item) && typeof item === "object");
}

/** 某类块是否出现在任意章节里 —— 可选组件靠它决定参不参与渲染。 */
function hasBlock(data: Record<string, any>, types: string[]): boolean {
  const sections: Record<string, any>[] = Array.isArray(data.sections) ? data.sections : [];
  return sections.some((section) => Array.isArray(section?.blocks) && section.blocks.some((block: Record<string, any>) => types.includes(String(block?.type ?? ""))));
}

export default defineComponent({
  meta: {
    id: "metrics",
    name: "指标卡",
    order: 40,
    optional: true,
    description: "指标卡网格、行为链路卡、字段标签、归因 KPI、堆叠条、证明卡（proof-grid）、路线步骤（roadmap）、占比分布行（distribution-line）",
    useWhen: "blocks 里出现 metrics / flow / tags / kpis / stackedBar / proofs / steps / stats 时自动出现",
    when: (data) => hasBlock(data, ["metrics", "flow", "tags", "kpis", "stackedBar", "proofs", "steps", "stats"]),
  },

  render(): string {
    return "";
  },

  renderBlock(ctx, block): string {
    const type = String(block?.type ?? "");

    if (type === "metrics") {
      const items = objectItems(block.items);
      if (items.length === 0) return "";
      const columns = Number(block.columns ?? 5) || 5;
      const preset = columns === 2 || columns === 3 || columns === 5;
      const cls = preset ? "grid grid-" + columns : "grid";
      // CSS 只内置 2/3/5 列，其它列数用行内 grid-template-columns 兜底
      const style = preset ? "" : " style=\"grid-template-columns:repeat(" + columns + ",minmax(0,1fr))\"";
      return (
        "<div class=\"" + cls + "\"" + style + ">" +
        items
          .map((item) => {
            const tone = toneOf(item.tone, ["green", "red", "amber", "blue"]);
            const label = String(item.label ?? "").trim();
            const unit = String(item.unit ?? "").trim();
            const desc = String(item.desc ?? "").trim();
            return (
              "<div class=\"card metric" + (tone ? " " + tone : "") + "\">" +
              (label ? "<div class=\"label\">" + ctx.html.inline(label) + "</div>" : "") +
              "<div class=\"value\">" + ctx.html.inline(item.value ?? "") + (unit ? "<small>" + ctx.html.inline(unit) + "</small>" : "") + "</div>" +
              (desc ? "<div class=\"desc\">" + ctx.html.inline(desc) + "</div>" : "") +
              "</div>"
            );
          })
          .join("") +
        "</div>"
      );
    }

    if (type === "flow") {
      const items = objectItems(block.items);
      if (items.length === 0) return "";
      const aria = String(block.aria ?? "").trim();
      const note = String(block.note ?? "").trim();
      const cells: string[] = [];
      items.forEach((item, index) => {
        if (index > 0) {
          // connect 写在"后一项"上，表示这一格与上一格之间的连接标签（原文档是 75.0% / 73.2%）
          const connect = String(item.connect ?? item.connector ?? "").trim() || "→";
          cells.push("<div class=\"flow-connector\"><span>" + ctx.html.inline(connect) + "</span></div>");
        }
        const desc = String(item.desc ?? "").trim();
        cells.push(
          "<div class=\"flow-card" + (item.final === true ? " final" : "") + "\">" +
            "<div class=\"num\">" + ctx.html.inline(item.num ?? "") + "</div>" +
            "<div class=\"count\">" + ctx.html.inline(item.count ?? "") + "</div>" +
            "<div class=\"label\">" + ctx.html.inline(item.label ?? "") + "</div>" +
            (desc ? "<div class=\"desc\">" + ctx.html.inline(desc) + "</div>" : "") +
            "</div>",
        );
      });
      return (
        "<div class=\"flow-row\"" + (aria ? " role=\"img\" aria-label=\"" + ctx.html.inline(aria) + "\"" : "") + ">" +
        cells.join("") +
        "</div>" +
        (note ? "<p class=\"flow-note\">" + ctx.html.inline(note) + "</p>" : "")
      );
    }

    if (type === "tags") {
      const raw: unknown[] = Array.isArray(block.items) ? block.items : [];
      const list = raw
        .map((item) => (item && typeof item === "object" ? { text: String((item as any).text ?? ""), none: (item as any).none === true } : { text: String(item ?? ""), none: false }))
        .filter((item) => item.none || item.text.trim().length > 0);
      if (list.length === 0) return "";
      return (
        "<div class=\"field-tags\">" +
        list
          .map((item) => {
            const text = item.none && item.text.trim().length === 0 ? "无" : ctx.html.inline(item.text);
            return "<span class=\"field-tag" + (item.none ? " none" : "") + "\">" + text + "</span>";
          })
          .join("") +
        "</div>"
      );
    }

    if (type === "kpis") {
      const items = objectItems(block.items);
      if (items.length === 0) return "";
      return (
        "<div class=\"attribution-kpis\">" +
        items
          .map((item) => {
            const tone = toneOf(item.tone, ["good", "bad"]);
            return (
              "<div class=\"attribution-kpi" + (tone ? " " + tone : "") + "\">" +
              "<strong>" + ctx.html.inline(item.value ?? "") + "</strong>" +
              "<span>" + ctx.html.inline(item.label ?? "") + "</span>" +
              "</div>"
            );
          })
          .join("") +
        "</div>"
      );
    }

    if (type === "stackedBar") {
      const items = objectItems(block.items);
      if (items.length === 0) return "";
      const aria = String(block.aria ?? "").trim();
      const spans = items
        .map((item) => {
          const percent = Math.min(100, Math.max(0, Number(item.percent ?? 0) || 0));
          return "<span style=\"width:" + percent + "%;background:" + colorOf(item.color) + "\"></span>";
        })
        .join("");
      return "<div class=\"stacked-bar\"" + (aria ? " aria-label=\"" + ctx.html.inline(aria) + "\"" : "") + ">" + spans + "</div>";
    }

    if (type === "proofs") {
      const items = objectItems(block.items);
      if (items.length === 0) return "";
      return (
        "<div class=\"proof-grid\">" +
        items
          .map((item) => {
            const tone = toneOf(item.tone, ["green", "red", "amber", "blue"]);
            const label = String(item.label ?? "").trim();
            const unit = String(item.unit ?? "").trim();
            const text = String(item.text ?? "").trim();
            return (
              "<div class=\"proof-card" + (tone ? " " + tone : "") + "\">" +
              (label ? "<div class=\"proof-label\">" + ctx.html.inline(label) + "</div>" : "") +
              "<div class=\"proof-value\">" + ctx.html.inline(item.value ?? "") + (unit ? "<small>" + ctx.html.inline(unit) + "</small>" : "") + "</div>" +
              (text ? "<p>" + ctx.html.inline(text) + "</p>" : "") +
              "</div>"
            );
          })
          .join("") +
        "</div>"
      );
    }

    if (type === "steps") {
      const items = objectItems(block.items);
      if (items.length === 0) return "";
      return (
        "<div class=\"roadmap\">" +
        items
          .map((item) => {
            const phase = String(item.phase ?? "").trim();
            const title = String(item.title ?? "").trim();
            const text = String(item.text ?? "").trim();
            return (
              "<div class=\"roadmap-step\">" +
              (phase ? "<div class=\"phase\">" + ctx.html.inline(phase) + "</div>" : "") +
              (title ? "<h3>" + ctx.html.inline(title) + "</h3>" : "") +
              (text ? "<p>" + ctx.html.inline(text) + "</p>" : "") +
              "</div>"
            );
          })
          .join("") +
        "</div>"
      );
    }

    if (type === "stats") {
      const items = objectItems(block.items);
      if (items.length === 0) return "";
      return (
        // distribution-line 原本长在 .concentration-copy 里，独立成块时补一点下间距，免得贴住下一个标题
        "<div class=\"distribution-line\" style=\"margin-bottom:22px\">" +
        items
          .map((item) => "<div><strong>" + ctx.html.inline(item.value ?? "") + "</strong><span>" + ctx.html.inline(item.label ?? "") + "</span></div>")
          .join("") +
        "</div>"
      );
    }

    return "";
  },
});
