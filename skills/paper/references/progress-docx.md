# progress-docx · 国企阶段性进度报告（Word）

用途：向甲方 / 上级单位 / 科技管理部门提交阶段进展报告、中期报告、里程碑汇报。
产出正式 Word：封面 + 自动目录 + 三级标题 + 首行缩进正文 + 数据表 + 图表题 + 页脚页码。
先 `paper describe progress-docx` 读权威契约，再 `paper sample` 起手。

## 数据骨架

    {
      "cover":   { "title": "...", "subtitle": "阶段进展报告",
                   "classify": "内部资料", "code": "JZTJ-2026-08",
                   "fields": [["依托工程","..."],["统计截止","..."]],
                   "org": "...", "date": "..." },
      "tocLabel": "目  录",          // 填 false 关闭目录
      "header":  "阶段进展报告",      // 可选页眉
      "footer":  "XX 项目组",         // 页脚左侧文字
      "blocks":  [ ... ],
      "signoff": { "text": "...", "org": "...", "date": "..." }
    }

## blocks 块类型

    h1 / h2 / h3   章节标题，自动编号 1 / 1.1 / 1.1.1（写 numbered:false 可关）
    p              正文段落，首行缩进 2 字符
    list           列表：items:[...]；ordered:true 为有序
    quote          引文：楷体 + 左竖线
    note           注释：灰色小字
    table          数据表：head[] / rows[][] / widths[] / align[] / caption
    figure         插图：src（相对 data.json 的 png/jpg）或 png（base64）；caption 图注
    pageBreak      强制分页

行内写法：**粗体**、单反引号代码、==强调==。

## 编号由模板负责，不要手写

    标题：h1 每章 +1，h2 章内 +1，h3 节内 +1      ->  1 / 1.1 / 1.1.1
    表图：按一级章节分组                            ->  表 1-1、表 2-3、图 2-1

标题文字已经带编号（如 "1 项目背景"）时不会重复加；`numbered:false` 可强制不加。
表题在表格上方、图注在图片下方，都居中；`caption` 只写文字，前缀自动加。

## 表格列宽的坑

列多时必须给 `widths`（相对值），否则中文长文本会把某一列挤成一字一行：

    { "type": "table", "widths": [2, 3, 4], "head": ["维度","工作量","成果"], "rows": [...] }

逐列对齐用 `align`（left/center/right）。缺省表头居中、内容左对齐，正式报告不加斑马纹。

## 目录与页码

- 目录 = 标题文字 + 点线 + PAGEREF 动态页码，字体缩进跟正文一致。
- 在 Word / WPS 打开会按 settings 里的 updateFields 自动刷新；
  在 macOS 预览这类不刷域的阅读器里只显示标题、页码为空，属正常。
- 分节：封面（无页脚）/ 目录（无页码）/ 正文（页码从 1，页脚「第 X 页 / 共 Y 页」）。
  没有 h1/h2/h3 时目录节自动省略。

## 生成后自检

    paper gen progress-docx -d data.json -o 报告.docx
    textutil -convert txt 报告.docx -stdout | head -60   # 核对文字与编号
