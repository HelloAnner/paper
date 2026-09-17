---
name: paper
description: 生成本地离线专业文档（docx / pdf / html）。当用户要求"生成/写一份报告、周报、分析报告、会议纪要、文档、word、pdf、网页速览""把这份数据做成正式文档""导出成 docx/pdf"时使用。通过 paper CLI 用「固定模板 + 动态数据」产出排版稳定的文档：先 `paper list` 选模板，`paper describe` 读数据契约，`paper sample` 拿示例数据填内容，`paper gen` 生成文件。内置 Word 阶段性进度报告、HTML 产品需求文档 / 数据分析报告模板，支持按组件自由组装。
---

# paper —— 本地离线文档生成 CLI

paper 把一份 JSON 数据套进内置模板，产出排版稳定的 docx / pdf / html。
排版细节（字体、字号、间距、表格样式、页眉页脚、中文字体嵌入）都在模板里写死，
AI 只需要负责"内容填得对、填得实"。

## 铁律

1. **不要自己写 docx/pdf 生成脚本、不要写排版代码**。先 `paper list` 看有没有合适的模板，
   有就用模板。没有合适的模板就告诉用户缺哪个模板，而不是临时手搓排版。
2. **填数据前必须读契约**：`paper describe <模板 id>`。字段说明写清了该填什么、什么格式、
   给了例子，不要凭字段名猜。
3. **不要用占位内容**。禁止"示例文本""待补充""TODO""xxx"这类假数据。数据必须来自用户提供的
   信息或真实分析；信息不足时先问用户，或先写可核实的最小版本，并在交付时说明缺什么。
4. **数字必须自洽**：表格里的合计、环比、百分比要和正文说法一致。
5. **生成后要验证**。PDF 用 `bun run cli/scripts/preview.ts out.pdf 1,2` 导出 PNG 看一眼；
   docx 至少用 `textutil -convert txt out.docx -stdout`（macOS）核对一遍文字。
6. **临时文件必须清干净**。中间的 data.json、预览 PNG/PDF 都要删掉，只留最终交付的文件；
   能用 /tmp 就别污染用户目录。

## 标准流程

```bash
paper list                            # 1. 看有哪些模板，读 useWhen 选一个
paper describe <模板 id>               # 2. 读数据契约（必做）
paper sample <模板 id> -o data.json    # 3. 拿示例数据当骨架，再替换成真实内容
paper gen <模板 id> -d data.json -o 报告.docx   # 4. 生成
paper doctor                          # 环境异常时自检
```

## 常用参数

```text
-d, --data <file>       数据 JSON
-o, --out <file>        输出路径，缺省为 <模板 id>.<格式>
-c, --component <id>    只渲染指定组件（可重复或逗号分隔）
    --json              机器可读输出（AI 调用建议加上）
    --open              生成后用系统程序打开（macOS）
```

`--json` 时 stdout 是 JSON，过程信息在 stderr，可以放心解析 stdout：
成功是 `{ok:true, out, bytes, components}`，失败是 `{ok:false, error}` 且退出码 1。

## 组件装配

模板由组件拼成，`paper list <模板 id>` 能列出组件清单和"可选组件的触发条件"：

    · summary   本周概况   必选  开篇一段话
    · metrics   关键指标   可选  data.metrics 有内容时自动出现

可选组件是"有数据才出现"：填了 risks 就出风险表，不填就不生成。
也可以 `-c metrics,risks` 强制只出这几块（顺序即渲染顺序）。

## 内置模板（两套 HTML + 一套 Word）

    progress-docx   国企阶段性进度报告（Word）  封面 + 自动目录 + 三级标题自动编号 + 首行缩进正文
                                                + 灰底表头数据表 + 居中图表题 + 页脚页码
    prd-html        产品需求文档（HTML）        页眉条 + 标题区 + 两列目录 + 多级标题 + 数据表 + 内联 SVG 图
    analysis-html   数据分析报告（HTML）        导航 + hero 结论 + 指标卡 + 行为链路 + 进度条 + 热力网格 + 场景卡 + 明细表

三套都是"文档型模板"：data.json 用有序结构描述全文（progress-docx / prd-html 用 blocks[]，
analysis-html 用 sections[].blocks[]），模板逐块分发给对应组件，
所以顺序由数据决定，也能用 `-c` 只出某几类块。

    · 写阶段进展报告 / 中期报告 / 里程碑汇报，要 Word 正式版式  -> progress-docx
    · 写 PRD / 技术方案 / 评审材料（章节 + 表格 + 示意图）      -> prd-html
    · 写数据分析报告（KPI 卡 + 排名 + 热力网格 + 明细表）       -> analysis-html

选不准时先 `paper list` 读三者的 useWhen。

progress-docx 要点（详见 references/progress-docx.md）：
- 标题不要手写编号：模板自动出 1 / 1.1 / 1.1.1，表图自动出「表 1-1」「图 2-1」。
- 目录是「文字 + 点线 + PAGEREF 动态页码」，在 Word / WPS 打开即刷新；
  只在 macOS 预览里看会只显示标题、页码为空，属正常现象。
- 字体按角色固化（宋体正文 / 黑体标题 / 楷体引文），不要试图在数据里指定字体。

数据模型分别见 references/progress-docx.md、references/prd-blocks.md、references/report-blocks.md。

## 正文内联写法（html 模板通用）

    **加粗**
    `反引号`包起来的是行内代码
    ==绿色强调==       -> 原设计里的 .can-do，用来点亮结论句；可以嵌在 **加粗** 里面

细节见：
- [references/cli.md](references/cli.md)              命令与输出契约
- [references/templates.md](references/templates.md)  每个模板的字段要点
- [references/progress-docx.md](references/progress-docx.md) progress-docx 的 blocks 模型与编号规则
- [references/prd-blocks.md](references/prd-blocks.md) prd-html 的 blocks 文档模型（写长文档必读）
- [references/authoring.md](references/authoring.md)  新增模板 / 组件（给 coding agent）

## 环境

- `paper doctor` 全绿即可用；PDF 中文字体由 `make install` 装到
  `~/.local/share/paper/fonts`，缺字体时重跑仓库里的 `make fonts`。
- 不要修改项目里的 AGENTS.md。
