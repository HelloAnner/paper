/**
 * docx 公共件：paper 所有 docx 模板都从这里取排版积木。
 *
 * 设计原则：
 *   1. 模板/组件只关心"放什么内容"，字号、间距、颜色、边框都由这里定死；
 *   2. 输出统一走 document() 组装 sectPr（A4 + 页边距 + 页眉页脚）；
 *   3. 组件 render 返回块数组（Paragraph | Table），模板负责拼装顺序。
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  LevelFormat,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  convertMillimetersToTwip,
  type IParagraphOptions,
  type IRunOptions,
  type ISectionOptions,
  type TableCell as TableCellType,
  type Table as TableType,
  type Paragraph as ParagraphType,
} from "docx";

export type DocxBlock = ParagraphType | TableType;

export interface DocxTheme {
  /** 西文字体 */
  ascii: string;
  /** 中文字体（Word 会按 eastAsia 取字） */
  cjk: string;
  mono: string;
  accent: string;
  text: string;
  muted: string;
  border: string;
  surface: string;
  /** 正文字号，半磅（21 = 10.5pt） */
  bodySize: number;
}

export const DEFAULT_DOCX_THEME: DocxTheme = {
  ascii: "Calibri",
  cjk: "微软雅黑",
  mono: "Consolas",
  accent: "1F6FEB",
  text: "24292F",
  muted: "6E7781",
  border: "D0D7DE",
  surface: "F6F8FA",
  bodySize: 21,
};

export interface TextOptions {
  size?: number;
  bold?: boolean;
  italics?: boolean;
  color?: string;
  mono?: boolean;
}

export interface ParagraphOptions {
  size?: number;
  color?: string;
  align?: "left" | "center" | "right" | "justify";
  before?: number;
  after?: number;
  indent?: number;
  keepNext?: boolean;
  border?: boolean;
}

export interface TableOptions {
  head?: string[];
  rows: (string | number)[][];
  /** 相对宽度，例如 [3, 1, 1, 1]，缺省等分 */
  widths?: number[];
  align?: ("left" | "center" | "right")[];
  zebra?: boolean;
  fontSize?: number;
  caption?: string;
}

export interface BulletItem {
  text: string;
  level?: number;
}

const ALIGN: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
};

function hex(color: string): string {
  return color.replace(/^#/, "");
}

export class DocxKit {
  readonly theme: DocxTheme;

  constructor(theme: Partial<DocxTheme> = {}) {
    this.theme = { ...DEFAULT_DOCX_THEME, ...theme };
  }

  private fontOptions(): IRunOptions["font"] {
    return {
      ascii: this.theme.ascii,
      hAnsi: this.theme.ascii,
      eastAsia: this.theme.cjk,
    } as IRunOptions["font"];
  }

  /** 底层：一段文本 -> TextRun，统一字体族。 */
  run(text: string, options: TextOptions = {}): TextRun {
    return new TextRun({
      text,
      bold: options.bold,
      italics: options.italics,
      size: options.size ?? this.theme.bodySize,
      color: hex(options.color ?? this.theme.text),
      font: options.mono
        ? { ascii: this.theme.mono, hAnsi: this.theme.mono, eastAsia: this.theme.cjk }
        : this.fontOptions(),
    });
  }

  private paragraph(children: (TextRun | string)[], options: ParagraphOptions & { numbering?: IParagraphOptions["numbering"]; borderLeft?: boolean } = {}): Paragraph {
    const runs = children.map((child) =>
      typeof child === "string" ? this.run(child, { size: options.size }) : child,
    );
    return new Paragraph({
      children: runs,
      alignment: options.align ? ALIGN[options.align] : undefined,
      numbering: options.numbering,
      keepNext: options.keepNext,
      spacing: {
        before: options.before ?? 0,
        after: options.after ?? 120,
        line: 300,
      },
      indent: options.indent ? { left: options.indent } : undefined,
      border: options.borderLeft
        ? {
            left: {
              style: BorderStyle.SINGLE,
              size: 12,
              color: hex(this.theme.accent),
              space: 12,
            },
          }
        : undefined,
    });
  }

  /** 文档大标题。 */
  title(text: string, subtitle?: string): DocxBlock[] {
    const blocks: DocxBlock[] = [
      this.paragraph([this.run(text, { size: 40, bold: true, color: this.theme.text })], {
        after: subtitle ? 40 : 200,
        keepNext: true,
        borderLeft: true,
        indent: 200,
      }),
    ];
    if (subtitle) {
      blocks.push(
        this.paragraph([this.run(subtitle, { size: 20, color: this.theme.muted })], {
          after: 240,
          indent: 200,
        }),
      );
    }
    return blocks;
  }

  h1(text: string): DocxBlock[] {
    return [
      this.paragraph([this.run(text, { size: 30, bold: true, color: this.theme.text })], {
        before: 320,
        after: 140,
        keepNext: true,
      }),
    ];
  }

  h2(text: string): DocxBlock[] {
    return [
      this.paragraph([this.run(text, { size: 25, bold: true, color: this.theme.accent })], {
        before: 240,
        after: 100,
        keepNext: true,
      }),
    ];
  }

  h3(text: string): DocxBlock[] {
    return [
      this.paragraph([this.run(text, { size: 22, bold: true, color: this.theme.text })], {
        before: 180,
        after: 80,
        keepNext: true,
      }),
    ];
  }

  /** 正文段落，自动去掉首尾空白。 */
  p(text: string, options: ParagraphOptions = {}): DocxBlock[] {
    const value = String(text ?? "").trim();
    if (!value) return [];
    return [this.paragraph([value], options)];
  }

  /** 多行文本：行内 \n 会拆成多个段落。 */
  lines(text: string, options: ParagraphOptions = {}): DocxBlock[] {
    return String(text ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => this.p(line, options));
  }

  meta(text: string): DocxBlock[] {
    const value = String(text ?? "").trim();
    if (!value) return [];
    return [this.paragraph([value], { size: 18, color: this.theme.muted, after: 80 })];
  }

  bullets(items: (string | BulletItem)[]): DocxBlock[] {
    const blocks: DocxBlock[] = [];
    for (const item of items) {
      const text = typeof item === "string" ? item : item.text;
      const level = typeof item === "string" ? 0 : item.level ?? 0;
      if (!String(text ?? "").trim()) continue;
      blocks.push(
        new Paragraph({
          children: [this.run(text)],
          numbering: { reference: "paper-bullet", level },
          spacing: { after: 60, line: 300 },
        }),
      );
    }
    return blocks;
  }

  numbered(items: string[]): DocxBlock[] {
    const blocks: DocxBlock[] = [];
    for (const item of items) {
      if (!String(item ?? "").trim()) continue;
      blocks.push(
        new Paragraph({
          children: [this.run(item)],
          numbering: { reference: "paper-number", level: 0 },
          spacing: { after: 60, line: 300 },
        }),
      );
    }
    return blocks;
  }

  /** 字段汇总：左边标签、右边值的两列无边框表。 */
  kv(rows: [string, string][], options: { labelWidth?: number; size?: number } = {}): DocxBlock[] {
    const labelWidth = options.labelWidth ?? 22;
    const size = options.size ?? this.theme.bodySize;
    const tableRows = rows
      .filter(([, value]) => String(value ?? "").trim().length > 0)
      .map(
        ([label, value]) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: labelWidth, type: WidthType.PERCENTAGE },
                margins: { top: 60, bottom: 60, left: 0, right: 120 },
                children: [this.paragraph([this.run(label, { size, bold: true, color: this.theme.muted })], { after: 0 })],
              }),
              new TableCell({
                width: { size: 100 - labelWidth, type: WidthType.PERCENTAGE },
                margins: { top: 60, bottom: 60, left: 0, right: 0 },
                children: [this.paragraph([this.run(value, { size })], { after: 0 })],
              }),
            ],
          }),
      );
    if (tableRows.length === 0) return [];
    return [this.framelessTable(tableRows)];
  }

  private framelessTable(rows: TableRow[]): TableType {
    const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
    return new Table({
      rows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
    });
  }

  table(options: TableOptions): DocxBlock[] {
    const { rows, head } = options;
    if (rows.length === 0 && !head) return [];
    const size = options.fontSize ?? this.theme.bodySize - 1;
    const widths = options.widths ?? new Array(head?.length ?? rows[0]?.length ?? 1).fill(1);
    const total = widths.reduce((sum, w) => sum + w, 0) || 1;
    const alignments = options.align ?? [];

    const buildRow = (cells: (string | number)[], isHead: boolean, zebra: boolean): TableRow =>
      new TableRow({
        tableHeader: isHead,
        children: cells.map((cell, index) => {
          const align = alignments[index] ?? "left";
          return new TableCell({
            width: { size: Math.round(((widths[index] ?? 1) / total) * 100), type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            shading: isHead
              ? { type: ShadingType.CLEAR, fill: hex(this.theme.surface), color: "auto" }
              : zebra
                ? { type: ShadingType.CLEAR, fill: "FAFBFC", color: "auto" }
                : undefined,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                alignment: ALIGN[align],
                spacing: { after: 0, line: 280 },
                children: [
                  this.run(String(cell ?? ""), {
                    size,
                    bold: isHead,
                  }),
                ],
              }),
            ],
          });
        }),
      });

    const tableRows: TableRow[] = [];
    if (head) tableRows.push(buildRow(head, true, false));
    rows.forEach((row, index) => {
      tableRows.push(buildRow(row, false, options.zebra !== false && index % 2 === 1));
    });

    const border = { style: BorderStyle.SINGLE, size: 4, color: hex(this.theme.border) };
    const table = new Table({
      rows: tableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: border,
        bottom: border,
        left: border,
        right: border,
        insideHorizontal: border,
        insideVertical: border,
      },
    });

    const blocks: DocxBlock[] = [];
    if (options.caption) blocks.push(...this.meta(options.caption));
    blocks.push(table);
    blocks.push(this.paragraph([""], { after: 120 }));
    return blocks;
  }

  /** 引用块：左侧竖线 + 灰色文字。 */
  quote(text: string, attribution?: string): DocxBlock[] {
    const blocks: DocxBlock[] = [
      this.paragraph([this.run(text, { size: this.theme.bodySize, color: this.theme.muted, italics: true })], {
        borderLeft: true,
        indent: 200,
        after: attribution ? 40 : 160,
      }),
    ];
    if (attribution) {
      blocks.push(...this.meta("—— " + attribution));
    }
    return blocks;
  }

  /** 代码/等宽块。 */
  code(lines: string | string[]): DocxBlock[] {
    const list = Array.isArray(lines) ? lines : String(lines).split("\n");
    return list.filter((l) => l.trim().length > 0).map((line) =>
      this.paragraph([this.run(line, { size: 18, mono: true, color: this.theme.text })], {
        after: 0,
        indent: 200,
      }),
    );
  }

  rule(): DocxBlock[] {
    return [
      this.paragraph([""], {
        after: 120,
        border: true,
      }),
    ];
  }

  spacer(pts = 120): DocxBlock[] {
    return [this.paragraph([""], { after: pts })];
  }

  pageBreak(): DocxBlock[] {
    return [new Paragraph({ children: [], pageBreakBefore: true })];
  }

  /** 组装 document：A4、页边距、页眉页脚、编号定义。 */
  document(
    blocks: DocxBlock[],
    options: {
      title?: string;
      author?: string;
      subject?: string;
      footer?: string;
      header?: string;
      pageNumber?: boolean;
      marginMm?: number;
    } = {},
  ): Document {
    const margin = convertMillimetersToTwip(options.marginMm ?? 22);
    const footerChildren: Paragraph[] = [];
    if (options.footer || options.pageNumber !== false) {
      footerChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 60 },
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: hex(this.theme.border), space: 6 } },
          children: [
            ...(options.footer ? [this.run(options.footer + "    ", { size: 16, color: this.theme.muted })] : []),
            ...(options.pageNumber !== false
              ? [
                  new TextRun({ children: ["第 ", PageNumber.CURRENT, " 页 / 共 ", PageNumber.TOTAL_PAGES, " 页"], size: 16, color: hex(this.theme.muted), font: this.fontOptions() }),
                ]
              : []),
          ],
        }),
      );
    }

    const section: ISectionOptions = {
      properties: {
        page: {
          size: { width: convertMillimetersToTwip(210), height: convertMillimetersToTwip(297) },
          margin: { top: margin, bottom: margin, left: margin, right: margin },
        },
      },
      headers: options.header
        ? {
            default: new Header({
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [this.run(options.header, { size: 16, color: this.theme.muted })],
                }),
              ],
            }),
          }
        : undefined,
      footers: footerChildren.length > 0 ? { default: new Footer({ children: footerChildren }) } : undefined,
      children: blocks,
    };

    return new Document({
      title: options.title,
      creator: options.author ?? "paper",
      description: options.subject,
      styles: {
        default: {
          document: {
            run: {
              size: this.theme.bodySize,
              color: hex(this.theme.text),
              font: this.fontOptions(),
            },
            paragraph: { spacing: { line: 300, after: 120 } },
          },
        },
      },
      numbering: {
        config: [
          {
            reference: "paper-bullet",
            levels: [
              {
                level: 0,
                format: LevelFormat.BULLET,
                text: "•",
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 420, hanging: 240 } }, run: { color: hex(this.theme.accent) } },
              },
              {
                level: 1,
                format: LevelFormat.BULLET,
                text: "◦",
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 780, hanging: 240 } }, run: { color: hex(this.theme.muted) } },
              },
            ],
          },
          {
            reference: "paper-number",
            levels: [
              {
                level: 0,
                format: LevelFormat.DECIMAL,
                text: "%1.",
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 420, hanging: 240 } }, run: { color: hex(this.theme.accent), bold: true } },
              },
            ],
          },
        ],
      },
      sections: [section],
    });
  }

  /** 直接拿到二进制（模板自己写文件时用，一般走 artifact 即可）。 */
  async toBuffer(document: Document): Promise<Uint8Array> {
    return new Uint8Array(await Packer.toBuffer(document));
  }
}

export function createDocxKit(theme?: Partial<DocxTheme>): DocxKit {
  return new DocxKit(theme);
}

export type { TableCellType };
