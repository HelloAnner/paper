# 内置模板速查（两套，都是 HTML）

选模板只看 `paper list` 里的 useWhen；确定后先 `paper describe <模板 id>` 读数据契约。

## prd-html · 产品需求文档（HTML）

用途：可评审、可打印、可直接发链接的完整 PRD / 技术方案；多级章节 + 大量表格 + 示意图。
数据模型见 [prd-blocks.md](prd-blocks.md)。

    masthead  必选  顶部横线 + 文档类别小字（左右）
    title     必选  主标题 + 绿色副标题 + 灰色元信息
    toc       可选  阅读目录（只列 h2；短标题行内，长标题两列编号）
    prose     必选  多级标题、段落、列表、引用块
    tables    可选  数据表（状态圆标 / 表内列表 / 单元格分组 / 8 种版式列宽）
    figures   可选  内联 SVG 图 + 右对齐图注
    footer    可选  落款

填写要点：
- `blocks[]` 顺序即版面顺序，不要按类型分组。
- 表格优先选 variant（field-support-table / acceptance-table / capability-table …），列宽跟着版式走。
- 支持矩阵用状态圆标：`{ "status": "yes" | "no" | "na", "text": "支持" }`。
- 图用 `src` 指向 svg（相对 data.json 所在目录），也可以把 SVG 源码放进 `svg` 字段。

## analysis-html · 数据分析报告（HTML）

用途：用生产/业务数据回答"数据到底在说什么"的报告——KPI 卡、行为链路、排名进度条、
双指标对比、原因分布、热力网格、场景卡、租户明细表。数据模型见 [report-blocks.md](report-blocks.md)。

    nav       必选  顶部导航（品牌 + 锚点链接）
    hero      必选  eyebrow + 标题 + 导语 + meta 胶囊 + 结论框
    prose     必选  h3 / 段落 / 列表 / 小节标签（sub）/ 结论框（callout）
    metrics   可选  指标卡组 / 行为链路 / 字段标签 / 归因 KPI / 堆叠条
    charts    可选  排名进度条 / 双指标行 / 原因分布 / 热力网格
    scenes    可选  场景家族卡（名称 + 计数 + 占比 + 示例）
    tables    可选  明细表（数值格 + 迷你条 + 标签格）+ 折叠口径说明
    footer    可选  页脚说明

填写要点：
- 数据用 `sections[]` 组织：每节有 id / title / lead / sideNote / blocks[]。
- 颜色有语义：`tone` 取 green（正向）/ red（问题）/ amber（待观察）/ blue（中性强调），
  不要随手换色；同一指标在不同节里保持一致。
- 数值务必可自洽：正文里的百分比、分子分母要和图表里的对得上。
- 口径、样本范围、限制条件放进 `details` 块（默认展开第一条），不要塞进正文。
