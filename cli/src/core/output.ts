/**
 * 终端输出：统一 --json / 人类可读两种模式，以及中英混排的表格对齐。
 */

import type { ParsedArgs } from "./args";
import { flagBool } from "./args";

export interface IO {
  json: boolean;
  verbose: boolean;
  quiet: boolean;
  color: boolean;
}

const ANSI = {
  reset: "\u001b[0m",
  dim: "\u001b[2m",
  bold: "\u001b[1m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  red: "\u001b[31m",
  cyan: "\u001b[36m",
};

export function createIO(args: ParsedArgs): IO {
  const noColor = flagBool(args, "--no-color") || process.env.NO_COLOR !== undefined;
  return {
    json: flagBool(args, "--json"),
    verbose: flagBool(args, "--verbose") || flagBool(args, "--debug"),
    quiet: flagBool(args, "--quiet"),
    color: !noColor && Boolean(process.stdout.isTTY),
  };
}

function paint(io: IO, color: keyof typeof ANSI, text: string): string {
  if (!io.color) return text;
  return ANSI[color] + text + ANSI.reset;
}

/** "→ 步骤"：只展示流程，默认模式下静默（避免污染 --json 输出）。 */
export function step(io: IO, msg: string): void {
  if (io.json || io.quiet) return;
  process.stderr.write(paint(io, "cyan", "→ ") + msg + "\n");
}

export function ok(io: IO, msg: string): void {
  if (io.json || io.quiet) return;
  process.stderr.write(paint(io, "green", "✓ ") + msg + "\n");
}

export function warn(io: IO, msg: string): void {
  process.stderr.write(paint(io, "yellow", "! ") + msg + "\n");
}

export function fail(io: IO, msg: string): void {
  process.stderr.write(paint(io, "red", "✗ ") + msg + "\n");
}

export function hint(io: IO, msg: string): void {
  process.stderr.write("  " + paint(io, "dim", "提示：" + msg) + "\n");
}

/** 命令最终结果：--json 时给机器，否则给人。 */
export function emit(io: IO, human: string, payload: unknown): void {
  if (io.json) {
    printJson(payload);
    return;
  }
  if (human.length > 0) process.stdout.write(human.endsWith("\n") ? human : human + "\n");
}

export function printJson(value: unknown): void {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
}

/** 中日韩全角字符按 2 列计算，保证表格对齐。 */
export function displayWidth(text: string): number {
  let width = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    width += isWide(cp) ? 2 : 1;
  }
  return width;
}

function isWide(cp: number): boolean {
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

function pad(text: string, width: number): string {
  const diff = width - displayWidth(text);
  return diff > 0 ? text + " ".repeat(diff) : text;
}

export interface TableOptions {
  header?: boolean;
  indent?: string;
  gap?: number;
}

/** 纯文本对齐表格：列宽按内容自动计算，最后一列不补空格。 */
export function renderTable(rows: string[][], options: TableOptions = {}): string {
  const gap = " ".repeat(options.gap ?? 2);
  const indent = options.indent ?? "  ";
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const widths: number[] = [];
  for (let c = 0; c < columnCount; c += 1) {
    let w = 0;
    for (const row of rows) w = Math.max(w, displayWidth(row[c] ?? ""));
    widths.push(w);
  }
  return rows
    .map((row) => {
      const cells = row.map((cell, i) => {
        const isLast = i === row.length - 1;
        return isLast ? cell : pad(cell, widths[i] ?? 0);
      });
      return indent + cells.join(gap).replace(/\s+$/, "");
    })
    .join("\n");
}
