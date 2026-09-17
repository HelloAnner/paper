/**
 * progress-docx 的排版规范（角色 -> 属性）。
 *
 * 这份文件是从"国企阶段性进度报告"样板 docx 里提取、并做过一致性加固的：
 *   · 中文字体：正文宋体、标题黑体、引文楷体；西文统一 Times New Roman；
 *   · 正文 12pt、1.5 倍行距、首行缩进 2 字符；
 *   · 标题 15 / 13 / 12pt，黑体加粗，带大纲级别（目录靠它取层级）；
 *   · 表格浅灰细线 + 灰底表头；封面深蓝标题。
 *
 * 改版式只改这里：所有组件都会跟着变，不会再出现"同一角色两种字号"。
 * 这些角色会写进 docx 的样式表，Word 的"样式"面板里能看到 paper-* 条目。
 */

import type { DocxSpec } from "../../core/docx-kit";

export const PROGRESS_DOCX_SPEC: Partial<DocxSpec> = {
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
  marginMm: 25.4,
  roles: {
    // —— 封面 ——
    "paper-cover-title": { name: "封面主标题", font: "heading", size: 48, bold: true, color: "17365D", align: "center", before: 240, after: 160, line: 320 },
    "paper-cover-subtitle": { name: "封面副标题", font: "heading", size: 30, bold: true, color: "1F4D78", align: "center", after: 240, line: 300 },
    "paper-cover-meta": { name: "封面密级编号", font: "body", size: 21, color: "595959", align: "right", after: 60, line: 300 },
    "paper-cover-label": { name: "封面信息标签", font: "heading", size: 22, color: "000000", align: "center", after: 0, line: 300 },
    "paper-cover-value": { name: "封面信息内容", font: "body", size: 22, color: "000000", after: 0, line: 300 },
    "paper-cover-org": { name: "封面编制单位", font: "heading", size: 28, bold: true, color: "000000", align: "center", before: 600, after: 120, line: 300 },
    "paper-cover-date": { name: "封面编制日期", font: "body", size: 24, color: "000000", align: "center", after: 0, line: 300 },

    // —— 目录 ——
    "paper-toc-title": { name: "目录标题", font: "heading", size: 32, bold: true, color: "000000", align: "center", before: 200, after: 240, line: 300 },
    "paper-toc-1": { name: "目录一级", font: "heading", size: 24, bold: true, color: "000000", line: 360, after: 60 },
    "paper-toc-2": { name: "目录二级", font: "body", size: 24, color: "000000", left: 420, line: 360, after: 40 },
    "paper-toc-3": { name: "目录三级", font: "body", size: 21, color: "595959", left: 840, line: 320, after: 40 },

    // —— 正文标题 ——
    "paper-h1": { name: "一级标题", font: "heading", size: 30, bold: true, color: "000000", before: 360, after: 200, line: 276, outline: 0, keepNext: true },
    "paper-h2": { name: "二级标题", font: "heading", size: 26, bold: true, color: "000000", before: 240, after: 120, line: 276, outline: 1, keepNext: true },
    "paper-h3": { name: "三级标题", font: "heading", size: 24, bold: true, color: "000000", before: 180, after: 100, line: 276, outline: 2, keepNext: true },

    // —— 正文 ——
    "paper-body": { name: "正文", font: "body", size: 24, line: 360, after: 0, firstLineChars: 200 },
    "paper-list": { name: "列表", font: "body", size: 24, line: 360, after: 60 },
    "paper-quote": { name: "引文", font: "alt", size: 24, line: 360, left: 480, after: 120, borderLeft: true },
    "paper-note": { name: "注释", font: "body", size: 21, color: "595959", line: 320, left: 480, after: 120 },
    "paper-caption": { name: "图题", font: "body", size: 21, color: "000000", align: "center", before: 60, after: 120, line: 300 },
    "paper-table-caption": { name: "表题", font: "body", size: 21, color: "000000", align: "center", before: 120, after: 60, line: 300 },

    // —— 表格 ——
    "paper-table-text": { name: "表格文字", font: "body", size: 21, color: "000000", line: 300, after: 0 },
    "paper-table-head": { name: "表头文字", font: "body", size: 21, bold: true, color: "000000", line: 300, after: 0 },

    // —— 落款 / 页眉页脚 ——
    "paper-signoff": { name: "落款", font: "body", size: 24, color: "000000", align: "right", line: 360, after: 60 },
    "paper-footer": { name: "页脚", font: "body", size: 18, color: "595959", align: "center", line: 240 },
    "paper-header": { name: "页眉", font: "body", size: 18, color: "595959", align: "right", line: 240 },
  },
};
