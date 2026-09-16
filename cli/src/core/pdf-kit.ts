/**
 * pdf 公共件：一个够用的"排版引擎"。
 *
 * 为什么不用 pdfkit：它依赖标准字体的 AFM 数据文件，bun --compile 之后
 * 找不到模块；pdf-lib + @pdf-lib/fontkit 是纯 JS，能直接把 OTF/TTF 嵌进 PDF
 * 并按实际用到的字形做子集化（中文文档 50KB 左右）。
 *
 * 能力：
 *   - A4 页面、页边距、页眉页脚（页码）
 *   - 中英混排换行（CJK 逐字断行，西文按单词断行）
 *   - 标题 / 正文 / 列表 / 键值对 / 表格 / 引用 / 分隔线 / 分页
 *   - 表格跨页自动重画表头
 *
 * 模板拿到 builder 后按顺序调用方法即可，y 游标自动往下走。
 */

import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import { renderError } from "./errors";
import { resolveFonts } from "./fonts";
import { shouldSubset, subsetFont } from "./ttf";

export interface PdfTheme {
  accent: RGB;
  text: RGB;
  muted: RGB;
  border: RGB;
  surface: RGB;
  titleSize: number;
  subtitleSize: number;
  h1Size: number;
  h2Size: number;
  h3Size: number;
  bodySize: number;
  smallSize: number;
  tableSize: number;
  /** 行高倍数 */
  lineFactor: number;
}

export const DEFAULT_PDF_THEME: PdfTheme = {
  accent: rgb(0.12, 0.44, 0.92),
  text: rgb(0.14, 0.16, 0.18),
  muted: rgb(0.43, 0.47, 0.5),
  border: rgb(0.82, 0.85, 0.88),
  surface: rgb(0.96, 0.97, 0.98),
  titleSize: 26,
  subtitleSize: 13,
  h1Size: 17,
  h2Size: 13.5,
  h3Size: 12,
  bodySize: 10.5,
  smallSize: 9,
  tableSize: 9.5,
  lineFactor: 1.65,
};

export interface PdfInitOptions {
  size?: "A4" | "LETTER";
  /** 页边距，单位 pt（56pt ≈ 20mm） */
  margin?: number;
  header?: string;
  footer?: string;
  /** 右下角页码，默认 true */
  pageNumber?: boolean;
  /**
   * true = 第 1 页是封面：封面不画页眉页脚，页码从第 2 页开始算第 1 页。
   * 有封面组件的模板请打开它（否则封面底部会出现两行页脚）。
   */
  cover?: boolean;
  title?: string;
  author?: string;
  theme?: Partial<PdfTheme>;
}

export interface TextBlockOptions {
  size?: number;
  color?: RGB;
  bold?: boolean;
  align?: "left" | "center" | "right";
  indent?: number;
  spaceBefore?: number;
  spaceAfter?: number;
  font?: PDFFont;
}

export interface PdfTableOptions {
  head?: string[];
  rows: (string | number)[][];
  widths?: number[];
  align?: ("left" | "center" | "right")[];
  caption?: string;
  fontSize?: number;
  zebra?: boolean;
  borders?: boolean;
  headFill?: RGB;
}

/**
 * 嵌入时统一关掉 locl 特性。
 * Noto Sans SC 的 locl 会把 "3.2" 里的数字换成另一套字形（CJK 本地化形式），
 * 结果就是排版和字形集合对不上、间距也怪；关掉后 layout 结果 == cmap 映射，
 * 稳定可预测（这也是子集化能精确工作的前提）。
 */
export const PDF_FONT_FEATURES: Record<string, boolean> = { locl: false };

/** 已经准备好的字体字节（第二遍渲染时传入子集）。 */
export interface PdfFontBytes {
  regular: Uint8Array;
  bold: Uint8Array;
}

interface DrawTextOptions {
  x: number;
  y: number;
  size: number;
  font: PDFFont;
  color: RGB;
}

const PAGE_SIZES: Record<string, [number, number]> = {
  A4: [595.28, 841.89],
  LETTER: [612, 792],
};

function isWideChar(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0;
  return (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0x303e) ||
    (cp >= 0x3041 && cp <= 0x33ff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0xa000 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe6f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f300 && cp <= 0x1f9ff)
  );
}

interface MeasuredRow {
  cells: string[][];
  height: number;
  isHead: boolean;
}

export class PdfBuilder {
  private readonly doc: PDFDocument;
  private readonly pages: PDFPage[] = [];
  private page: PDFPage;
  private readonly width: number;
  private readonly height: number;
  private readonly margin: number;
  private readonly contentTop: number;
  private readonly contentBottom: number;
  private readonly footerReserve = 30;
  private readonly headerText?: string;
  private footerText?: string;
  private readonly showPageNumber: boolean;
  private readonly theme: PdfTheme;
  private fontRegular!: PDFFont;
  private fontBold!: PDFFont;
  private readonly coverPage: boolean;
  private y = 0;
  /** 记录每一段真正画到页面上的文本，用于第二遍做字体子集 */
  private readonly usedRegular = new Set<string>();
  private readonly usedBold = new Set<string>();

  readonly contentWidth: number;

  constructor(doc: PDFDocument, options: PdfInitOptions = {}) {
    this.doc = doc;
    const [w, h] = PAGE_SIZES[options.size ?? "A4"] ?? PAGE_SIZES.A4!;
    this.width = w;
    this.height = h;
    this.margin = options.margin ?? 56;
    this.headerText = options.header;
    this.footerText = options.footer;
    this.showPageNumber = options.pageNumber !== false;
    this.coverPage = options.cover === true;
    this.theme = { ...DEFAULT_PDF_THEME, ...(options.theme ?? {}) };
    this.contentWidth = this.width - this.margin * 2;
    this.contentTop = this.height - this.margin;
    this.contentBottom = this.margin + this.footerReserve;
    this.page = doc.addPage([this.width, this.height]);
    this.pages.push(this.page);
    this.y = this.contentTop;
  }

  /** 由 createPdf 调用，注入字体。 */
  useFonts(regular: PDFFont, bold: PDFFont): void {
    this.fontRegular = regular;
    this.fontBold = bold;
    this.drawPageHeader();
  }

  get cursor(): number {
    return this.y;
  }

  /** 模板可在 render 开头替换页脚文字（data 里的保密标识等）。 */
  setFooter(text: string): void {
    this.footerText = text;
  }

  /** 按字重分别返回绘制过的文本（子集化只需要这些字形）。 */
  getUsedTexts(): { regular: string[]; bold: string[] } {
    return { regular: [...this.usedRegular], bold: [...this.usedBold] };
  }

  /** 所有 drawText 都必须走这里，才能在保存时知道用了哪些字形。 */
  private drawText(text: string, options: DrawTextOptions): void {
    if (text && text.length > 0) {
      (options.font === this.fontBold ? this.usedBold : this.usedRegular).add(text);
    }
    this.page.drawText(text, options);
  }

  get themeRef(): PdfTheme {
    return this.theme;
  }

  get bodyFont(): PDFFont {
    return this.fontRegular;
  }

  private font(bold = false): PDFFont {
    return bold ? this.fontBold : this.fontRegular;
  }

  // ── 基础几何 ────────────────────────────────────────────

  newPage(): void {
    this.page = this.doc.addPage([this.width, this.height]);
    this.pages.push(this.page);
    this.y = this.contentTop;
    this.drawPageHeader();
  }

  private drawPageHeader(): void {
    if (!this.headerText) return;
    if (this.coverPage && this.pages.length === 1) return;
    const text = this.headerText;
    const size = this.theme.smallSize;
    this.drawText(text, {
      x: this.margin,
      y: this.height - this.margin + 16,
      size,
      font: this.fontRegular,
      color: this.theme.muted,
    });
    this.page.drawLine({
      start: { x: this.margin, y: this.height - this.margin + 10 },
      end: { x: this.width - this.margin, y: this.height - this.margin + 10 },
      thickness: 0.5,
      color: this.theme.border,
    });
  }

  /** 确保还能放下 height 高度的内容，放不下就翻页。 */
  ensure(height: number): void {
    if (this.y - height < this.contentBottom) this.newPage();
  }

  space(height: number): void {
    this.y -= height;
  }

  /** 主动分页。 */
  pageBreak(): void {
    this.newPage();
  }

  private wrap(text: string, size: number, width: number, font?: PDFFont): string[] {
    const f = font ?? this.fontRegular;
    const out: string[] = [];
    for (const rawLine of String(text ?? "").split("\n")) {
      if (rawLine.length === 0) {
        out.push("");
        continue;
      }
      const chars = Array.from(rawLine);
      let line = "";
      let lineWidth = 0;
      let i = 0;
      while (i < chars.length) {
        const ch = chars[i] as string;
        let unit = "";
        if (isWideChar(ch)) {
          unit = ch;
          i += 1;
        } else if (ch === " ") {
          unit = " ";
          i += 1;
        } else {
          while (i < chars.length) {
            const c = chars[i] as string;
            if (isWideChar(c) || c === " ") break;
            unit += c;
            i += 1;
          }
        }

        const unitWidth = f.widthOfTextAtSize(unit, size);
        if (lineWidth + unitWidth > width && lineWidth > 0) {
          out.push(line.replace(/\s+$/, ""));
          line = "";
          lineWidth = 0;
          if (unit === " ") continue;
        }
        // 单个超长单元（长英文单词/URL）按字符硬折
        let rest = unit;
        while (rest.length > 0 && f.widthOfTextAtSize(rest, size) > width) {
          let chunk = "";
          for (const c of Array.from(rest)) {
            if (chunk.length > 0 && f.widthOfTextAtSize(chunk + c, size) > width) break;
            chunk += c;
          }
          if (chunk.length === 0) break;
          out.push(chunk);
          rest = rest.slice(chunk.length);
        }
        if (rest.length === 0) continue;
        line += rest;
        lineWidth += f.widthOfTextAtSize(rest, size);
      }
      out.push(line.replace(/\s+$/, ""));
    }
    return out;
  }

  private alignX(text: string, size: number, align: "left" | "center" | "right", font?: PDFFont, width?: number): number {
    const area = width ?? this.contentWidth;
    if (align === "left") return this.margin;
    const textWidth = (font ?? this.fontRegular).widthOfTextAtSize(text, size);
    if (align === "center") return this.margin + (area - textWidth) / 2;
    return this.margin + area - textWidth;
  }

  // ── 内容块 ──────────────────────────────────────────────

  /** 通用段落：自动换行、自动翻页。 */
  textBlock(text: string, options: TextBlockOptions = {}): void {
    const size = options.size ?? this.theme.bodySize;
    const font = options.font ?? this.font(options.bold ?? false);
    const indent = options.indent ?? 0;
    const lineHeight = size * this.theme.lineFactor;
    const width = this.contentWidth - indent;
    const lines = this.wrap(text, size, width, font);

    if (options.spaceBefore) this.y -= options.spaceBefore;
    for (const line of lines) {
      this.ensure(lineHeight);
      this.y -= lineHeight;
      if (line.length > 0) {
        this.drawText(line, {
          x: this.margin + (options.align ? this.alignX(line, size, options.align, font, width) - this.margin : 0) + indent,
          y: this.y + lineHeight * 0.26,
          size,
          font,
          color: options.color ?? this.theme.text,
        });
      }
    }
    if (options.spaceAfter) this.y -= options.spaceAfter;
  }

  /** 大标题（文档首屏用）。 */
  title(text: string, options: { subtitle?: string; meta?: string[] } = {}): void {
    this.ensure(70);
    this.textBlock(text, { size: this.theme.titleSize, bold: true, spaceAfter: 6 });
    this.page.drawRectangle({
      x: this.margin,
      y: this.y + 4,
      width: 42,
      height: 2.5,
      color: this.theme.accent,
    });
    this.y -= 10;
    if (options.subtitle) {
      this.textBlock(options.subtitle, { size: this.theme.subtitleSize, color: this.theme.muted, spaceAfter: 4 });
    }
    if (options.meta && options.meta.length > 0) {
      this.textBlock(options.meta.filter(Boolean).join("    "), {
        size: this.theme.smallSize,
        color: this.theme.muted,
        spaceAfter: 6,
      });
    }
    this.y -= 6;
  }

  h1(text: string): void {
    this.ensure(this.theme.h1Size * 3);
    this.y -= 12;
    this.textBlock(text, { size: this.theme.h1Size, bold: true, spaceAfter: 6 });
    this.page.drawLine({
      start: { x: this.margin, y: this.y + 2 },
      end: { x: this.width - this.margin, y: this.y + 2 },
      thickness: 0.6,
      color: this.theme.border,
    });
    this.y -= 4;
  }

  h2(text: string): void {
    this.ensure(this.theme.h2Size * 3);
    this.y -= 8;
    this.textBlock(text, { size: this.theme.h2Size, bold: true, color: this.theme.accent, spaceAfter: 4 });
  }

  h3(text: string): void {
    this.ensure(this.theme.h3Size * 3);
    this.y -= 4;
    this.textBlock(text, { size: this.theme.h3Size, bold: true, spaceAfter: 3 });
  }

  p(text: string, options: TextBlockOptions = {}): void {
    const value = String(text ?? "").trim();
    if (!value) return;
    this.textBlock(value, { size: this.theme.bodySize, spaceAfter: 6, ...options });
  }

  /** 小号灰色说明文字。 */
  note(text: string): void {
    const value = String(text ?? "").trim();
    if (!value) return;
    this.textBlock(value, { size: this.theme.smallSize, color: this.theme.muted, spaceAfter: 6 });
  }

  bullets(items: string[], options: { ordered?: boolean } = {}): void {
    const size = this.theme.bodySize;
    const lineHeight = size * this.theme.lineFactor;
    const indent = 18;
    const list = items.map((item) => String(item ?? "").trim()).filter(Boolean);
    if (list.length === 0) return;
    this.y -= 2;
    list.forEach((item, index) => {
      const lines = this.wrap(item, size, this.contentWidth - indent);
      this.ensure(lineHeight * Math.min(lines.length, 2));
      lines.forEach((line, lineIndex) => {
        if (lineIndex > 0) this.ensure(lineHeight);
        this.y -= lineHeight;
        if (lineIndex === 0) {
          const marker = options.ordered ? String(index + 1) + "." : "•";
          this.drawText(marker, {
            x: this.margin + 2,
            y: this.y + lineHeight * 0.26,
            size,
            font: this.fontRegular,
            color: options.ordered ? this.theme.text : this.theme.accent,
          });
        }
        if (line.length > 0) {
          this.drawText(line, {
            x: this.margin + indent,
            y: this.y + lineHeight * 0.26,
            size,
            font: this.fontRegular,
            color: this.theme.text,
          });
        }
      });
    });
    this.y -= 8;
  }

  numbered(items: string[]): void {
    this.bullets(items, { ordered: true });
  }

  /** 引用块：左侧竖线 + 灰色斜体感（pdf-lib 无斜体，用灰色区分）。 */
  quote(text: string, attribution?: string): void {
    const size = this.theme.bodySize;
    const lineHeight = size * this.theme.lineFactor;
    const indent = 14;
    const lines = this.wrap(text, size, this.contentWidth - indent - 6);
    const totalHeight = lineHeight * lines.length + 10;
    this.ensure(totalHeight);
    const top = this.y;
    this.y -= 8;
    for (const line of lines) {
      this.y -= lineHeight;
      this.drawText(line, {
        x: this.margin + indent,
        y: this.y + lineHeight * 0.26,
        size,
        font: this.fontRegular,
        color: this.theme.muted,
      });
    }
    this.page.drawRectangle({
      x: this.margin,
      y: this.y + 2,
      width: 2.5,
      height: top - this.y - 2,
      color: this.theme.accent,
    });
    this.y -= 4;
    if (attribution) this.note("—— " + attribution);
    this.y -= 6;
  }

  rule(): void {
    this.ensure(18);
    this.y -= 10;
    this.page.drawLine({
      start: { x: this.margin, y: this.y },
      end: { x: this.width - this.margin, y: this.y },
      thickness: 0.6,
      color: this.theme.border,
    });
    this.y -= 10;
  }

  private measureTable(options: PdfTableOptions): { rows: MeasuredRow[]; colWidths: number[] } {
    const fontSize = options.fontSize ?? this.theme.tableSize;
    const paddingX = 7;
    const paddingY = 6;
    const lineHeight = fontSize * 1.45;
    const columnCount = Math.max(
      options.head?.length ?? 0,
      ...options.rows.map((row) => row.length),
      1,
    );
    const widths = options.widths ?? new Array(columnCount).fill(1);
    const total = widths.reduce((sum, w) => sum + w, 0) || 1;
    const colWidths = widths.map((w) => (this.contentWidth * w) / total);

    const measure = (cells: (string | number)[], isHead: boolean): MeasuredRow => {
      const wrapped = cells.map((cell, index) =>
        this.wrap(String(cell ?? ""), fontSize, Math.max((colWidths[index] ?? 0) - paddingX * 2, 10), isHead ? this.fontBold : this.fontRegular),
      );
      const maxLines = Math.max(1, ...wrapped.map((lines) => lines.length));
      return { cells: wrapped, height: maxLines * lineHeight + paddingY * 2, isHead };
    };

    const rows: MeasuredRow[] = [];
    if (options.head) rows.push(measure(options.head, true));
    for (const row of options.rows) rows.push(measure(row, false));
    return { rows, colWidths };
  }

  /** 表格：带表头、可跨页（自动重画表头）。 */
  table(options: PdfTableOptions): void {
    if (options.rows.length === 0 && !options.head) return;
    const fontSize = options.fontSize ?? this.theme.tableSize;
    const paddingX = 7;
    const paddingY = 6;
    const lineHeight = fontSize * 1.45;
    const { rows, colWidths } = this.measureTable(options);
    const headRow = rows.find((row) => row.isHead);
    const bodyRows = rows.filter((row) => !row.isHead);
    const headFill = options.headFill ?? this.theme.surface;
    const showBorders = options.borders !== false;

    if (options.caption) this.note(options.caption);
    this.y -= 4;

    const drawRow = (row: MeasuredRow, startY: number): void => {
      let x = this.margin;
      row.cells.forEach((lines, index) => {
        const colWidth = colWidths[index] ?? 0;
        const rowTop = startY;
        const rowBottom = startY - row.height;
        if (row.isHead) {
          this.page.drawRectangle({ x, y: rowBottom, width: colWidth, height: row.height, color: headFill });
        } else if (options.zebra !== false && bodyRows.indexOf(row) % 2 === 1) {
          this.page.drawRectangle({ x, y: rowBottom, width: colWidth, height: row.height, color: rgb(0.98, 0.985, 0.99) });
        }
        if (showBorders) {
          this.page.drawRectangle({
            x,
            y: rowBottom,
            width: colWidth,
            height: row.height,
            borderColor: this.theme.border,
            borderWidth: 0.5,
          });
        }
        const align = options.align?.[index] ?? "left";
        lines.forEach((line, lineIndex) => {
          if (line.length === 0) return;
          const textWidth = this.font(row.isHead).widthOfTextAtSize(line, fontSize);
          let textX = x + paddingX;
          if (align === "center") textX = x + (colWidth - textWidth) / 2;
          if (align === "right") textX = x + colWidth - paddingX - textWidth;
          this.drawText(line, {
            x: textX,
            y: rowTop - paddingY - lineHeight * (lineIndex + 1) + lineHeight * 0.28,
            size: fontSize,
            font: this.font(row.isHead),
            color: row.isHead ? this.theme.text : this.theme.text,
          });
        });
        x += colWidth;
      });
      this.y = startY - row.height;
    };

    for (const row of bodyRows) {
      const needed = row.height + (headRow ? headRow.height : 0);
      if (this.y - row.height < this.contentBottom) {
        this.newPage();
        if (headRow) drawRow({ ...headRow, cells: headRow.cells }, this.y);
      } else if (headRow && this.y - needed < this.contentBottom) {
        this.newPage();
        drawRow({ ...headRow, cells: headRow.cells }, this.y);
      }
      drawRow(row, this.y);
    }
    this.y -= 12;
  }

  /** 键值对：左列浅底标签，右列内容。 */
  kv(rows: [string, string][], options: { labelWidth?: number; fontSize?: number } = {}): void {
    const list = rows.filter(([, value]) => String(value ?? "").trim().length > 0);
    if (list.length === 0) return;
    const labelWidth = options.labelWidth ?? this.contentWidth * 0.26;
    const fontSize = options.fontSize ?? this.theme.bodySize;
    const lineHeight = fontSize * 1.5;
    const paddingX = 8;
    const paddingY = 6;

    for (const [label, value] of list) {
      const labelLines = this.wrap(label, fontSize, labelWidth - paddingX * 2, this.fontBold);
      const valueLines = this.wrap(value, fontSize, this.contentWidth - labelWidth - paddingX * 2);
      const rowHeight = Math.max(labelLines.length, valueLines.length) * lineHeight + paddingY * 2;
      this.ensure(rowHeight + 2);
      const top = this.y;
      const bottom = top - rowHeight;

      this.page.drawRectangle({ x: this.margin, y: bottom, width: labelWidth, height: rowHeight, color: this.theme.surface });
      this.page.drawRectangle({
        x: this.margin,
        y: bottom,
        width: this.contentWidth,
        height: rowHeight,
        borderColor: this.theme.border,
        borderWidth: 0.5,
      });
      this.page.drawLine({
        start: { x: this.margin + labelWidth, y: bottom },
        end: { x: this.margin + labelWidth, y: top },
        thickness: 0.5,
        color: this.theme.border,
      });

      labelLines.forEach((line, index) => {
        this.drawText(line, {
          x: this.margin + paddingX,
          y: top - paddingY - lineHeight * (index + 1) + lineHeight * 0.3,
          size: fontSize,
          font: this.fontBold,
          color: this.theme.muted,
        });
      });
      valueLines.forEach((line, index) => {
        this.drawText(line, {
          x: this.margin + labelWidth + paddingX,
          y: top - paddingY - lineHeight * (index + 1) + lineHeight * 0.3,
          size: fontSize,
          font: this.fontRegular,
          color: this.theme.text,
        });
      });
      this.y = bottom;
    }
    this.y -= 12;
  }

  /** 数字卡片行：把关键指标排成一行，pdf 模板很常用。 */
  metricCards(items: { label: string; value: string; hint?: string }[], columns = 3): void {
    const list = items.filter((item) => item && String(item.value ?? "").trim().length > 0);
    if (list.length === 0) return;
    const gap = 10;
    const cardWidth = (this.contentWidth - gap * (columns - 1)) / columns;
    const cardHeight = 54;
    for (let i = 0; i < list.length; i += columns) {
      const row = list.slice(i, i + columns);
      this.ensure(cardHeight + 10);
      const top = this.y;
      row.forEach((item, index) => {
        const x = this.margin + index * (cardWidth + gap);
        this.page.drawRectangle({ x, y: top - cardHeight, width: cardWidth, height: cardHeight, color: this.theme.surface });
        this.page.drawRectangle({
          x,
          y: top - cardHeight,
          width: cardWidth,
          height: cardHeight,
          borderColor: this.theme.border,
          borderWidth: 0.5,
        });
        this.page.drawRectangle({ x, y: top - 3, width: cardWidth, height: 3, color: this.theme.accent });
        this.drawText(String(item.label ?? ""), {
          x: x + 10,
          y: top - 20,
          size: this.theme.smallSize,
          font: this.fontRegular,
          color: this.theme.muted,
        });
        this.drawText(String(item.value ?? ""), {
          x: x + 10,
          y: top - 40,
          size: 16,
          font: this.fontBold,
          color: this.theme.text,
        });
        if (item.hint) {
          const hintWidth = this.fontRegular.widthOfTextAtSize(item.hint, this.theme.smallSize);
          this.drawText(item.hint, {
            x: x + cardWidth - 10 - hintWidth,
            y: top - 20,
            size: this.theme.smallSize,
            font: this.fontRegular,
            color: this.theme.muted,
          });
        }
      });
      this.y = top - cardHeight - gap;
    }
    this.y -= 4;
  }

  /** 封面：整页居中标题 + 元信息 + 底部说明。 */
  cover(options: { title: string; subtitle?: string; meta?: string[]; footer?: string }): void {
    const centerY = this.height * 0.62;
    const titleSize = this.theme.titleSize + 8;
    const titleLines = this.wrap(options.title, titleSize, this.contentWidth, this.fontBold);
    this.y = centerY;
    this.page.drawRectangle({ x: this.margin, y: this.y + 14, width: 56, height: 3, color: this.theme.accent });
    this.y -= 18;
    for (const line of titleLines) {
      this.y -= titleSize * 1.35;
      this.drawText(line, {
        x: this.margin,
        y: this.y + titleSize * 0.3,
        size: titleSize,
        font: this.fontBold,
        color: this.theme.text,
      });
    }
    if (options.subtitle) {
      this.y -= 26;
      for (const line of this.wrap(options.subtitle, this.theme.subtitleSize + 2, this.contentWidth)) {
        this.y -= (this.theme.subtitleSize + 2) * 1.6;
        this.drawText(line, {
          x: this.margin,
          y: this.y + 5,
          size: this.theme.subtitleSize + 2,
          font: this.fontRegular,
          color: this.theme.muted,
        });
      }
    }
    if (options.meta && options.meta.length > 0) {
      this.y -= 24;
      for (const line of options.meta.filter(Boolean)) {
        this.y -= this.theme.bodySize * 1.7;
        this.drawText(line, {
          x: this.margin,
          y: this.y + 4,
          size: this.theme.bodySize,
          font: this.fontRegular,
          color: this.theme.text,
        });
      }
    }
    if (options.footer) {
      this.drawText(options.footer, {
        x: this.margin,
        y: this.margin + 10,
        size: this.theme.smallSize,
        font: this.fontRegular,
        color: this.theme.muted,
      });
    }
  }

  // ── 输出 ────────────────────────────────────────────────

  async save(): Promise<Uint8Array> {
    this.drawFooters();
    return this.doc.save();
  }

  private drawFooters(): void {
    const skip = this.coverPage ? 1 : 0;
    const total = this.pages.length - skip;
    this.pages.forEach((page, index) => {
      if (this.coverPage && index === 0) return; // 封面不画页脚
      const label = "第 " + (index + 1 - skip) + " 页 / 共 " + total + " 页";
      if (this.footerText) {
        page.drawText(this.footerText, {
          x: this.margin,
          y: this.margin,
          size: this.theme.smallSize,
          font: this.fontRegular,
          color: this.theme.muted,
        });
      }
      if (this.showPageNumber) {
        const width = this.fontRegular.widthOfTextAtSize(label, this.theme.smallSize);
        page.drawText(label, {
          x: this.width - this.margin - width,
          y: this.margin,
          size: this.theme.smallSize,
          font: this.fontRegular,
          color: this.theme.muted,
        });
      }
      page.drawLine({
        start: { x: this.margin, y: this.margin + 14 },
        end: { x: this.width - this.margin, y: this.margin + 14 },
        thickness: 0.5,
        color: this.theme.border,
      });
    });
  }

  get raw(): PDFDocument {
    return this.doc;
  }
}

async function readFontFile(path: string): Promise<Uint8Array> {
  return new Uint8Array(await readFile(path));
}

/**
 * 根据第一遍渲染收集到的文本，生成真正的字体子集。
 * 字体本来就小（< 200KB）或不是 glyf 轮廓时返回 null，第二遍直接用原字体。
 */
export async function subsetFontsForTexts(used: {
  regular: string[];
  bold: string[];
}): Promise<PdfFontBytes | null> {
  const fonts = resolveFonts();
  const regularSource = await readFontFile(fonts.regular);
  if (!shouldSubset(regularSource)) return null;
  try {
    const regular = await subsetFont(regularSource, {
      texts: used.regular,
      features: PDF_FONT_FEATURES,
    });
    if (fonts.bold === fonts.regular) return { regular, bold: regular };
    const boldSource = await readFontFile(fonts.bold);
    const bold = await subsetFont(boldSource, { texts: used.bold, features: PDF_FONT_FEATURES });
    return { regular, bold };
  } catch (e) {
    // 子集化失败不该让文档生不出来：退回完整字体嵌入
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write("! 字体子集化失败，改用完整字体嵌入：" + msg + "\n");
    return null;
  }
}

/** 创建 pdf 构建器：负责解析字体、创建文档、注入元信息。 */
export async function createPdf(
  options: PdfInitOptions = {},
  fontBytes?: PdfFontBytes,
): Promise<PdfBuilder> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fonts = resolveFonts();
  let regular: PDFFont;
  let bold: PDFFont;
  try {
    const regularBytes = fontBytes?.regular ?? (await readFontFile(fonts.regular));
    const boldBytes =
      fontBytes?.bold ??
      (fonts.bold === fonts.regular ? regularBytes : await readFontFile(fonts.bold));
    regular = await doc.embedFont(regularBytes, {
      subset: false,
      features: PDF_FONT_FEATURES,
      customName: "PaperSans",
    });
    bold = boldBytes === regularBytes
      ? regular
      : await doc.embedFont(boldBytes, {
          subset: false,
          features: PDF_FONT_FEATURES,
          customName: "PaperSans-Bold",
        });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw renderError(
      "嵌入字体失败：" + msg,
      "确认 " + fonts.regular + " 是 ttf 单字体文件（不支持 ttc；otf 请用 make fonts 生成 ttf）",
    );
  }

  doc.setTitle(options.title ?? "paper");
  doc.setAuthor(options.author ?? "paper");
  doc.setCreator("paper");
  doc.setProducer("paper");

  const builder = new PdfBuilder(doc, options);
  builder.useFonts(regular, bold);
  return builder;
}

export { rgb, PDFDocument } from "pdf-lib";
export type { RGB, PDFFont, PDFPage } from "pdf-lib";
