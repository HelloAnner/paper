/**
 * 内联富文本：把数据里的一行文字解析成"带样式的片段"。
 *
 * 为什么自己定义语法而不收 HTML：
 *   1. 数据来自 AI，写 **加粗**、\`代码\`、==强调== 比写 HTML 稳，也不会引入注入问题；
 *   2. 三个 kit（docx/pdf/html）共享同一份解析结果，排版风格才能一致。
 *
 * 语法（可嵌套，例如 **结论：==关键数字== 要突出**）：
 *   **粗体**
 *   \`行内代码\`      -> docx 用等宽字体；pdf 用浅色底；html 用 <code>
 *   ==绿色强调==      -> 原设计里的 .can-do：绿色加粗，用来点亮结论句
 *
 * 解析用"栈"而不是正则：原文档里存在 <strong>…<span class="can-do">…</span>…</strong>
 * 这种嵌套，正则只能匹配最外层，会把内层的 == 当普通文本漏出去。
 */

export interface InlineRun {
  text: string;
  bold?: boolean;
  code?: boolean;
  accent?: boolean;
}

const MARKERS = ["**", "==", "\`"] as const;

/** 解析一行文字；没有标记时返回单个片段。 */
export function parseInline(text: unknown): InlineRun[] {
  const value = String(text ?? "");
  if (value.length === 0) return [];

  const runs: InlineRun[] = [];
  const stack: string[] = [];
  let buffer = "";

  const style = (): { bold?: boolean; code?: boolean; accent?: boolean } => {
    const accent = stack.includes("==");
    return {
      bold: accent || stack.includes("**") ? true : undefined,
      code: stack.includes("\`") ? true : undefined,
      accent: accent || undefined,
    };
  };
  const flush = (): void => {
    if (buffer.length === 0) return;
    runs.push({ text: buffer, ...style() });
    buffer = "";
  };

  let index = 0;
  while (index < value.length) {
    const marker = MARKERS.find((candidate) => value.startsWith(candidate, index));
    if (marker) {
      const openAt = stack.lastIndexOf(marker);
      // 闭合标记一定生效；开启标记要求后面还有同类标记，否则按普通字符处理
      // （例如正文里的单个 * 或未配对的 ==）
      const isCloser = openAt >= 0;
      const hasCloserAhead = value.indexOf(marker, index + marker.length) >= 0;
      if (isCloser || hasCloserAhead) {
        flush();
        if (isCloser) stack.splice(openAt, 1);
        else stack.push(marker);
        index += marker.length;
        continue;
      }
    }
    buffer += value[index];
    index += 1;
  }
  flush();

  return runs.length > 0 ? runs : [{ text: value }];
}

/** 去掉标记，只留纯文本（目录、长度估算用）。 */
export function plainText(text: unknown): string {
  return parseInline(text)
    .map((run) => run.text)
    .join("");
}

/** 是否含内联样式（决定要不要走富文本渲染路径）。 */
export function hasInlineMarkup(text: unknown): boolean {
  return parseInline(text).some((run) => run.bold || run.code || run.accent);
}
