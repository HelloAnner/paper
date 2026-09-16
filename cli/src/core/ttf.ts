/**
 * TTF 处理公共件（pdf 专用）。
 *
 * 为什么需要这块代码：
 *   - pdf-lib 自带的 subset 走 fontkit 的 TTFSubset，对中文大字体会丢字
 *     （它的 glyf/loca 偏移与 4 字节对齐不一致），生成的 PDF 在 Quartz 下
 *     大面积缺字；
 *   - 完全不裁字体又要嵌入 8-10MB，单份 PDF 直接十几 MB。
 *
 * paper 的做法：**保留字形 id 的稀疏子集**。
 *   - 只保留文档里真正用到的字形轮廓，其余字形留空；
 *   - 字形 id 不变 => cmap / hmtx / hhea 全部原样可用，宽度和编码不会错；
 *   - 复合字形（带分量的字）递归保留它引用的分量，避免缺笔画；
 *   - name / OS/2 / post / cmap 原样带上，pdf-lib 与阅读器都满意。
 *
 * 结果是单份 PDF 只嵌 100KB 级别的字体数据，且字形映射绝对可靠。
 * 前提：字体必须是 glyf 轮廓（ttf / ttf 化的变体字体），CFF(otf) 不支持。
 */

import fontkit from "@pdf-lib/fontkit";
import { renderError } from "./errors";

export interface SfntTable {
  tag: string;
  data: Uint8Array;
}

/** 解析 sfnt 表目录，返回 tag -> 原始字节。 */
export function readTables(font: Uint8Array): Map<string, Uint8Array> {
  const tables = new Map<string, Uint8Array>();
  const buffer = font.buffer.slice(font.byteOffset, font.byteOffset + font.byteLength);
  const view = new DataView(buffer as ArrayBuffer);
  const numTables = view.getUint16(4, false);
  for (let i = 0; i < numTables; i += 1) {
    const record = 12 + i * 16;
    const tag = String.fromCharCode(
      font[record] as number,
      font[record + 1] as number,
      font[record + 2] as number,
      font[record + 3] as number,
    );
    const offset = view.getUint32(record + 8, false);
    const length = view.getUint32(record + 12, false);
    tables.set(tag, font.subarray(offset, offset + length));
  }
  return tables;
}

function tableChecksum(data: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const b0 = data[i] ?? 0;
    const b1 = data[i + 1] ?? 0;
    const b2 = data[i + 2] ?? 0;
    const b3 = data[i + 3] ?? 0;
    sum = (sum + ((((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0))) >>> 0;
  }
  return sum;
}

/** 按 sfnt 规范打包（表目录 + 4 字节对齐 + 校验和 + head.checkSumAdjustment）。 */
export function buildSfnt(sfntVersion: number, tables: SfntTable[]): Uint8Array {
  const sorted = [...tables].sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));
  const numTables = sorted.length;
  const entrySelector = Math.floor(Math.log2(Math.max(numTables, 1)));
  const searchRange = 16 * 2 ** entrySelector;
  const rangeShift = numTables * 16 - searchRange;

  let offset = 12 + numTables * 16;
  const records: { tag: string; checksum: number; offset: number; length: number }[] = [];
  for (const table of sorted) {
    const checksumData =
      table.tag === "head"
        ? (() => {
            const copy = new Uint8Array(table.data.length);
            copy.set(table.data);
            copy[8] = 0;
            copy[9] = 0;
            copy[10] = 0;
            copy[11] = 0;
            return copy;
          })()
        : table.data;
    records.push({
      tag: table.tag,
      checksum: tableChecksum(checksumData),
      offset,
      length: table.data.length,
    });
    offset += (table.data.length + 3) & ~3;
  }

  const out = new Uint8Array(offset);
  const view = new DataView(out.buffer);
  view.setUint32(0, sfntVersion, false);
  view.setUint16(4, numTables, false);
  view.setUint16(6, searchRange, false);
  view.setUint16(8, entrySelector, false);
  view.setUint16(10, rangeShift, false);

  records.forEach((record, index) => {
    const at = 12 + index * 16;
    for (let i = 0; i < 4; i += 1) out[at + i] = record.tag.charCodeAt(i);
    view.setUint32(at + 4, record.checksum, false);
    view.setUint32(at + 8, record.offset, false);
    view.setUint32(at + 12, record.length, false);
  });

  for (const table of sorted) {
    const record = records.find((r) => r.tag === table.tag) as { offset: number };
    out.set(table.data, record.offset);
  }

  const headRecord = records.find((r) => r.tag === "head");
  if (headRecord) {
    const adjustment = (0xb1b0afba - tableChecksum(out)) >>> 0;
    view.setUint32(headRecord.offset + 8, adjustment, false);
  }

  return out;
}

/** 注意：必须共享同一段内存，否则写入会落到副本上（子集化的 loca/head 就靠它）。 */
function dataViewOf(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer as ArrayBuffer, bytes.byteOffset, bytes.byteLength);
}

/** 读取 复合字形 引用的分量字形 id。 */
function componentGlyphs(glyph: Uint8Array): number[] {
  if (glyph.length < 10) return [];
  const view = dataViewOf(glyph);
  if (view.getInt16(0, false) >= 0) return [];
  const components: number[] = [];
  let position = 10;
  let flags = 0x0020;
  while (flags & 0x0020) {
    if (position + 4 > glyph.length) break;
    flags = view.getUint16(position, false);
    position += 2;
    components.push(view.getUint16(position, false));
    position += 2;
    position += flags & 0x0001 ? 4 : 2; // ARG_1_AND_2_ARE_WORDS
    if (flags & 0x0008) position += 2; // WE_HAVE_A_SCALE
    else if (flags & 0x0040) position += 4; // WE_HAVE_AN_X_AND_Y_SCALE
    else if (flags & 0x0080) position += 8; // WE_HAVE_A_TWO_BY_TWO
  }
  return components;
}

export interface SubsetFontOptions {
  /** 文档中用到的所有码点（按 cmap 取字形） */
  codePoints?: Iterable<number>;
  /** 文档中实际绘制过的文本片段（按 layout 取字形，能覆盖 GSUB 替换） */
  texts?: Iterable<string>;
  /** 与 pdf-lib 嵌入时一致的字体特性开关 */
  features?: Record<string, boolean>;
}

/** 生成"保留字形 id"的稀疏子集；字体不是 glyf 轮廓时抛错。 */
export async function subsetFont(
  fontBytes: Uint8Array,
  options: SubsetFontOptions,
): Promise<Uint8Array> {
  const tables = readTables(fontBytes);
  const head = tables.get("head");
  const maxp = tables.get("maxp");
  const loca = tables.get("loca");
  const glyf = tables.get("glyf");
  if (!head || !maxp || !loca || !glyf) {
    throw renderError(
      "字体不是 TrueType(glyf) 轮廓，无法做子集化",
      "请用 make fonts 安装 paper 的 Noto Sans SC（ttf），不要用 ttc/otf",
    );
  }

  const numGlyphs = dataViewOf(maxp).getUint16(4, false);
  let locaFormat = dataViewOf(head).getInt16(50, false);

  const locaView = dataViewOf(loca);
  const offsets: number[] = [];
  for (let i = 0; i <= numGlyphs; i += 1) {
    offsets.push(locaFormat === 0 ? locaView.getUint16(i * 2, false) * 2 : locaView.getUint32(i * 4, false));
  }

  const font = (await fontkit.create(fontBytes as Buffer)) as any;
  if (!font || typeof font.glyphForCodePoint !== "function") {
    throw renderError("字体无法解析");
  }

  const used = new Set<number>([0]); // .notdef 必须保留
  const mark = (glyphId: number): void => {
    if (used.has(glyphId)) return;
    used.add(glyphId);
    const start = offsets[glyphId] ?? 0;
    const end = offsets[glyphId + 1] ?? start;
    if (end - start <= 0) return;
    for (const component of componentGlyphs(glyf.subarray(start, end))) mark(component);
  };

  let touched = 0;
  for (const codePoint of options.codePoints ?? []) {
    touched += 1;
    const glyph = font.glyphForCodePoint(codePoint);
    if (glyph && typeof glyph.id === "number") mark(glyph.id);
  }
  // 关键：pdf-lib 编码时用的是 layout() 的结果，可能有 GSUB 替换（例如 SC 字体的
  // locl 特性会把数字换成另一套字形），所以必须按同样的方式收集字形 id。
  for (const text of options.texts ?? []) {
    if (!text) continue;
    touched += 1;
    const layout = font.layout(text, options.features ?? {});
    for (const glyph of layout.glyphs) {
      if (glyph && typeof glyph.id === "number") mark(glyph.id);
    }
  }
  if (touched === 0) return fontBytes;

  // 重建 glyf + loca：用到的字形原样复制（4 字节对齐），其余留空
  const chunks: Uint8Array[] = [];
  const newOffsets: number[] = [0];
  let cursor = 0;
  for (let i = 0; i < numGlyphs; i += 1) {
    const start = offsets[i] ?? 0;
    const end = offsets[i + 1] ?? start;
    const use = used.has(i) && end > start;
    const padded = use ? (end - start + 3) & ~3 : 0;
    const chunk = new Uint8Array(padded);
    if (use) chunk.set(glyf.subarray(start, end), 0);
    chunks.push(chunk);
    cursor += padded;
    newOffsets.push(cursor);
  }

  const newGlyf = new Uint8Array(cursor);
  {
    let at = 0;
    for (const chunk of chunks) {
      newGlyf.set(chunk, at);
      at += chunk.length;
    }
  }

  if (locaFormat === 0 && cursor / 2 > 0xffff) locaFormat = 1;
  const newLoca = new Uint8Array((numGlyphs + 1) * (locaFormat === 0 ? 2 : 4));
  const newLocaView = dataViewOf(newLoca);
  for (let i = 0; i <= numGlyphs; i += 1) {
    const value = newOffsets[i] ?? 0;
    if (locaFormat === 0) newLocaView.setUint16(i * 2, value / 2, false);
    else newLocaView.setUint32(i * 4, value, false);
  }

  const newHead = new Uint8Array(head.length);
  newHead.set(head);
  dataViewOf(newHead).setInt16(50, locaFormat, false);

  const nextTables: SfntTable[] = [];
  for (const [tag, data] of tables.entries()) {
    if (tag === "DSIG") continue; // 改过内容后签名必然失效
    if (tag === "glyf") nextTables.push({ tag, data: newGlyf });
    else if (tag === "loca") nextTables.push({ tag, data: newLoca });
    else if (tag === "head") nextTables.push({ tag, data: newHead });
    else nextTables.push({ tag, data });
  }

  const sfntVersion = (fontBytes[0] as number) === 0x74 ? 0x74727565 : 0x00010000;
  return buildSfnt(sfntVersion, nextTables);
}

/** 字体小于 200KB 时没必要裁。 */
export function shouldSubset(fontBytes: Uint8Array): boolean {
  return fontBytes.byteLength > 200 * 1024;
}
