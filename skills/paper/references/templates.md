# 内置模板速查

## weekly-report · 工作周报（docx）

用途：按周/双周汇报进展、指标、风险与下阶段计划，直接发主管。

    summary     必选  本周概况（一段话，2-4 句）
    metrics     可选  data.metrics 非空时出现：指标 / 本周 / 环比 / 说明
    progress    可选  data.progress 非空时出现：事项 / 负责人 / 状态 / 进度 / 说明
    risks       可选  data.risks 非空时出现：风险 / 影响 / 应对
    next-plan   可选  data.nextPlan 非空时出现：编号清单，带负责人与截止时间

填写要点：
- `period` 用「2026-03-02 ~ 03-06」这种可读区间。
- `metrics` 每条都要有 `value`；`delta` 写环比（+3.7pp / -0.38s），不要写"上升"。
- `progress` 的 `status` 建议统一用「已完成 / 进行中 / 阻塞」。
- `risks` 只写真的会影响交付的；没有就删掉整个字段（组件自动消失）。
- `closing` 写"需要谁支持什么"，没有就不填。

## analysis-report · 分析报告 · 打印版（pdf）

用途：结论先行的分析报告，3-10 页，可直接打印/发送。

    cover       必选  整页封面（标题 / 副标题 / 作者 / 机构 / 日期 / 页脚）
    summary     必选  执行摘要 + 可选要点 highlights
    metrics     可选  3 列指标卡（label / value / hint）
    sections    可选  正文章节（heading + paragraphs[] + bullets[]）
    tables      可选  数据表（caption / head[] / rows[][] / widths[]）
    conclusion  可选  结论段落 + 行动项编号清单

填写要点：
- `summary` 是"领导只读这一段"的部分：结论、依据、建议动作，3-5 句。
- `metrics` 建议 3 或 6 个（每行 3 张卡）；`hint` 写达成率/同比这类小字。
- `tables[].rows` 是二维数组，每行长度与 `head` 一致；列宽比例用 `widths`（如 [3,2,2,2,1]）。
- `footer` 适合写「内部资料 · 请勿外传」。
- 表格跨页会自动重画表头，不需要手动分页。

## prd-html · 产品需求文档（html）

用途：一份能被评审、能打印、能直接发链接的完整 PRD / 技术方案，内容包含多级章节、
大量表格与示意图。数据模型见 [prd-blocks.md](prd-blocks.md)。

    masthead  必选  顶部横线 + 文档类别小字
    title     必选  标题区（主标题 + 绿色副标题 + 灰色元信息）
    toc       可选  阅读目录（有 tocLabel 或 toc 时出现，只列 h2）
    prose     必选  多级标题、段落、列表、引用块
    tables    可选  blocks 里出现 table 时自动出现
    figures   可选  blocks 里出现 figure 时自动出现
    footer    可选  有 footer 字段时出现

填写要点：
- blocks[] 顺序即版面顺序；h2 自动进目录。
- 表格优先选 variant（field-support-table / acceptance-table / capability-table 等），
  列宽跟着版式走，不要手写 widths 除非确有需要。
- 支持矩阵用状态圆标：{ "status": "yes" | "no" | "na", "text": "支持" }。
- 图用 src 指向 svg（相对 data.json 所在目录）；图注一般是「PNG 画幅 · SVG 源图」。

## brief-html · 一页速览（html）

用途：单文件网页速览，浏览器打开即可，也能直接打印成 PDF。

    hero        必选  标题（模板直接渲染）
    highlights  必选  核心要点列表
    kv          可选  data.kv 非空时出现：键值信息（负责人 / 周期 / 链接）
    table       可选  data.table 有表头与数据时出现
    note        可选  data.note 非空时出现：页脚备注

填写要点：
- `highlights` 3-5 条，一条一个结论，不要写成段落。
- 输出是自包含 HTML（CSS 内联），可直接发给别人或用浏览器打印。
