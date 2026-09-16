// 本文件由 scripts/gen-registry.ts 自动生成，请勿手工修改。
// 重新生成：bun run registry（make build / make dev 会自动执行）

import type { TemplateModule } from "../core/types";
import t_analysis_report from "../templates/analysis-report/template";
import t_brief_html from "../templates/brief-html/template";
import t_prd_html from "../templates/prd-html/template";
import t_weekly_report from "../templates/weekly-report/template";

export const templates: TemplateModule[] = [
  t_analysis_report,
  t_brief_html,
  t_prd_html,
  t_weekly_report,
];
