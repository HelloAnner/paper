import { defineComponent } from "../../../../core/types";

/**
 * 文字与结论类块：h3 / p / list / sub / callout / banner / note。
 * 行内用 html-kit 的 inline()：**粗体**、单反引号代码、==强调==。
 * 原始 CSS 里没有 .can-do（原文档也没用过强调标记），这里用行内色把它补成设计里的绿，
 * 避免动模板 CSS。
 */
function inline(ctx: any, text: unknown): string {
  return ctx.html
    .inline(text)
    .replace(/class="can-do"/g, "class=\"can-do\" style=\"color:var(--green);font-weight:600\"");
}

const TONES = ["green", "red", "amber", "blue"];

/** callout 的纯色底框（tone 靠行内色切换，CSS 保持原样）。 */
const CALLOUT_STYLE: Record<string, string> = {
  green: "background:var(--green-bg);border-color:var(--green-border)",
  red: "background:var(--red-bg);border-color:var(--red-border)",
  amber: "background:var(--amber-bg);border-color:var(--amber-border)",
  blue: "background:var(--blue-bg);border-color:var(--blue-border)",
};

/** priority 卡片的档位：原 CSS 只有 p0/p1/p2，顺手接受语义色方便 converter 直传。 */
const PRIORITY_LEVELS: Record<string, string> = {
  p0: "p0",
  p1: "p1",
  p2: "p2",
  red: "p0",
  amber: "p1",
  blue: "p2",
};

/** 成组卡片的外层栅格：insight 三列、priority 1.2/1.2/1/1，缺省卡片组按 columns。 */
const CARD_GRIDS: Record<string, string> = {
  insight: "insight-grid",
  priority: "priority-grid",
};

/**
 * 卡片式结论框：三种类名对应原 CSS 里三套互不通用的样式，内部结构也不同。
 *   insight  -> .insight-card（kicker=.signal / h3 / p）
 *   priority -> .priority-card.pN（kicker=.rank / h3 / p）
 *   缺省      -> .card.<tone>（kicker=.metric.label / .chart-title / p）
 */
function card(ctx: any, item: Record<string, any>, variant: string): string {
  const tone = String(item.tone ?? "").trim();
  const kicker = String(item.kicker ?? "").trim();
  const title = String(item.title ?? "").trim();
  const text = String(item.text ?? "").trim();
  if (!kicker && !title && !text) return "";

  if (variant === "insight") {
    return (
      "<div class=\"insight-card\">" +
      (kicker ? "<div class=\"signal\">" + inline(ctx, kicker) + "</div>" : "") +
      (title ? "<h3>" + inline(ctx, title) + "</h3>" : "") +
      (text ? "<p>" + inline(ctx, text) + "</p>" : "") +
      "</div>"
    );
  }

  if (variant === "priority") {
    const level = PRIORITY_LEVELS[tone] ?? "";
    return (
      "<div class=\"priority-card" + (level ? " " + level : "") + "\">" +
      (kicker ? "<div class=\"rank\">" + inline(ctx, kicker) + "</div>" : "") +
      (title ? "<h3>" + inline(ctx, title) + "</h3>" : "") +
      (text ? "<p>" + inline(ctx, text) + "</p>" : "") +
      "</div>"
    );
  }

  const cls = TONES.includes(tone) ? " " + tone : "";
  return (
    "<div class=\"card" + cls + "\">" +
    (kicker ? "<div class=\"metric label\">" + inline(ctx, kicker) + "</div>" : "") +
    (title ? "<div class=\"chart-title\">" + inline(ctx, title) + "</div>" : "") +
    (text ? "<p style=\"font-size:12px;margin-top:7px\">" + inline(ctx, text) + "</p>" : "") +
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
    id: "prose",
    name: "正文",
    order: 30,
    description: "小节标题（h3）、段落、列表、小节标签（sub-label）、结论框（callout 底框 / callout 卡片）、醒目标语（banner）、口径提示（note）",
    useWhen: "所有报告都要用：承载叙述文字与结论块",
    when: (data) => hasBlock(data, ["h3", "p", "list", "sub", "callout", "banner", "note"]),
  },

  render(): string {
    return "";
  },

  renderBlock(ctx, block): string {
    const type = String(block?.type ?? "");

    if (type === "h3") {
      const text = String(block.text ?? "").trim();
      return text ? "<h3>" + inline(ctx, text) + "</h3>" : "";
    }

    if (type === "p") {
      const text = String(block.text ?? "");
      return text.trim().length > 0 ? "<p>" + inline(ctx, text) + "</p>" : "";
    }

    if (type === "list") {
      const items: unknown[] = Array.isArray(block.items) ? block.items : [];
      const list = items.map((item) => String(item ?? "")).filter((item) => item.trim().length > 0);
      if (list.length === 0) return "";
      const tag = block.ordered ? "ol" : "ul";
      // CSS 顶部有全局 reset，列表的缩进和行距在这里补上，保证正文可读
      return (
        "<" + tag + " style=\"padding-left:20px;margin:0 0 16px;line-height:1.9\">" +
        list.map((item) => "<li>" + inline(ctx, item) + "</li>").join("") +
        "</" + tag + ">"
      );
    }

    if (type === "sub") {
      const text = String(block.text ?? "").trim();
      if (!text) return "";
      const tone = String(block.tone ?? "blue");
      return "<div class=\"sub-label " + (TONES.includes(tone) ? tone : "blue") + "\"><span class=\"bar\"></span>" + inline(ctx, text) + "</div>";
    }

    if (type === "banner") {
      const mark = String(block.mark ?? "").trim() || "!";
      const title = String(block.title ?? "").trim();
      const text = String(block.text ?? "").trim();
      if (!title && !text) return "";
      return (
        "<div class=\"truth-banner\">" +
        "<div class=\"mark\">" + inline(ctx, mark) + "</div>" +
        "<div>" +
        (title ? "<strong>" + inline(ctx, title) + "</strong>" : "") +
        (text ? "<p>" + inline(ctx, text) + "</p>" : "") +
        "</div>" +
        "</div>"
      );
    }

    if (type === "note") {
      const strong = String(block.strong ?? "").trim();
      const text = String(block.text ?? "").trim();
      if (!strong && !text) return "";
      return "<div class=\"evidence-note\">" + (strong ? "<strong>" + inline(ctx, strong) + "</strong>" : "") + (text ? inline(ctx, text) : "") + "</div>";
    }

    if (type === "callout") {
      const variant = String(block.variant ?? "").trim();
      const items: Record<string, any>[] = (Array.isArray(block.items) ? block.items : []).filter((item: unknown) => Boolean(item) && typeof item === "object");

      // 给了 items：一组卡片；insight / priority 用原文档自己的栅格，缺省按 columns
      if (items.length > 0) {
        const cards = items.map((item) => card(ctx, item, variant)).filter(Boolean);
        if (cards.length === 0) return "";
        const presetGrid = CARD_GRIDS[variant];
        if (presetGrid) return "<div class=\"" + presetGrid + "\">" + cards.join("") + "</div>";
        const columns = Number(block.columns ?? 3) || 3;
        const preset = columns === 2 || columns === 3 || columns === 5;
        const cls = preset ? "grid grid-" + columns : "grid";
        const style = preset ? "" : " style=\"grid-template-columns:repeat(" + columns + ",minmax(0,1fr))\"";
        return "<div class=\"" + cls + "\"" + style + ">" + cards.join("") + "</div>";
      }

      // insight / priority 的单张卡片
      if (variant === "insight" || variant === "priority") return card(ctx, block, variant);

      // 缺省样式：给了 kicker 就是单张 .card.<tone>
      if (String(block.kicker ?? "").trim().length > 0) return card(ctx, block, "");

      // 否则是整段的纯色结论框
      const title = String(block.title ?? "").trim();
      const text = String(block.text ?? "").trim();
      if (!title && !text) return "";
      const tone = String(block.tone ?? "blue");
      return (
        "<div class=\"callout\" style=\"" + (CALLOUT_STYLE[tone] || CALLOUT_STYLE.blue) + "\">" +
        (title ? "<strong>" + inline(ctx, title) + "</strong>" : "") +
        (text ? inline(ctx, text) : "") +
        "</div>"
      );
    }

    return "";
  },
});
