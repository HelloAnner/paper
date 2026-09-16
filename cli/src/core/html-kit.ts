/**
 * html 公共件：纯字符串拼装，产出单文件 HTML（内联 CSS，可直接打印成 PDF）。
 */

import { parseInline } from "./richtext";

export interface HtmlTheme {
  accent: string;
  text: string;
  muted: string;
  border: string;
  surface: string;
  /** 页面宽度，屏幕浏览与打印共用 */
  maxWidth: string;
  fontStack: string;
}

export const DEFAULT_HTML_THEME: HtmlTheme = {
  accent: "#1f6feb",
  text: "#24292f",
  muted: "#6e7781",
  border: "#d0d7de",
  surface: "#f6f8fa",
  maxWidth: "820px",
  fontStack:
    "-apple-system, \"PingFang SC\", \"Noto Sans SC\", \"Microsoft YaHei\", \"Segoe UI\", sans-serif",
};

export function escapeHtml(text: unknown): string {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 行内富文本渲染：**粗体** / `code` / ==绿色强调==。
 * 三个模板都直接用它，保证同一份数据在 html 里的表现一致。
 */
export function renderInlineHtml(text: unknown): string {
  const runs = parseInline(text);
  return runs
    .map((run) => {
      const value = escapeHtml(run.text);
      if (run.code) return "<code>" + value + "</code>";
      if (run.accent) return "<span class=\"can-do\">" + value + "</span>";
      if (run.bold) return "<strong>" + value + "</strong>";
      return value;
    })
    .join("");
}

export interface HtmlTableOptions {
  head?: string[];
  rows: (string | number)[][];
  caption?: string;
  align?: ("left" | "center" | "right")[];
}

export class HtmlKit {
  readonly theme: HtmlTheme;

  constructor(theme: Partial<HtmlTheme> = {}) {
    this.theme = { ...DEFAULT_HTML_THEME, ...theme };
  }

  raw(html: string): string {
    return html;
  }

  /** 行内富文本：**粗体** / `code` / ==强调== */
  inline(text: unknown): string {
    return renderInlineHtml(text);
  }

  title(text: string, subtitle?: string): string {
    const sub = subtitle ? "<p class=\"subtitle\">" + escapeHtml(subtitle) + "</p>" : "";
    return "<header class=\"doc-title\"><h1>" + escapeHtml(text) + "</h1>" + sub + "</header>";
  }

  h1(text: string): string {
    return "<h2 class=\"h1\">" + escapeHtml(text) + "</h2>";
  }

  h2(text: string): string {
    return "<h3 class=\"h2\">" + escapeHtml(text) + "</h3>";
  }

  p(text: string, options: { muted?: boolean } = {}): string {
    const value = String(text ?? "").trim();
    if (!value) return "";
    const cls = options.muted ? " class=\"muted\"" : "";
    // 行内换行转 <br>，不做 markdown 解析，保持可控
    return "<p" + cls + ">" + escapeHtml(value).replace(/\n/g, "<br>") + "</p>";
  }

  meta(text: string): string {
    return "<p class=\"meta\">" + escapeHtml(text) + "</p>";
  }

  bullets(items: string[]): string {
    const list = items.filter((item) => String(item ?? "").trim().length > 0);
    if (list.length === 0) return "";
    return "<ul>" + list.map((item) => "<li>" + escapeHtml(item) + "</li>").join("") + "</ul>";
  }

  kv(rows: [string, string][]): string {
    const body = rows
      .filter(([, value]) => String(value ?? "").trim().length > 0)
      .map(
        ([label, value]) =>
          "<div class=\"kv-row\"><span class=\"kv-label\">" +
          escapeHtml(label) +
          "</span><span class=\"kv-value\">" +
          escapeHtml(value) +
          "</span></div>",
      )
      .join("");
    return body ? "<div class=\"kv\">" + body + "</div>" : "";
  }

  table(options: HtmlTableOptions): string {
    const { head, rows } = options;
    const align = options.align ?? [];
    const cellStyle = (index: number): string => {
      const value = align[index];
      return value ? " style=\"text-align:" + value + "\"" : "";
    };
    const headHtml = head
      ? "<thead><tr>" +
        head.map((cell, i) => "<th" + cellStyle(i) + ">" + escapeHtml(cell) + "</th>").join("") +
        "</tr></thead>"
      : "";
    const bodyHtml =
      "<tbody>" +
      rows
        .map(
          (row) =>
            "<tr>" +
            row.map((cell, i) => "<td" + cellStyle(i) + ">" + escapeHtml(cell) + "</td>").join("") +
            "</tr>",
        )
        .join("") +
      "</tbody>";
    const caption = options.caption ? "<caption>" + escapeHtml(options.caption) + "</caption>" : "";
    return "<table>" + caption + headHtml + bodyHtml + "</table>";
  }

  quote(text: string): string {
    return "<blockquote>" + escapeHtml(text) + "</blockquote>";
  }

  card(inner: string): string {
    return "<section class=\"card\">" + inner + "</section>";
  }

  rule(): string {
    return "<hr>";
  }

  /** 组装完整 HTML 文档，css 可覆盖默认样式。 */
  page(options: { title: string; body: string; css?: string; lang?: string }): string {
    return (
      "<!doctype html>\n<html lang=\"" + (options.lang ?? "zh-CN") + "\">\n<head>\n" +
      "<meta charset=\"utf-8\">\n" +
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n" +
      "<title>" + escapeHtml(options.title) + "</title>\n" +
      "<style>\n" + this.baseCss() + (options.css ? "\n" + options.css : "") + "\n</style>\n" +
      "</head>\n<body>\n<main class=\"paper\">\n" + options.body + "\n</main>\n</body>\n</html>\n"
    );
  }

  private baseCss(): string {
    const t = this.theme;
    return [
      ":root { --accent: " + t.accent + "; --text: " + t.text + "; --muted: " + t.muted + "; --border: " + t.border + "; --surface: " + t.surface + "; }",
      "* { box-sizing: border-box; }",
      "body { margin: 0; padding: 48px 24px; background: #fff; color: var(--text); font-family: " + t.fontStack + "; line-height: 1.75; -webkit-font-smoothing: antialiased; }",
      ".paper { max-width: " + t.maxWidth + "; margin: 0 auto; }",
      "h1 { font-size: 30px; line-height: 1.35; margin: 0 0 8px; letter-spacing: -0.01em; }",
      ".subtitle { color: var(--muted); margin: 0 0 24px; }",
      ".doc-title { border-left: 4px solid var(--accent); padding-left: 16px; margin-bottom: 28px; }",
      ".h1 { font-size: 21px; margin: 32px 0 12px; padding-bottom: 6px; border-bottom: 1px solid var(--border); }",
      ".h2 { font-size: 17px; color: var(--accent); margin: 24px 0 8px; }",
      "p { margin: 0 0 12px; }",
      ".muted, .meta { color: var(--muted); }",
      ".meta { font-size: 13px; margin: 0 0 10px; }",
      "ul { margin: 0 0 14px; padding-left: 22px; }",
      "li { margin: 4px 0; }",
      "table { width: 100%; border-collapse: collapse; margin: 8px 0 18px; font-size: 14px; }",
      "th, td { border: 1px solid var(--border); padding: 8px 10px; vertical-align: top; }",
      "th { background: var(--surface); text-align: left; font-weight: 600; }",
      "caption { caption-side: top; text-align: left; color: var(--muted); font-size: 13px; padding-bottom: 6px; }",
      ".kv { margin: 0 0 18px; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }",
      ".kv-row { display: flex; border-bottom: 1px solid var(--border); }",
      ".kv-row:last-child { border-bottom: 0; }",
      ".kv-label { flex: 0 0 30%; background: var(--surface); padding: 8px 12px; color: var(--muted); font-weight: 600; }",
      ".kv-value { padding: 8px 12px; }",
      "blockquote { margin: 0 0 16px; padding: 4px 0 4px 14px; border-left: 3px solid var(--accent); color: var(--muted); }",
      ".card { border: 1px solid var(--border); border-radius: 8px; padding: 18px 20px; margin: 0 0 20px; }",
      "hr { border: 0; border-top: 1px solid var(--border); margin: 24px 0; }",
      "@media print { body { padding: 0; } .paper { max-width: none; } @page { size: A4; margin: 20mm; } }",
    ].join("\n");
  }
}

export function createHtmlKit(theme?: Partial<HtmlTheme>): HtmlKit {
  return new HtmlKit(theme);
}
