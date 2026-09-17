/**
 * progress-docx 的块模型：块类型 -> 负责渲染的组件，以及"编号计划"。
 *
 * 编号计划（planBlocks）在渲染前把整篇文档扫一遍，算出：
 *   · 每个标题最终显示的文字（自动补 "3.2" 这种编号）
 *   · 每个标题的书签名（目录里的 PAGEREF 靠它算页码）
 *   · 每张表 / 每张图的编号（"表 3-2" / "图 3-1"，按一级章节分组）
 *
 * 为什么编号放在这里而不是组件里：
 *   章节、表、图的序号是"全文规则"，必须整篇统一；组件只按序号渲染，不自己数数。
 */

export const BLOCK_OWNER: Record<string, string> = {
  h1: "prose",
  h2: "prose",
  h3: "prose",
  p: "prose",
  list: "prose",
  quote: "prose",
  note: "prose",
  pageBreak: "prose",
  table: "tables",
  figure: "figures",
};

export interface TocEntry {
  level: number;
  text: string;
  bookmark: string;
}

export interface BlockPlan {
  toc: TocEntry[];
  /** 块下标 -> 标题最终文字（含编号） */
  heading: Record<number, string>;
  /** 块下标 -> 书签名 */
  bookmark: Record<number, string>;
  /** 块下标 -> 表编号（"3-2"） */
  table: Record<number, string>;
  /** 块下标 -> 图编号（"3-1"） */
  figure: Record<number, string>;
}

/** 已经带了编号的标题（"1 项目背景" / "1.1 工程背景"）不再重复加编号。 */
const NUMBERED = /^\s*\d+(?:\.\d+)*[\s、.．]/;

export function planBlocks(blocks: Record<string, any>[]): BlockPlan {
  const plan: BlockPlan = { toc: [], heading: {}, bookmark: {}, table: {}, figure: {} };
  let c1 = 0;
  let c2 = 0;
  let c3 = 0;
  let tableCount = 0;
  let figureCount = 0;

  blocks.forEach((block, index) => {
    const type = String(block?.type ?? "");
    if (type === "h1") {
      c1 += 1;
      c2 = 0;
      c3 = 0;
      tableCount = 0;
      figureCount = 0;
    } else if (type === "h2") {
      c2 += 1;
      c3 = 0;
    } else if (type === "h3") {
      c3 += 1;
    }

    const chapter = c1 > 0 ? c1 : 1;
    if (type === "h1" || type === "h2" || type === "h3") {
      const level = type === "h1" ? 1 : type === "h2" ? 2 : 3;
      const number = level === 1 ? String(chapter) : level === 2 ? chapter + "." + c2 : chapter + "." + c2 + "." + c3;
      const raw = String(block.text ?? "").trim();
      const auto = block.numbered === false || NUMBERED.test(raw);
      const text = auto ? raw : number + "  " + raw;
      const bookmark = level === 1 ? "H_" + chapter : level === 2 ? "H_" + chapter + "_" + c2 : "H_" + chapter + "_" + c2 + "_" + c3;
      plan.heading[index] = text;
      plan.bookmark[index] = bookmark;
      plan.toc.push({ level, text, bookmark });
    } else if (type === "table") {
      tableCount += 1;
      plan.table[index] = chapter + "-" + tableCount;
    } else if (type === "figure") {
      figureCount += 1;
      plan.figure[index] = chapter + "-" + figureCount;
    }
  });

  return plan;
}

/** 表题：编号 + 文字；数据里写了 "表 ..." 就不再重复前缀。 */
export function tableCaption(block: Record<string, any>, number: string | undefined): string {
  const text = String(block?.caption ?? "").trim();
  if (!text) return number ? "表 " + number : "";
  if (/^表\s*\d/.test(text)) return text;
  return "表 " + (number ?? "") + "  " + text;
}

/** 图题：编号 + 文字；数据里写了 "图 ..." 就不再重复前缀。 */
export function figureCaption(block: Record<string, any>, number: string | undefined): string {
  const text = String(block?.caption ?? "").trim();
  if (!text) return number ? "图 " + number : "";
  if (/^图\s*\d/.test(text)) return text;
  return "图 " + (number ?? "") + "  " + text;
}
