// 本文件由 scripts/gen-registry.ts 自动生成，请勿手工修改。
// 重新生成：bun run registry（make build / make dev 会自动执行）

import type { TemplateModule } from "../core/types";
import t_analysis_html from "../templates/analysis-html/template";
import t_prd_html from "../templates/prd-html/template";
import t_progress_docx from "../templates/progress-docx/template";

export const templates: TemplateModule[] = [
  t_analysis_html,
  t_prd_html,
  t_progress_docx,
];
