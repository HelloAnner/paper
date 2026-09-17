/**
 * docx 公共件：paper 所有 docx 模板都从这里取排版积木。
 *
 * 核心思想：排版 = "角色样式规范（spec）+ 内容填充"。
 *   · 角色（role）：封面主标题 / 一级标题 / 正文 / 表头 / 图题 / 页脚 …… 每种位置一个角色；
 *   · 规范（spec）：每个角色写清字体、字号、加粗、颜色、缩进、间距、大纲级别；
 *   · 组件只写"这段是什么角色"，不写字号和间距。
 *
 * 为什么这样做：
 *   一份真实文档里"同一角色"会出现在很多位置，字号字体必须一致；而"不同角色"之间
 *   必须有差异。把两者都收进 spec，一致性由 spec 保证，差异也由 spec 表达，
 *   组件代码里就不会散落任何魔法数字。
 *
 * 规范会同时写进 docx 的样式表（Word 的"样式"面板里能看到 paper-* 角色），
 * 因此打开文档后，用户改样式面板里的角色就能全局改版式。
 */

import {
  AlignmentType,
  Bookmark,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  LeaderType,
  LevelFormat,
  LineRuleType,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  SimpleField,
  Table,
  TableCell,
  TableRow,
  Tab,
  TabStopPosition,
  TabStopType,
  TextRun,
  VerticalAlign,
  WidthType,
  convertMillimetersToTwip,
  type IBorderOptions,
  type IParagraphOptions,
  type IParagraphStyleOptions,
  type IParagraphStylePropertiesOptions,
  type IRunStylePropertiesOptions,
  type ISectionOptions,
  type ParagraphChild,
  type Table as TableType,
  type Paragraph as ParagraphType,
} from "docx";
import { parseInline } from "./richtext";

export type DocxAlign = "left" | "center" | "right" | "justify";

/** 文档块：段落或表格。 */
export type DocxBlock = ParagraphType | TableType;

export interface DocxFonts {
  /** 中文正文字体（宋体） */
  body: string;
  /** 中文标题字体（黑体） */
  heading: string;
  /** 中文引文/点缀字体（楷体） */
  alt: string;
  /** 等宽字体 */
  mono: string;
  /** 西文字体（正文与标题共用一个西文字族，避免中英混排跳动） */
  latin: string;
}

export interface DocxColors {
  text: string;
  muted: string;
  accent: string;
  coverTitle: string;
  coverSubtitle: string;
  border: string;
  tableHeadFill: string;
  tableZebra: string;
  noteFill: string;
}

/** 一个角色的全部排版属性；没写的项继承 defaultRole。 */
export interface DocxRole {
  /** Word 样式面板里显示的名字 */
  name: string;
  basedOn?: string;
  font?: "body" | "heading" | "alt" | "mono";
  /** 字号，半磅（24 = 12pt） */
  size?: number;
  bold?: boolean;
  italics?: boolean;
  color?: string;
  align?: DocxAlign;
  /** 段前 / 段后间距，1/20 pt（120 = 6pt） */
  before?: number;
  after?: number;
  /** 行距：lineRule=auto 时 240 = 单倍，360 = 1.5 倍 */
  line?: number;
  /** 首行缩进（字符数，中文排版常用 2） */
  firstLineChars?: number;
  /** 左缩进与悬挂缩进，单位 twip（1 字符 ≈ 240） */
  left?: number;
  hanging?: number;
  /** 大纲级别，0 = 一级标题；目录靠它收集条目 */
  outline?: number;
  keepNext?: boolean;
  pageBreakBefore?: boolean;
  /** 底纹填充色 */
  shading?: string;
  /** 左侧竖线（引用块）或顶部横线（页眉/落款） */
  borderLeft?: boolean;
  borderTop?: boolean;
}

export interface DocxSpec {
  fonts: DocxFonts;
  colors: DocxColors;
  roles: Record<string, DocxRole>;
  /** 缺省继承的角色，其他角色基于它 */
  defaultRole: string;
  /** 页边距（mm），四边一致 */
  marginMm?: number;
}

export const DEFAULT_DOCX_SPEC: DocxSpec = {
  fonts: {
    body: "宋体",
    heading: "黑体",
    alt: "楷体",
    mono: "Consolas",
    latin: "Times New Roman",
  },
  colors: {
    text: "000000",
    muted: "595959",
    accent: "1F4D78",
    coverTitle: "17365D",
    coverSubtitle: "1F4D78",
    border: "8C8C8C",
    tableHeadFill: "E7E6E6",
    tableZebra: "F5F5F5",
    noteFill: "F5F5F5",
  },
  defaultRole: "paper-body",
  marginMm: 25.4,
  roles: {
    "paper-body": { name: "正文", font: "body", size: 24, line: 360, after: 0, firstLineChars: 200 },
    "paper-title": { name: "文档标题", font: "heading", size: 44, bold: true, color: "000000", align: "center", before: 240, after: 160, line: 276 },
    "paper-h1": { name: "一级标题", font: "heading", size: 30, bold: true, before: 360, after: 200, line: 276, outline: 0, keepNext: true },
    "paper-h2": { name: "二级标题", font: "heading", size: 26, bold: true, before: 240, after: 120, line: 276, outline: 1, keepNext: true },
    "paper-h3": { name: "三级标题", font: "heading", size: 24, bold: true, before: 180, after: 100, line: 276, outline: 2, keepNext: true },
    "paper-list": { name: "列表", font: "body", size: 24, line: 360, after: 60 },
    "paper-meta": { name: "说明行", font: "body", size: 21, color: "595959", line: 300, after: 60 },
    "paper-caption": { name: "图表题", font: "body", size: 21, align: "center", line: 300, before: 60, after: 120 },
    "paper-quote": { name: "引文", font: "alt", size: 24, line: 360, after: 120, left: 480 },
    "paper-note": { name: "注释", font: "body", size: 21, color: "595959", line: 300, left: 480, after: 120 },
    "paper-table-text": { name: "表格文字", font: "body", size: 21, line: 300, after: 0 },
    "paper-table-head": { name: "表头文字", font: "body", size: 21, bold: true, line: 300, after: 0 },
    "paper-footer": { name: "页脚", font: "body", size: 18, color: "595959", align: "center", line: 240 },
    "paper-header": { name: "页眉", font: "body", size: 18, color: "595959", align: "right", line: 240 },
  },
};

const ALIGN: Record<DocxAlign, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
};

function hex(color: string): string {
  return String(color || "000000").replace(/^#/, "");
}

function deepMerge<T>(base: T, patch?: Partial<T>): T {
  if (!patch) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    if (value === undefined) continue;
    const prev = out[key];
    if (prev && value && typeof prev === "object" && typeof value === "object" && !Array.isArray(prev)) {
      out[key] = deepMerge(prev as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out as T;
}

export interface DocxRunOptions {
  bold?: boolean;
  italics?: boolean;
  color?: string;
  size?: number;
  mono?: boolean;
}

export interface DocxParagraphOptions {
  align?: DocxAlign;
  before?: number;
  after?: number;
  keepNext?: boolean;
  pageBreakBefore?: boolean;
  indentLeft?: number;
}

export interface DocxTableOptions {
  head?: string[];
  rows: (string | number)[][];
  /** 相对宽度，例如 [3, 1, 1, 1]；缺省等分 */
  widths?: number[];
  align?: DocxAlign[];
  zebra?: boolean;
  fontSize?: number;
  /** 表题（默认放在表格上方居中） */
  caption?: string;
  captionRole?: string;
}

export interface DocxFigureOptions {
  data: Uint8Array;
  type: "png" | "jpg" | "gif" | "bmp";
  /** 图片最大宽度（mm），缺省撑满版心 */
  widthMm?: number;
  caption?: string;
  alt?: string;
  captionRole?: string;
}

export interface DocxSectionOptions {
  blocks: DocxBlock[];
  /** 页脚；null 表示这一节不画页脚（封面节） */
  footer?: { text?: string; pageNumber?: boolean } | null;
  header?: string;
  /** 页码从几开始（正文节通常写 1） */
  pageNumberStart?: number;
  /** 首页使用单独的页眉页脚（封面节用） */
  titlePage?: boolean;
}

export interface DocxDocumentOptions {
  sections: DocxSectionOptions[];
  title?: string;
  author?: string;
  subject?: string;
  /** 打开文档时自动更新目录等域（缺省 true） */
  updateFields?: boolean;
}

/** 从 PNG / JPEG 字节里读出像素尺寸，用于按比例缩放图片。 */
export function imageSize(data: Uint8Array): { width: number; height: number } | null {
  // PNG: 89 50 4E 47 0D 0A 1A 0A + IHDR
  if (data.length > 24 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  // JPEG: 逐段找 SOF0..SOF3 / SOF5..SOF7 / SOF9..SOF11
  if (data.length > 4 && data[0] === 0xff && data[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < data.length) {
      if (data[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = data[offset + 1];
      const length = (data[offset + 2] << 8) | data[offset + 3];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        const height = (data[offset + 5] << 8) | data[offset + 6];
        const width = (data[offset + 7] << 8) | data[offset + 8];
        return { width, height };
      }
      offset += 2 + length;
    }
  }
  return null;
}

export class DocxKit {
  readonly spec: DocxSpec;

  constructor(spec?: Partial<DocxSpec>) {
    this.spec = deepMerge(DEFAULT_DOCX_SPEC, spec);
  }

  role(id: string): DocxRole {
    return this.spec.roles[id] ?? this.spec.roles[this.spec.defaultRole] ?? { name: id };
  }

  fontOptions(role: DocxRole): IRunStylePropertiesOptions["font"] {
    const fonts = this.spec.fonts;
    const cjk =
      role.font === "heading" ? fonts.heading : role.font === "alt" ? fonts.alt : role.font === "mono" ? fonts.mono : fonts.body;
    return { ascii: fonts.latin, hAnsi: fonts.latin, eastAsia: cjk, cs: fonts.latin } as IRunStylePropertiesOptions["font"];
  }

  /** 底层：一段纯文本 -> TextRun（显式属性才覆盖样式，其余继承角色样式）。 */
  run(text: string, options: DocxRunOptions = {}): TextRun {
    return new TextRun({
      text,
      bold: options.bold,
      italics: options.italics,
      size: options.size,
      color: options.color ? hex(options.color) : undefined,
      font: options.mono
        ? { ascii: this.spec.fonts.mono, hAnsi: this.spec.fonts.mono, eastAsia: this.spec.fonts.body, cs: this.spec.fonts.mono }
        : undefined,
    });
  }

  /** 行内富文本：星号粗体 / 反引号代码 / 等号强调，其余属性继承角色样式。 */
  rich(text: unknown, options: DocxRunOptions = {}): TextRun[] {
    return parseInline(text)
      .filter((run) => run.text.length > 0)
      .map(
        (run) =>
          new TextRun({
            text: run.text,
            bold: run.bold || options.bold,
            italics: options.italics,
            size: options.size,
            color: run.accent ? hex(this.spec.colors.accent) : options.color ? hex(options.color) : undefined,
            font: run.code
              ? { ascii: this.spec.fonts.mono, hAnsi: this.spec.fonts.mono, eastAsia: this.spec.fonts.body, cs: this.spec.fonts.mono }
              : undefined,
          }),
      );
  }

  /** 按角色造一个段落（children 已由调用方准备好，或直接给字符串走纯文本）。 */
  para(roleId: string, children: (ParagraphChild | string)[], options: DocxParagraphOptions = {}): Paragraph {
    const runs = children.map((child) => (typeof child === "string" ? this.run(child) : child));
    const paragraph: IParagraphOptions = {
      style: roleId,
      children: runs,
      alignment: options.align ? ALIGN[options.align] : undefined,
      keepNext: options.keepNext,
      pageBreakBefore: options.pageBreakBefore,
      spacing: options.before !== undefined || options.after !== undefined ? { before: options.before, after: options.after } : undefined,
      indent: options.indentLeft !== undefined ? { left: options.indentLeft } : undefined,
    };
    return new Paragraph(paragraph);
  }

  /** 空文本直接返回 null，方便 filter(Boolean)。 */
  paraText(roleId: string, text: unknown, options: DocxParagraphOptions = {}): Paragraph | null {
    const value = String(text ?? "").trim();
    if (!value) return null;
    return this.para(roleId, this.rich(text), options);
  }

  /** 多行文本 -> 段数组（换行拆段），空行忽略。 */
  blocks(roleId: string, text: unknown, options: DocxParagraphOptions = {}): DocxBlock[] {
    return String(text ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => this.para(roleId, this.rich(line), options));
  }

  heading(roleId: string, text: unknown): DocxBlock[] {
    const paragraph = this.paraText(roleId, text);
    return paragraph ? [paragraph] : [];
  }

  list(roleId: string, items: unknown[], ordered = false): DocxBlock[] {
    const list = items.map((item) => String(item ?? "")).filter((item) => item.trim().length > 0);
    return list.map(
      (item) =>
        new Paragraph({
          style: roleId,
          children: this.rich(item),
          numbering: { reference: ordered ? "paper-number" : "paper-bullet", level: 0 },
          spacing: { after: 60, line: 360 },
        }),
    );
  }

  /** 两列信息表：左标签右内容，无边框（封面/落款用）。 */
  kv(rows: [string, string][], options: { labelRole?: string; valueRole?: string; labelWidth?: number } = {}): DocxBlock[] {
    const labelRole = options.labelRole ?? this.spec.defaultRole;
    const valueRole = options.valueRole ?? this.spec.defaultRole;
    const labelWidth = options.labelWidth ?? 24;
    const tableRows = rows
      .filter(([, value]) => String(value ?? "").trim().length > 0)
      .map(
        ([label, value]) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: labelWidth, type: WidthType.PERCENTAGE },
                margins: { top: 60, bottom: 60, left: 0, right: 120 },
                children: [this.para(labelRole, this.rich(label), { after: 0 })],
              }),
              new TableCell({
                width: { size: 100 - labelWidth, type: WidthType.PERCENTAGE },
                margins: { top: 60, bottom: 60, left: 0, right: 0 },
                children: [this.para(valueRole, this.rich(value), { after: 0 })],
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

  /** 封面信息表：四列（标签/内容/标签/内容），灰底标签、浅灰细线。 */
  coverTable(rows: [string, string][], roles: { labelRole: string; valueRole: string; fill?: string }): DocxBlock[] {
    if (rows.length === 0) return [];
    const fill = roles.fill ?? this.spec.colors.tableHeadFill;
    const border: IBorderOptions = { style: BorderStyle.SINGLE, size: 4, color: hex(this.spec.colors.border) };
    const cell = (text: string, roleId: string, isLabel: boolean): TableCell =>
      new TableCell({
        width: { size: isLabel ? 18 : 32, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 70, bottom: 70, left: 100, right: 100 },
        shading: isLabel ? { type: ShadingType.CLEAR, fill: hex(fill), color: "auto" } : undefined,
        borders: { top: border, bottom: border, left: border, right: border },
        children: [this.para(roleId, this.rich(text), { after: 0, align: isLabel ? "center" : "left" })],
      });
    const tableRows: TableRow[] = [];
    for (let index = 0; index < rows.length; index += 2) {
      const first = rows[index];
      const second = rows[index + 1];
      tableRows.push(
        new TableRow({
          children: [
            cell(first[0], roles.labelRole, true),
            cell(first[1], roles.valueRole, false),
            cell(second ? second[0] : "", roles.labelRole, true),
            cell(second ? second[1] : "", roles.valueRole, false),
          ],
        }),
      );
    }
    return [
      new Table({
        rows: tableRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        alignment: AlignmentType.CENTER,
        borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
      }),
    ];
  }

  table(options: DocxTableOptions): DocxBlock[] {
    const { rows, head } = options;
    if (rows.length === 0 && !head) return [];
    const widths = options.widths ?? new Array(head?.length ?? rows[0]?.length ?? 1).fill(1);
    const total = widths.reduce((sum, w) => sum + w, 0) || 1;
    const aligns = options.align ?? [];
    const border: IBorderOptions = { style: BorderStyle.SINGLE, size: 4, color: hex(this.spec.colors.border) };

    const buildRow = (cells: (string | number)[], isHead: boolean, zebra: boolean): TableRow =>
      new TableRow({
        tableHeader: isHead,
        children: cells.map((value, index) => {
          const align = aligns[index] ?? (isHead ? "center" : "left");
          return new TableCell({
            width: { size: Math.round(((widths[index] ?? 1) / total) * 100), type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            shading: isHead
              ? { type: ShadingType.CLEAR, fill: hex(this.spec.colors.tableHeadFill), color: "auto" }
              : zebra
                ? { type: ShadingType.CLEAR, fill: hex(this.spec.colors.tableZebra), color: "auto" }
                : undefined,
            borders: { top: border, bottom: border, left: border, right: border },
            children: [
              this.para(
                isHead ? "paper-table-head" : "paper-table-text",
                this.rich(String(value ?? ""), options.fontSize ? { size: options.fontSize } : {}),
                { after: 0, align },
              ),
            ],
          });
        }),
      });

    const tableRows: TableRow[] = [];
    if (head && head.length > 0) tableRows.push(buildRow(head, true, false));
    rows.forEach((row, index) => tableRows.push(buildRow(row, false, options.zebra === true && index % 2 === 1)));

    const blocks: DocxBlock[] = [];
    if (options.caption) {
      // keepNext：表题不能和表格被分页切开
      const caption = this.paraText(options.captionRole ?? "paper-caption", options.caption, { after: 60, keepNext: true });
      if (caption) blocks.push(caption);
    }
    blocks.push(
      new Table({
        rows: tableRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
      }),
    );
    blocks.push(new Paragraph({ children: [], spacing: { after: 120 } }));
    return blocks;
  }

  /** 图片 + 图题（图题在下，居中）。 */
  figure(options: DocxFigureOptions): DocxBlock[] {
    const size = imageSize(options.data);
    const contentWidthMm = 210 - 2 * (this.spec.marginMm ?? 25.4);
    const maxWidthMm = options.widthMm ?? contentWidthMm;
    // ImageRun 的尺寸单位是像素：按 96dpi 换算，宽度先受限，再按原始比例定高
    const widthPx = Math.round((maxWidthMm / 25.4) * 96);
    const heightPx = size && size.width > 0 ? Math.round((widthPx * size.height) / size.width) : Math.round(widthPx * 0.6);
    const blocks: DocxBlock[] = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        keepNext: options.caption ? true : undefined,
        spacing: { before: 120, after: options.caption ? 60 : 120 },
        children: [
          new ImageRun({
            type: options.type,
            data: options.data,
            transformation: { width: widthPx, height: heightPx },
            altText: options.alt ? { name: options.alt, description: options.alt, title: options.alt } : undefined,
          }),
        ],
      }),
    ];
    if (options.caption) {
      const caption = this.paraText(options.captionRole ?? "paper-caption", options.caption);
      if (caption) blocks.push(caption);
    }
    return blocks;
  }

  /** 书签：章节标题上挂一个名字，目录里的 PAGEREF 靠它取页码。 */
  bookmark(name: string, children: ParagraphChild[]): Bookmark {
    return new Bookmark({ id: name, children });
  }

  /**
   * 目录：不依赖 Word 的 TOC 域样式，而是自己排版 —— 章节文字 + 点线 + PAGEREF 动态页码。
   * 好处是字体、缩进、点线、右对齐页码都由角色规范控制，目录和正文风格严格一致；
   * 打开文档时 Word/WPS 会自动更新 PAGEREF 域，页码即真实页码。
   */
  toc(options: {
    entries: { level: number; text: string; bookmark: string }[];
    title?: string;
    titleRole?: string;
    entryRoles?: string[];
    tabPosition?: number;
  }): DocxBlock[] {
    const blocks: DocxBlock[] = [];
    const title = this.paraText(options.titleRole ?? "paper-toc-title", options.title ?? "目  录");
    if (title) blocks.push(title);
    const entryRoles = options.entryRoles ?? ["paper-toc-1", "paper-toc-2", "paper-toc-3", "paper-toc-4"];
    const tabPosition = options.tabPosition ?? TabStopPosition.MAX;
    for (const entry of options.entries) {
      const roleId = entryRoles[Math.min(Math.max(entry.level, 1), entryRoles.length) - 1] ?? entryRoles[entryRoles.length - 1];
      blocks.push(
        new Paragraph({
          style: roleId,
          tabStops: [{ type: TabStopType.RIGHT, position: tabPosition, leader: LeaderType.DOT }],
          children: [...this.rich(entry.text), new Tab(), new SimpleField("PAGEREF " + entry.bookmark + " \\h", "")],
        }),
      );
    }
    return blocks;
  }

  pageBreak(): DocxBlock[] {
    return [new Paragraph({ children: [], pageBreakBefore: true })];
  }

  /** 空段落当垂直间距用（单位：1/20 pt）。 */
  spacer(points = 120): DocxBlock[] {
    return [new Paragraph({ children: [], spacing: { after: points } })];
  }

  rule(roleId = "paper-meta"): DocxBlock[] {
    return [
      new Paragraph({
        style: roleId,
        children: [],
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: hex(this.spec.colors.border), space: 1 } },
      }),
    ];
  }

  private styleDefinitions(): IParagraphStyleOptions[] {
    return Object.entries(this.spec.roles).map(([id, role]) => ({
      id,
      name: role.name,
      // 缺省角色不能 basedOn 自己，否则 Word 里是自引用
      basedOn: role.basedOn ?? (id === this.spec.defaultRole ? undefined : this.spec.defaultRole),
      quickFormat: true,
      run: {
        size: role.size,
        bold: role.bold,
        italics: role.italics,
        color: role.color ? hex(role.color) : undefined,
        font: this.fontOptions(role),
      },
      paragraph: {
        alignment: role.align ? ALIGN[role.align] : undefined,
        spacing: {
          before: role.before,
          after: role.after,
          line: role.line,
          lineRule: role.line ? LineRuleType.AUTO : undefined,
        },
        indent: this.indentOf(role),
        outlineLevel: role.outline,
        keepNext: role.keepNext,
        pageBreakBefore: role.pageBreakBefore,
        shading: role.shading ? { type: ShadingType.CLEAR, fill: hex(role.shading), color: "auto" } : undefined,
        border: role.borderLeft
          ? { left: { style: BorderStyle.SINGLE, size: 12, color: hex(this.spec.colors.accent), space: 12 } }
          : role.borderTop
            ? { top: { style: BorderStyle.SINGLE, size: 4, color: hex(this.spec.colors.border), space: 6 } }
            : undefined,
      },
    }));
  }

  /**
   * 缩进：首行缩进用 firstLineChars（OOXML 的"字符数"单位，Word/WPS 的"首行缩进 2 字符"），
   * 左右缩进与悬挂缩进用 twip。不要写成 firstLine 的数值版本 —— docx 库会把它乘 100。
   */
  private indentOf(role: DocxRole): IParagraphStylePropertiesOptions["indent"] | undefined {
    if (role.firstLineChars === undefined && role.left === undefined && role.hanging === undefined) return undefined;
    return {
      firstLineChars: role.firstLineChars,
      left: role.left,
      hanging: role.hanging,
    };
  }

  private pageProperties(): ISectionOptions["properties"] {
    const margin = convertMillimetersToTwip(this.spec.marginMm ?? 25.4);
    return {
      page: {
        size: { width: convertMillimetersToTwip(210), height: convertMillimetersToTwip(297) },
        margin: { top: margin, bottom: margin, left: margin, right: margin, header: 709, footer: 709 },
      },
    };
  }

  private footerFor(section: DocxSectionOptions): Footer | undefined {
    if (section.footer === null) return undefined;
    const config = section.footer ?? {};
    const size = this.role("paper-footer").size;
    const children: Paragraph[] = [];
    if (config.pageNumber !== false) {
      children.push(
        new Paragraph({
          style: "paper-footer",
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: hex(this.spec.colors.border), space: 6 } },
          children: [
            ...(config.text ? [this.run(config.text + "    ", { size })] : []),
            new TextRun({
              children: ["第 ", PageNumber.CURRENT, " 页 / 共 ", PageNumber.TOTAL_PAGES, " 页"],
              size,
              color: hex(this.spec.colors.muted),
              font: this.fontOptions(this.role("paper-footer")),
            }),
          ],
        }),
      );
    } else if (config.text) {
      children.push(this.para("paper-footer", this.rich(config.text)));
    }
    return children.length > 0 ? new Footer({ children }) : undefined;
  }

  private headerFor(section: DocxSectionOptions): Header | undefined {
    if (!section.header) return undefined;
    return new Header({ children: [this.para("paper-header", this.rich(section.header))] });
  }

  section(options: DocxSectionOptions): ISectionOptions {
    const page = this.pageProperties();
    const header = this.headerFor(options);
    const footer = this.footerFor(options);
    return {
      properties: {
        ...page,
        titlePage: options.titlePage || undefined,
        page: options.pageNumberStart !== undefined ? { ...(page?.page ?? {}), pageNumbers: { start: options.pageNumberStart } } : page?.page,
      },
      headers: header ? { default: header } : undefined,
      footers: footer ? { default: footer } : undefined,
      children: options.blocks,
    };
  }

  /** 组装整份 Document：多节 + 角色样式表 + 目录域自动更新。 */
  document(options: DocxDocumentOptions): Document {
    return new Document({
      title: options.title,
      creator: options.author ?? "paper",
      description: options.subject,
      features: { updateFields: options.updateFields !== false },
      styles: {
        default: {
          document: {
            run: {
              size: this.role("paper-body").size,
              color: hex(this.spec.colors.text),
              font: this.fontOptions(this.role("paper-body")),
            },
            paragraph: { spacing: { line: 300, after: 120 } },
          },
        },
        paragraphStyles: this.styleDefinitions(),
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
                style: { paragraph: { indent: { left: 480, hanging: 240 } }, run: { color: hex(this.spec.colors.text) } },
              },
              {
                level: 1,
                format: LevelFormat.BULLET,
                text: "◦",
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 900, hanging: 240 } }, run: { color: hex(this.spec.colors.muted) } },
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
                style: { paragraph: { indent: { left: 480, hanging: 240 } }, run: { color: hex(this.spec.colors.text) } },
              },
            ],
          },
        ],
      },
      sections: options.sections.map((section) => this.section(section)),
    });
  }

  async toBuffer(document: Document): Promise<Uint8Array> {
    return new Uint8Array(await Packer.toBuffer(document));
  }
}

export function createDocxKit(spec?: Partial<DocxSpec>): DocxKit {
  return new DocxKit(spec);
}
