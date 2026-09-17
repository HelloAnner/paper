# 内置模板速查（两套 HTML + 一套 Word）

选模板只看 `paper list` 里的 useWhen；确定后先 `paper describe <模板 id>` 读数据契约。

## progress-docx · 国企阶段性进度报告（Word）

用途：向甲方 / 上级单位 / 科技管理部门提交阶段进展报告、中期报告、里程碑汇报。
产出正式 Word：封面 + 自动目录 + 三级标题自动编号 + 首行缩进正文 + 数据表 + 图表题 + 页脚页码。
数据模型与编号规则见 [progress-docx.md](progress-docx.md)。

    cover     必选  封面：密级/编号 + 主标题 + 副标题 + 项目要素表 + 编制单位/日期
    toc       可选  自动目录（blocks 里有 h1/h2/h3 且 tocLabel 不为 false）；文字 + 点线 + 动态页码
    prose     必选  h1/h2/h3（自动编号）、正文、列表、引文、注释、分页
    tables    可选  type=table 的块：自动表题（表 N-M）、灰底表头、相对列宽、逐列对齐
    figures   可选  type=figure 的块：按比例缩放，图注自动编号（图 N-M）
    signoff   可选  正文末尾落款（右对齐）

填写要点：
- **标题不写编号**，模板自动出 1 / 1.1 / 1.1.1；表图编号也自动（表 1-1、图 2-1）。
- 列多的表一定给 `widths`（相对值），否则中文长文本会把列挤变形。
- 图片用 `src` 指相对 data.json 的 png/jpg，宽图用 `widthMm` 限宽。
- 目录页码是动态域，在 Word / WPS 打开自动刷新；macOS 预览里页码为空属正常。

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
