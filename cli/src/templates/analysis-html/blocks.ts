/**
 * 块类型 -> 负责渲染它的组件 id。
 * 模板的分发和 panel 内部块的分发共用这一份，避免两处走样。
 */
export const BLOCK_OWNER: Record<string, string> = {
  h3: "prose",
  p: "prose",
  list: "prose",
  sub: "prose",
  callout: "prose",
  banner: "prose",
  note: "prose",
  metrics: "metrics",
  flow: "metrics",
  tags: "metrics",
  kpis: "metrics",
  stackedBar: "metrics",
  proofs: "metrics",
  steps: "metrics",
  stats: "metrics",
  bars: "charts",
  dualBars: "charts",
  reasons: "charts",
  heatmap: "charts",
  donut: "charts",
  panel: "charts",
  scenes: "scenes",
  table: "tables",
  details: "tables",
};

/** 找不到负责的组件就返回空串，模板据此跳过未知块。 */
export function ownerOf(type: unknown): string {
  return BLOCK_OWNER[String(type ?? "")] ?? "";
}
