/**
 * 字体解析：pdf 需要把 TTF/OTF 真实嵌入文件，docx 只需要字体名。
 *
 * 查找顺序（第一个命中即用）：
 *   1. --font / PAPER_FONT_REGULAR / PAPER_FONT_BOLD 显式指定
 *   2. $PAPER_FONTS_DIR
 *   3. ~/.local/share/paper/fonts（make install 装到这里）
 *   4. 安装目录 ../share/paper/fonts（二进制同级）
 *   5. cli/assets/fonts（源码开发模式）
 *   6. 系统字体（macOS / Linux 常见路径）
 *
 * 注意：ttc（字体集合）不能用，pdf-lib 只接受单字体文件，所以只认 ttf/otf。
 */

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { envError } from "./errors";

export interface FontFiles {
  regular: string;
  bold: string;
  dir: string;
  /** 是否是"临时兜底"字体（系统字体），doctor 会提示 */
  fallback: boolean;
}

// 优先 ttf(glyf)：既能让 paper 做稀疏子集化，也避开 pdf-lib 的 CFF 子集 bug
const REGULAR_NAMES = [
  "NotoSansSC-Regular.ttf",
  "NotoSansSC-VF.ttf",
  "SourceHanSansSC-Regular.ttf",
  "NotoSansCJKsc-Regular.ttf",
  "paper-regular.ttf",
];

const BOLD_NAMES = [
  "NotoSansSC-Bold.ttf",
  "NotoSansSC-VF.ttf",
  "SourceHanSansSC-Bold.ttf",
  "NotoSansCJKsc-Bold.ttf",
  "paper-bold.ttf",
];

/** 系统兜底：只有一个字重时，粗体复用常规字重（不做伪粗体）。 */
const SYSTEM_FONTS: { regular: string; bold?: string }[] = [
  {
    regular: "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    bold: "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
  },
  { regular: "/usr/share/fonts/opentype/noto/NotoSansSC-Regular.otf", bold: "/usr/share/fonts/opentype/noto/NotoSansSC-Bold.otf" },
  { regular: "/usr/share/fonts/truetype/noto/NotoSansSC-Regular.otf", bold: "/usr/share/fonts/truetype/noto/NotoSansSC-Bold.otf" },
  { regular: "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc" },
  { regular: "/Library/Fonts/Arial Unicode.ttf" },
];

export function fontSearchDirs(): string[] {
  const dirs: string[] = [];
  const push = (dir: string | undefined): void => {
    if (dir && existsSync(dir) && !dirs.includes(dir)) dirs.push(dir);
  };

  push(process.env.PAPER_FONTS_DIR);
  push(join(homedir(), ".local", "share", "paper", "fonts"));
  if (process.env.XDG_DATA_HOME) push(join(process.env.XDG_DATA_HOME, "paper", "fonts"));
  push(join(dirname(process.execPath), "..", "share", "paper", "fonts"));
  push(join(dirname(process.execPath), "..", "lib", "paper", "fonts"));
  // 源码模式：cli/src/core -> cli/assets/fonts
  try {
    push(join(import.meta.dir, "..", "..", "assets", "fonts"));
  } catch {
    // 编译后的单文件二进制没有真实路径，忽略
  }
  return dirs;
}

function firstExisting(candidates: string[]): string | undefined {
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  return undefined;
}

function pickup(dir: string, names: string[]): string | undefined {
  return firstExisting(names.map((name) => join(dir, name)));
}

/** 找到可用的 pdf 字体；找不到就报错并给出可执行的修复提示。 */
export function resolveFonts(): FontFiles {
  const explicitRegular = process.env.PAPER_FONT_REGULAR ?? process.env.PAPER_FONT;
  const explicitBold = process.env.PAPER_FONT_BOLD;
  if (explicitRegular && existsSync(explicitRegular)) {
    return {
      regular: explicitRegular,
      bold: explicitBold && existsSync(explicitBold) ? explicitBold : explicitRegular,
      dir: dirname(explicitRegular),
      fallback: false,
    };
  }

  for (const dir of fontSearchDirs()) {
    const regular = pickup(dir, REGULAR_NAMES);
    if (!regular) continue;
    const bold = pickup(dir, BOLD_NAMES) ?? regular;
    return { regular, bold, dir, fallback: false };
  }

  for (const system of SYSTEM_FONTS) {
    if (system.regular.endsWith(".ttc")) continue;
    if (existsSync(system.regular)) {
      const bold = system.bold && existsSync(system.bold) ? system.bold : system.regular;
      return { regular: system.regular, bold, dir: dirname(system.regular), fallback: true };
    }
  }

  throw envError(
    "找不到可用的中文字体，pdf 无法生成",
    "在仓库根目录运行 make fonts 下载 Noto Sans SC，或设置 PAPER_FONTS_DIR 指向字体目录",
  );
}

export function describeFontSource(fonts: FontFiles): string {
  return fonts.dir + (fonts.fallback ? "（系统字体，建议 make fonts 安装 Noto Sans SC）" : "");
}
