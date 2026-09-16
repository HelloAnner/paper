# prd-html 数据模型（blocks 文档）

prd-html 用来产出"设计过的"长文档：产品需求文档、技术方案、评审材料。
它的 data.json 由一个有序的 blocks[] 描述全文，模板按顺序渲染。

## 顶层字段

    {
      "masthead": "悟帆 / 产品需求文档",      // 顶部小字（左）
      "mastheadRight": "V1.0 · 评审稿",       // 顶部小字（右，可选）
      "title": "...",                        // 必填，主标题
      "tagline": "...",                      // 绿色副标题（一句话主张）
      "meta": "产品需求文档 · V1.0 · ...",     // 灰色元信息（版本/评审状态/作者）
      "tocLabel": "阅读目录",                 // 不填则不出目录
      "tocStyle": "auto",                    // auto（缺省）/ inline 行内 / list 两列编号
                                             // auto：标题长（>10 字）或条目多（>8 条）时用两列编号
      "toc": ["背景", "一、看现状"],           // 可选：手写目录；不写则自动收集全部 h2
      "footer": "...",                       // 文档底部落款
      "blocks": [ ... ]
    }

## 块类型

    { "type": "h2", "text": "背景" }
    { "type": "h3", "text": "1.1 客户场景：具体卡在哪一步" }
    { "type": "h4", "text": "4.1.1 业务应用面板与三个功能入口" }
    { "type": "p", "text": "正文，支持 **粗体**、`代码`、==绿色强调==。" }
    { "type": "list", "ordered": true, "items": ["第一条", "第二条"] }
    { "type": "quote", "text": "需要强调的一段话（绿色竖线引用块）" }
    { "type": "table", "variant": "field-support-table", "head": [...], "rows": [...] }
    { "type": "figure", "src": "figures/01-usage.svg", "caption": "PNG 画幅 · SVG 源图" }

要点：
- 顺序即版面顺序，不要按类型分组。
- h2 会被自动收集成阅读目录；锚点 section-N 由模板按块序号生成。
- 图推荐用 src 指向 svg 文件（相对 data.json 所在目录）；也可以把 SVG 源码塞进 svg 字段。
- 表格 variant 决定列宽：plain / capability-table / field-support-table / goals-table /
  acceptance-table / acceptance-tools-table / acceptance-fields-table / acceptance-skill-table /
  acceptance-index-table。

## 表格单元格的三种写法

    "写入字符串。"                                   // 1. 纯文本（支持内联标记）
    { "status": "yes", "text": "支持" }              // 2. 状态圆标 yes/no/na
    [                                               // 3. 块数组：一个格子里放多段内容
      { "status": "yes", "text": "支持" },
      { "type": "text", "text": "需明确目标成员" },     // 独立成行的小字
      { "type": "p", "text": "第一段" },
      { "type": "list", "ordered": true, "items": ["a", "b"] },
      { "type": "group", "title": "分组小标题", "blocks": [ ...同上... ] }
    ]

行也可以写成对象，用于表内分组分隔线（2px 上边框）：

    { "cells": ["附件", { "status": "no", "text": "不支持" }], "groupStart": true }

## 组件

    masthead / title / toc / prose / tables / figures / footer

prose 负责 h2/h3/h4/p/list/quote，tables 负责 table，figures 负责 figure。
只想要某几类块时用 `-c`：

    paper gen prd-html -d data.json -o out.html -c prose,tables    # 不要图
    paper gen prd-html -d data.json -o out.html -c prose           # 纯文字稿

## 标准流程

    paper describe prd-html                 # 读字段说明
    paper sample prd-html -o data.json      # 拿一份可跑通的骨架
    # 按上面的模型写自己的 blocks
    paper gen prd-html -d data.json -o 报告.html

## 从现有 HTML 迁移

如果手上已经有一份同版式的 HTML，迁移就是"把 HTML 拆成 blocks"：
标题→h2/h3/h4，段落→p，表格→table（单元格按三种写法归类），
`<span class="can-do">`→==强调==，`<strong>`→**加粗**，`<svg>`→figure。
模板自身不含导入器；这类转换属于一次性工作，让 coding agent 写脚本即可。
