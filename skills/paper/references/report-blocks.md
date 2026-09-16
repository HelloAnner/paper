# analysis-html 数据模型（sections 报告）

数据分析报告用 `sections[]` 组织全文，每节内 `blocks[]` 顺序渲染。

## 顶层字段

    {
      "brand": "简道云智能填报 · 数据报告",   // 顶部导航左侧品牌
      "nav": [{ "text": "使用全景", "href": "overview" }],   // 可选；缺省由 sections 生成
      "eyebrow": "生产数据深度分析",          // 蓝色小标签
      "title": "标题，\n用 \n 换行",          // \n 会渲染成 <br>
      "lead": "导语：这份报告回答什么问题",
      "meta": ["生产环境 · 只读分析", "2026-08-19 — 2026-09-01", "539 次当前分析样本"],
      "verdict": { "index": "01", "title": "路线判断：…", "text": "…" },   // hero 里的绿色结论框
      "footer": "页脚说明（可选）",
      "sections": [
        {
          "id": "overview",                  // 锚点 id，nav 会链接到它
          "title": "使用全景",
          "lead": "这一节要回答什么（可省）",
          "sideNote": "右侧小字口径说明（可省）",
          "blocks": [ ... ]
        }
      ]
    }

## 块类型

    文本类
      { "type": "h3", "text": "…" }
      { "type": "p", "text": "支持 **粗体**、`代码`、==强调==。" }
      { "type": "list", "ordered": true, "items": ["…"] }
      { "type": "sub", "text": "行为链路", "tone": "blue" }              // 小节标签（有色条）
      { "type": "callout", "tone": "green", "title": "…", "text": "…" }  // 结论框

    指标与链路
      { "type": "metrics", "columns": 5, "items": [
          { "label": "发起智能填报", "value": "753", "unit": "次",
            "desc": "130 个租户开始尝试填写", "tone": "blue" } ] }

      { "type": "flow", "items": [                                       // 行为链路卡（横向）
          { "num": "01 · 215 个租户", "count": "1004", "label": "读取表单",
            "desc": "…", "final": false } ] }

      { "type": "kpis", "items": [
          { "value": "160", "label": "简道云确认成功", "tone": "good" } ] }   // good / bad / 空

      { "type": "stackedBar", "items": [
          { "percent": 58, "color": "green" }, { "percent": 16.3, "color": "red" } ] }

      { "type": "tags", "items": ["关联 8", "成员 1"] }                  // 字段标签

    对比与分布
      { "type": "bars", "items": [                                       // 名称 + 进度条 + 数值
          { "name": "关联字段", "sub": "8 个场景命中", "percent": 72.3,
            "tone": "blue", "number": "149", "unit": " · 31.6%" } ] }

      { "type": "dualBars", "items": [                                   // 一行两组指标条
          { "name": "关联字段", "bars": [
              { "label": "涉及", "value": "149 · 31.6%", "percent": 72.3, "tone": "blue" },
              { "label": "受阻", "value": "32", "percent": 100, "tone": "red" } ] } ] }

      { "type": "reasons", "items": [
          { "label": "字段值、表单目标或请求未被接受", "value": "120 · 59.4%" } ] }

      { "type": "heatmap", "columns": ["关联", "成员", "图片", "部门", "附件"],
        "rows": [ { "label": "生产与现场运营", "values": [13, 0, 8, 1, 0] } ] }
        // 省略 levels 时按该表最大值自动分 5 档；也可给 "levels": [4,0,4,1,0] 精确控制

    场景卡
      { "type": "scenes", "kicker": "场景家族", "items": [
          { "title": "协作与事项闭环", "total": "102", "totalUnit": "次 · 18.9%",
            "items": [ { "name": "需求、问题与整改闭环", "value": "80", "unit": "14.8%",
                         "meta": "23 个不同表单 · 12 个租户",
                         "examples": "出现最多的实际表单名：…" } ] } ] }

    卡片与容器
      { "type": "panel", "variant": "chart", "title": "字段使用范围与实际受阻次数",
        "subtitle": "…", "blocks": [ ... ] }
      { "type": "panel", "variant": "attribution", "step": "第一段 · 从发起填写到形成表单",
        "title": "753 次发起中，202 次确实没有形成表单", "text": "…", "blocks": [ ... ] }
        // 包住一组图表/证据的卡片；内部块照样用块类型描述

      { "type": "callout", "tone": "blue", "kicker": "需求最明确",
        "title": "需求问题与事项闭环", "text": "…" }        // 结论卡片（kicker 是上方小标签）
      { "type": "banner", "mark": "!", "title": "不能把 753 − 160 理解成 593 次失败", "text": "…" }
      { "type": "proofs", "items": [                        // 证据卡组（4 列）
          { "label": "形成表单前的真实失败", "value": "202", "unit": "次",
            "text": "占 753 次发起的 26.8%…", "tone": "red" } ] }
      { "type": "steps", "items": [                         // 路线阶段卡
          { "phase": "第一阶段 · 最优先", "title": "关联字段 + 成员字段",
            "text": "优先解锁生产、人员、财务、客户和任务分派场景。" } ] }
      { "type": "stats", "items": [{ "value": "22.3%", "label": "第 1 名" }] }   // 四列小统计
      { "type": "donut", "segments": [{ "percent": 22.3 }, { "percent": 18.1 }, { "percent": 12.1 }],
        "inside": { "value": "52.5%", "label": "前 10 名占比" } }
      { "type": "note", "strong": "能力限制不能从这 202 次里直接推算。", "text": "…" }

      flow 的第 2..N 项可以带 "connect"：卡片之间的连接标签
      （如 { "connect": "75.0%" } 表示这张卡前面显示 75.0%）

    结构化
      { "type": "table", "caption": "…", "head": ["租户", "读取表单", …], "rows": [
          [ { "text": "帆软软件有限公司", "code": "…9089f3", "className": "tenant-name" },
            { "value": "168", "bar": 100 },
            { "tags": ["关联 8", "成员 1"] } ] ] }
        // 单元格四种写法：字符串 / {value,bar} / {text,code,className} / {tags}

      { "type": "details", "items": [                                    // 折叠的口径说明
          { "summary": "样本来自哪里", "open": true,
            "blocks": [{ "type": "list", "items": ["…"] }] } ] }

## 标准流程

    paper describe analysis-html
    paper sample analysis-html -o data.json       # 骨架（含全部块类型示例）
    # 按上面的模型填真实数据
    paper gen analysis-html -d data.json -o 报告.html

## 写数据的几条经验

- 一节只回答一个问题；节标题直接写结论（如"覆盖 12 个场景，7 个已有稳定产出"）。
- 数字要能互相验证：KPI 卡的分子分母、进度条的百分比、明细表的合计别打架。
- 口径与限制统一放 details，正文只放结论和证据。
- tone 只用四种：green 正向 / red 问题 / amber 待观察 / blue 中性。
