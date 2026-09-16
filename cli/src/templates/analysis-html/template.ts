/**
 * 模板：数据分析报告 · HTML（analysis-html）
 *
 * 复刻"现代数据报告"版式：暖白底 + sticky 导航 + 结论头图 + 分节正文
 * （KPI 卡片 / 链路卡 / 归因面板 / 条形图 / 热力网格 / 场景卡 / 明细表）。
 *
 * 文档顺序怎么保证：
 *   sections[].blocks[] 是有序数组，模板按顺序遍历；每个块交给"负责这类块"的组件，
 *   通过 ctx.renderBlock(组件 id, 块) 调用。这样既保证版面顺序，又让 --component
 *   能只出某几类块（例如只出 charts + tables）。
 */

import { defineTemplate } from "../../core/types";
import { BLOCK_OWNER } from "./blocks";
import { ANALYSIS_CSS } from "./style";
import nav from "./components/nav/component";
import hero from "./components/hero/component";
import prose from "./components/prose/component";
import metrics from "./components/metrics/component";
import charts from "./components/charts/component";
import scenes from "./components/scenes/component";
import tables from "./components/tables/component";
import footer from "./components/footer/component";

export { BLOCK_OWNER };

/** blocks 的完整契约写在一行里：describe 时 AI 只读 schema，不需要再翻文档。 */
const BLOCKS_DESC =
  "章节里的块，顺序即版面顺序，每块必须有 type。" +
  "文字类：h3{text}；p{text，行内支持 **粗体**、单反引号代码、==强调==}；list{items,ordered?}；sub{text,tone:green|red|amber|blue}；callout{tone,title,text}（整段纯色结论框）或 callout{kicker,title,text,tone}（卡片式结论）或 callout{columns?,items:[{tone,kicker,title,text}]}（一组卡片，原文档的 .grid.grid-3）；banner{mark?,title,text}（truth-banner 醒目提示）；note{strong,text}（evidence-note 口径提示）。" +
  "指标类：metrics{columns?,items:[{label,value,unit?,desc?,tone?}]}；flow{items:[{num,count,label,desc?,final?,connect?}],aria?,note?}（connect 是这一格与上一格之间的连接标签，缺省 →；final 让最后一格变绿）；tags{items}（字符串或 {text,none}）；kpis{items:[{value,label,tone:good|bad|空}]}（attribution-kpis，一般放进 panel 里）；stackedBar{aria?,items:[{percent,color}]}（color 取 green|red|amber|blue 或 #hex）；proofs{items:[{label,value,unit?,text,tone?}]}（proof-grid，一排放 4 张）；steps{items:[{phase,title,text}]}（roadmap 路线，一排放 4 步）；stats{items:[{value,label}]}（distribution-line，4 列）。" +
  "图表类：bars{aria?,items:[{name,sub?,percent,tone?,number,unit?}]}；dualBars{aria?,items:[{name,bars:[{label,value,percent,tone}]}]}；reasons{items:[{label,value}]}；heatmap{aria?,columns,rows:[{label,values,levels?}]}（levels 是 0-4 档位，省略时按全表最大值自动分 5 档，0 恒为 heat-0）；donut{segments:[{percent,color?}],inside:{value,label},title?,text?}（conic-gradient 按 segments 算，缺省蓝系三段 + 底色补满；带 title/text 时套成 chart-panel.concentration）。这些图表块只出内容本身，标题交给 panel。" +
  "panel 是卡片容器：variant=chart 给 title/subtitle + blocks，渲染 .chart-panel；variant=attribution 给 step/title/text + blocks，渲染 .attribution-panel；要并排放两张归因卡就用 panel{variant:\"attribution\",items:[{step,title,text,blocks}]}，渲染 .attribution-grid。blocks 里的块照上面的规则写，仍由各自组件渲染。" +
  "场景类：scenes{kicker?,items:[{title?,total?,totalUnit?,tone?,items:[{name,value,unit?,meta?,examples?}]}]}（某一组 title 为空表示只给一组条目，不套家族卡）。" +
  "结构类：table{caption?,head,rows}，单元格三种写法：字符串、{value,bar?}（数字列，bar 取 0-100 画 mini-bar）、{text,code?,className?}（主展示 + 灰色编号）、{tags}（字段标签，空数组渲染成「无」）；details{items:[{summary,open?,blocks}]}（blocks 里可再放 list/p/h3/callout）。";

export default defineTemplate({
  meta: {
    id: "analysis-html",
    name: "数据分析报告（HTML）",
    format: "html",
    description: "单文件 HTML 数据分析报告：顶部导航 + 结论头图 + KPI 卡片 + 条形图 / 双指标 / 热力网格 + 场景卡 + 明细表，样式内置，可直接分享或浏览器打印",
    useWhen: "要回答「数据到底在说什么」的分析报告：需要 KPI 卡片、排行条形图、热力网格、场景卡和明细表；生产数据、使用情况、行为分析这类报告选它",
    tags: ["数据分析", "报告", "HTML"],
  },

  schema: {
    brand: { type: "string", desc: "顶部导航左侧的品牌文字", example: "云巡检 · 设备点检数据报告" },
    nav: {
      type: "array",
      desc: "顶部导航链接；不填就用 sections 里有 id + title 的章节自动生成。每项 {text,href}，href 只写锚点 id",
      items: {
        type: "object",
        desc: "一条导航链接",
        fields: {
          text: { type: "string", required: true, desc: "链接文字，例如「巡检全景」", example: "巡检全景" },
          href: { type: "string", desc: "锚点 id，对应 section.id，不要带 #", example: "overview" },
        },
      },
    },
    eyebrow: { type: "string", desc: "hero 最上方蓝色小标（前面自动带 18x3 短横线）", example: "设备巡检数据深度分析" },
    title: { type: "string", required: true, desc: "hero 主标题；写 \n 手动断行，会渲染成 <br>", example: "设备巡检：填报已经覆盖一线班组，\n真正的缺口集中在照片与关联设备字段" },
    lead: { type: "string", desc: "hero 导语：一段话说清这份报告回答什么问题", example: "基于巡检系统的全部可用点检记录，拆解真实作业场景与字段阻碍。" },
    meta: {
      type: "string[]",
      desc: "hero 下方 2-3 枚小胶囊：环境与口径、时间范围、样本量",
      example: ["生产环境 · 只读分析", "2026-07-01 — 2026-07-14", "1,248 条分析样本"],
    },
    verdict: {
      type: "object",
      desc: "hero 下方绿色结论框（整篇报告最想说的一句话）",
      fields: {
        index: { type: "string", desc: "左侧序号方块文字", example: "01" },
        title: { type: "string", required: true, desc: "结论句", example: "路线判断：第一优先补齐照片字段与关联设备字段" },
        text: { type: "string", desc: "结论说明，1-3 句，写清依据", example: "照片字段使用范围最大，出现在 41.2% 的有效记录中。" },
      },
    },
    footer: { type: "string", desc: "页脚文字；写 \n 分成多段，左右排布", example: "云巡检 · 设备点检数据报告\n只读分析 · 2026 年 7 月 15 日" },
    sections: {
      type: "array",
      required: true,
      desc: "章节数组，顺序即版面顺序；每章渲染成 <section id> + section-head（标题 + 导语 + 右侧小字）",
      items: {
        type: "object",
        desc: "一个章节",
        fields: {
          id: { type: "string", required: true, desc: "章节锚点 id，nav 链接用", example: "overview" },
          title: { type: "string", required: true, desc: "章节标题（26px）", example: "巡检全景" },
          lead: { type: "string", desc: "章节导语，一句话说明本节回答什么", example: "从「领取任务」到「归档闭环」，一线已经形成完整作业链路。" },
          sideNote: { type: "string", desc: "标题右侧灰色小字，写统计口径提醒", example: "下方统计的是作业次数，不是设备台数" },
          blocks: { type: "array", required: true, desc: BLOCKS_DESC },
        },
      },
    },
  },

  components: [nav, hero, prose, metrics, charts, scenes, tables, footer],

  sample: {
    brand: "云巡检 · 设备点检数据报告",
    nav: [
      { text: "巡检全景", href: "overview" },
      { text: "场景分布", href: "scenes" },
      { text: "字段阻碍", href: "fields" },
      { text: "重点班组", href: "tenants" },
      { text: "作业路线", href: "roadmap" },
      { text: "分析口径", href: "method" },
    ],
    eyebrow: "设备巡检数据深度分析",
    title: "设备巡检：填报已经覆盖一线班组，\n真正的缺口集中在照片与关联设备字段",
    lead: "基于巡检系统的全部可用点检记录，拆解真实作业场景、字段能力阻碍与高频班组。报告保留关键明细，同时用多组图表回答两个核心问题：一线到底在检什么，以及哪类字段最值得优先补齐。",
    meta: ["生产环境 · 只读分析", "2026-07-01 — 2026-07-14", "1,248 条分析样本"],
    verdict: {
      index: "01",
      title: "路线判断：第一优先补齐照片字段与关联设备字段",
      text: "照片字段使用范围最大，出现在 41.2% 的有效记录中；关联设备造成的「必填但无法填写」最多，共影响 31 次作业。定位字段适合从夜间巡检切入；手写签名虽然常见，但绝大多数时候不会直接卡住提交。",
    },
    footer: "云巡检 · 设备点检数据报告\n只读分析 · 2026 年 7 月 15 日",
    sections: [
      {
        id: "overview",
        title: "巡检全景",
        lead: "从「领取任务」到「归档闭环」，一线已经形成完整作业链路；班组触达较广，但深度使用仍集中在少数班组。",
        sideNote: "下方统计的是作业次数，不是设备台数",
        blocks: [
          {
            type: "metrics",
            columns: 5,
            items: [
              { label: "发起巡检", value: "2,486", unit: "次", desc: "168 个班组开始尝试点检", tone: "blue" },
              { label: "有效记录", value: "1,248", unit: "条", desc: "142 个班组、386 类设备" },
              { label: "闭环归档", value: "612", unit: "条", desc: "96 个班组完成闭环", tone: "green" },
              { label: "关键项缺失", value: "184", unit: "次", desc: "占有效记录的 14.7%", tone: "red" },
              { label: "一线人员", value: "397", unit: "人", desc: "分布在 214 个巡检组" },
            ],
          },
          { type: "sub", text: "作业链路", tone: "blue" },
          {
            type: "flow",
            aria: "巡检作业链路：2486 次领取任务、1974 次开始点检、1248 次形成记录、790 次提交归档、612 次闭环完成",
            note: "这是一条行为链路，不是同一批记录逐条流转的严格漏斗。只有「790 次提交归档 → 612 次闭环完成」使用同一批结果，可以直接计算 77.5% 的成功率。",
            items: [
              { num: "01 · 168 个班组", count: "2,486", label: "领取任务", desc: "查看本期需要点检的设备" },
              { num: "02 · 142 个班组", count: "1,974", label: "开始点检", desc: "逐项填写检查结果", connect: "79.4%" },
              { num: "03 · 121 个班组", count: "1,248", label: "形成记录", desc: "1,010 条可提交，238 条仍需补充", connect: "63.2%" },
              { num: "04 · 88 个班组", count: "790", label: "提交归档", desc: "512 台设备，共发生 790 次尝试", connect: "512 台" },
              { num: "05 · 96 个班组", count: "612", label: "闭环完成", desc: "系统确认归档成功", final: true, connect: "77.5%" },
            ],
          },
          {
            type: "banner",
            mark: "!",
            title: "不能把 2,486 − 612 理解成 1,874 次失败",
            text: "2,486 次是「开始点检」的动作，612 次是「写入成功」的结果；中间既有重复尝试，也有班组停在检查、补充或等待阶段。能确认的是两段独立结果：形成记录前有 738 次真实失败，正式提交后有 178 次真实失败。",
          },
          { type: "sub", text: "深度归因：真正失败在哪里", tone: "green" },
          {
            type: "panel",
            variant: "attribution",
            items: [
              {
                step: "第一段 · 从领取任务到形成记录",
                title: "2,486 次领取中，738 次没有形成记录",
                text: "记录显示 1,748 次已经形成可填写记录，其中 1,510 条可以直接提交、238 条保留但仍需继续补充。因此这一段的真实失败率是 29.7%，而不是用 2,486 减去 1,248 得到的 49.8%。",
                blocks: [
                  {
                    type: "kpis",
                    items: [
                      { value: "1,748", label: "已经形成记录", tone: "good" },
                      { value: "738", label: "明确失败或被拒绝", tone: "bad" },
                      { value: "29.7%", label: "这一段的真实失败率" },
                    ],
                  },
                  {
                    type: "stackedBar",
                    aria: "738 次形成记录前失败的原因分布",
                    items: [
                      { percent: 54.2, color: "red" },
                      { percent: 16.8, color: "amber" },
                      { percent: 9.1, color: "blue" },
                      { percent: 5.4, color: "#86A2EA" },
                      { percent: 14.5, color: "#B7B3A9" },
                    ],
                  },
                  {
                    type: "reasons",
                    items: [
                      { label: "字段值或请求未被接受", value: "400 · 54.2%" },
                      { label: "返回内容异常或等待超时", value: "124 · 16.8%" },
                      { label: "身份或权限尚未就绪", value: "67 · 9.1%" },
                      { label: "服务暂时不可用", value: "40 · 5.4%" },
                      { label: "未保留更细原因", value: "107 · 14.5%" },
                    ],
                  },
                  {
                    type: "note",
                    strong: "能力限制不能从这 400 次里直接推算。",
                    text: "记录只保存到「校验未通过」这一层，没有具体字段，无法证明是照片、关联设备等能力造成的。",
                  },
                ],
              },
              {
                step: "第二段 · 从正式提交到系统返回结果",
                title: "790 次提交中，612 次成功、178 次未成功",
                text: "这一段是同口径结果，可以确认真实成功率 77.5%。178 次未成功全部有最终结果，但现有记录不足以把它们直接归因到某一种字段能力。",
                blocks: [
                  {
                    type: "kpis",
                    items: [
                      { value: "612", label: "系统确认成功", tone: "good" },
                      { value: "178", label: "系统未返回成功", tone: "bad" },
                      { value: "22.5%", label: "这一段的真实失败率" },
                    ],
                  },
                  {
                    type: "stackedBar",
                    aria: "790 次提交结果分布",
                    items: [
                      { percent: 77.5, color: "green" },
                      { percent: 12.4, color: "red" },
                      { percent: 6.1, color: "amber" },
                      { percent: 4.0, color: "#B7B3A9" },
                    ],
                  },
                  {
                    type: "reasons",
                    items: [
                      { label: "成功写入", value: "612 · 77.5%" },
                      { label: "检查项校验未通过", value: "98 · 12.4%" },
                      { label: "提交前表单结构或状态已变化", value: "48 · 6.1%" },
                      { label: "系统返回通用错误", value: "32 · 4.0%" },
                    ],
                  },
                  {
                    type: "note",
                    strong: "能直接证明由本报告所列字段能力造成的提交失败：0 次。",
                    text: "这不代表实际为零，而是现有记录无法完成这一步归因。",
                  },
                ],
              },
            ],
          },
          {
            type: "proofs",
            items: [
              { label: "已明确观察到能力碰壁", value: "184", unit: "次", tone: "amber", text: "检查表中出现必填、为空且当前无法写入的字段；这是「受能力影响」，不等于都已提交失败。" },
              { label: "形成记录前的真实失败", value: "738", unit: "次", tone: "red", text: "占 2,486 次领取的 29.7%；其中没有足够字段信息做能力归因。" },
              { label: "正式提交后的真实失败", value: "178", unit: "次", tone: "red", text: "占 790 次提交的 22.5%；包含校验、表单变化与通用错误。" },
              { label: "能被现有记录直接归因到目标字段", value: "0", unit: "次", tone: "green", text: "表示「目前无法证明」，要计算最终损失率需要补充字段级失败记录。" },
            ],
          },
        ],
      },
      {
        id: "scenes",
        title: "检查场景分布",
        lead: "先用三个业务领域看全貌，再拆成具体场景；每个场景都保留记录里真实的检查项名称，便于直接判断一线究竟在做什么。",
        sideNote: "基于 1,248 条可填写记录",
        blocks: [
          {
            type: "panel",
            variant: "chart",
            title: "第一层：三个业务领域的整体分布",
            subtitle: "这里只用于看全貌；真正的场景判断请看下方细分场景",
            blocks: [
              {
                type: "bars",
                aria: "三个业务领域的巡检次数分布",
                items: [
                  { name: "生产与设备", sub: "点检、保养、能耗、维修", percent: 100, tone: "blue", number: "512", unit: " · 41.0%" },
                  { name: "安全与环保", sub: "消防、隐患、污水、危化品", percent: 64.5, tone: "green", number: "330", unit: " · 26.4%" },
                  { name: "行政与后勤", sub: "门禁、车辆、食堂、宿舍", percent: 41.6, number: "213", unit: " · 17.1%" },
                  { name: "未归类与明确测试", sub: "名称不足，或名称明确表示测试用途", percent: 37.7, tone: "amber", number: "193", unit: " · 15.5%" },
                ],
              },
            ],
          },
          {
            type: "callout",
            tone: "blue",
            title: "场景不是预设出来的：",
            text: "下方场景完全根据记录里实际保存的检查项名称逐条归纳，代表案例保留原名和真实次数。名称缺失或含义不清的 193 次单独保留为「暂不归类」，没有根据常识补写或猜测场景。",
          },
          {
            type: "scenes",
            kicker: "业务领域",
            items: [
              {
                title: "生产与设备",
                total: "512",
                totalUnit: "次 · 41.0%",
                items: [
                  {
                    name: "设备点检与保养",
                    value: "318",
                    unit: "25.5%",
                    meta: "46 个不同检查表 · 52 个班组",
                    examples: "出现最多的实际检查表：空压机日常点检（88）、注塑机保养表（64）、配电柜巡检（41）、行车点检（22）。",
                  },
                  {
                    name: "故障报修与维修",
                    value: "128",
                    unit: "10.3%",
                    meta: "21 个不同检查表 · 34 个班组",
                    examples: "出现最多的实际检查表：设备报修单（57）、产线异常记录（29）、维修工单（18）。",
                  },
                ],
              },
              {
                title: "安全与环保",
                total: "330",
                totalUnit: "次 · 26.4%",
                tone: "amber",
                items: [
                  {
                    name: "消防与安全检查",
                    value: "196",
                    unit: "15.7%",
                    meta: "28 个不同检查表 · 41 个班组",
                    examples: "出现最多的实际检查表：消防设施月检（72）、车间安全检查（58）、隐患上报（37）。",
                  },
                  {
                    name: "环保与能耗记录",
                    value: "134",
                    unit: "10.7%",
                    meta: "17 个不同检查表 · 26 个班组",
                    examples: "出现最多的实际检查表：污水日检（45）、危废入库（33）、用电抄表（28）。",
                  },
                ],
              },
              {
                title: "行政与后勤",
                total: "213",
                totalUnit: "次 · 17.1%",
                tone: "green",
                items: [
                  {
                    name: "门禁与车辆管理",
                    value: "121",
                    unit: "9.7%",
                    meta: "14 个不同检查表 · 22 个班组",
                    examples: "出现最多的实际检查表：车辆出车检查（49）、门禁巡检（32）、通勤车消杀（21）。",
                  },
                  {
                    name: "食堂与宿舍检查",
                    value: "92",
                    unit: "7.4%",
                    meta: "11 个不同检查表 · 18 个班组",
                    examples: "出现最多的实际检查表：食堂卫生自查（38）、宿舍安全抽查（27）。",
                  },
                ],
              },
            ],
          },
          {
            type: "list",
            items: [
              "生产与设备的点检类记录最多，真正无法完成的也集中在这里；",
              "安全与环保类记录完成率最高，几乎不依赖照片以外的能力；",
              "未归类的 193 次里有 121 次没有检查项名称，分析时未做任何猜测。",
            ],
          },
          {
            type: "callout",
            columns: 3,
            items: [
              { tone: "green", kicker: "最容易形成结果", title: "安全与环保", text: "330 次中有 268 次成功归档，成功占比 81.2%，是当前样本中完成最顺畅的一组业务场景。" },
              { tone: "blue", kicker: "需求最明确", title: "设备点检与保养", text: "318 次点检是最大的单一具体场景；再加工故障报修后，生产与设备合计达到 512 次。" },
              { tone: "amber", kicker: "分析边界", title: "15.5% 暂不归类", text: "193 次缺少清晰的检查项名称，其中 121 次完全没有名称；这部分不用于放大任何一个场景的规模。" },
            ],
          },
        ],
      },
      {
        id: "fields",
        title: "字段阻碍与能力优先级",
        lead: "「出现很多」不等于「最妨碍提交」。这里把使用范围与「必填但无法填写」分开，优先识别真正导致点检无法完成的字段。",
        sideNote: "986 次作业的字段信息完整",
        blocks: [
          { type: "h3", text: "3.1 字段使用范围与实际受阻次数" },
          {
            type: "panel",
            variant: "chart",
            title: "字段使用范围与实际受阻次数",
            subtitle: "左：多少次作业涉及该字段；右：多少次因为该字段必填、为空、又无法填写而受阻",
            blocks: [
              {
                type: "dualBars",
                aria: "照片、关联设备、成员、定位、手写签名字段的使用范围和实际受阻次数",
                items: [
                  {
                    name: "照片字段",
                    bars: [
                      { label: "涉及", value: "406 · 41.2%", percent: 100, tone: "blue" },
                      { label: "受阻", value: "36", percent: 100, tone: "red" },
                    ],
                  },
                  {
                    name: "关联设备",
                    bars: [
                      { label: "涉及", value: "352 · 35.7%", percent: 86.7, tone: "blue" },
                      { label: "受阻", value: "31", percent: 86.1, tone: "red" },
                    ],
                  },
                  {
                    name: "成员字段",
                    bars: [
                      { label: "涉及", value: "288 · 29.2%", percent: 70.9, tone: "blue" },
                      { label: "受阻", value: "24", percent: 66.7, tone: "red" },
                    ],
                  },
                  {
                    name: "定位字段",
                    bars: [
                      { label: "涉及", value: "141 · 14.3%", percent: 34.7, tone: "blue" },
                      { label: "受阻", value: "12", percent: 33.3, tone: "red" },
                    ],
                  },
                  {
                    name: "手写签名",
                    bars: [
                      { label: "涉及", value: "96 · 9.7%", percent: 23.6, tone: "blue" },
                      { label: "受阻", value: "3", percent: 8.3, tone: "red" },
                    ],
                  },
                ],
              },
            ],
          },
          { type: "sub", text: "受阻原因分布", tone: "red" },
          {
            type: "stackedBar",
            aria: "184 次关键项缺失的原因构成",
            items: [
              { percent: 46.2, color: "red" },
              { percent: 23.4, color: "amber" },
              { percent: 17.4, color: "blue" },
              { percent: 7.1, color: "#86A2EA" },
              { percent: 5.9, color: "#B7B3A9" },
            ],
          },
          {
            type: "reasons",
            items: [
              { label: "照片字段必填但无法拍照上传", value: "85 · 46.2%" },
              { label: "关联设备必填但选不到目标设备", value: "43 · 23.4%" },
              { label: "成员字段无法选到对应责任人", value: "32 · 17.4%" },
              { label: "定位字段在室内无法获取坐标", value: "13 · 7.1%" },
              { label: "未保留更细原因", value: "11 · 5.9%" },
            ],
          },
          { type: "tags", items: ["照片 36", "关联设备 31", "成员 24", "定位 12", "手写签名 3"] },
          {
            type: "stats",
            items: [
              { value: "46.2%", label: "照片字段" },
              { value: "23.4%", label: "关联设备" },
              { value: "17.4%", label: "成员字段" },
              { value: "13.0%", label: "其他字段" },
            ],
          },
          {
            type: "p",
            text: "受阻不等于失败：同一次作业可能同时遇到多个受阻字段，因此各类受阻次数不能直接相加，也不等同于最终未完成的次数；==受阻字段里照片与关联设备两项占了近七成==。",
          },
          {
            type: "panel",
            variant: "chart",
            title: "业务领域 × 受阻字段",
            subtitle: "颜色越深，表示因为该字段「必填但无法填写」而受阻的次数越多",
            blocks: [
              {
                type: "heatmap",
                aria: "各业务领域里照片、关联设备、成员、定位字段造成的受阻次数",
                columns: ["照片", "关联设备", "成员", "定位"],
                rows: [
                  { label: "生产与设备", values: [18, 15, 7, 2], levels: [4, 4, 2, 1] },
                  { label: "安全与环保", values: [12, 4, 3, 1] },
                  { label: "行政与后勤", values: [4, 6, 9, 8] },
                  { label: "未归类与明确测试", values: [2, 6, 5, 0] },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "tenants",
        title: "高频班组与共创对象",
        lead: "高频使用不等于广泛采用：每个班组的作业次数中位数只有 3 次，只有 21 个班组达到 12 次以上；第一名贡献了全部作业次数的 22.3%。",
        sideNote: "班组名为主展示，编号尾号仅用于同名区分",
        blocks: [
          {
            type: "donut",
            title: "使用量高度集中，但已出现一批可持续观察的班组",
            text: "168 个班组领取过巡检任务；42 个达到 5 次以上，21 个达到 12 次以上。用量集中意味着少数班组对路线判断影响很大，必须同时观察「领取次数、活跃成员、活跃天数、成功归档与关键项受阻」。",
            segments: [{ percent: 22.3 }, { percent: 18.1 }, { percent: 12.1 }],
            inside: { value: "52.5%", label: "前 10 名占比" },
          },
          {
            type: "stats",
            items: [
              { value: "22.3%", label: "第 1 名" },
              { value: "18.1%", label: "第 2—5 名" },
              { value: "12.1%", label: "第 6—10 名" },
              { value: "47.5%", label: "其他 158 个班组" },
            ],
          },
          { type: "h3", text: "4.1 高频班组明细" },
          {
            type: "table",
            caption: "作业次数达到 12 次及以上的全部班组；「关键项受阻」只统计必填、为空且当前无法填写的字段。",
            head: ["班组", "领取任务", "发起作业", "形成记录 / 检查表", "成功归档 / 提交次数", "成员 / 天数", "关键项受阻"],
            rows: [
              [
                { text: "一号车间点检班", code: "…4c9a21", className: "tenant-name" },
                { value: "412" },
                { value: "268", bar: 100 },
                { value: "186 / 24" },
                { value: "92 / 118" },
                { value: "31 / 12" },
                { tags: ["照片 8", "关联设备 5", "成员 2"] },
              ],
              [
                { text: "动力运行保障组", code: "…7be1d0", className: "tenant-name" },
                { value: "18" },
                { value: "24", bar: 9 },
                { value: "21 / 2" },
                { value: "4 / 14" },
                { value: "3 / 2" },
                { tags: [] },
              ],
              [
                { text: "仓储物流点检组", code: "…2f88a6", className: "tenant-name" },
                { value: "96" },
                { value: "142", bar: 53 },
                { value: "88 / 12" },
                { value: "41 / 52" },
                { value: "12 / 9" },
                { tags: ["定位 9", "照片 6"] },
              ],
              [
                { text: "外围设施巡检组", code: "…90b6ab", className: "tenant-name" },
                { value: "34" },
                { value: "46", bar: 17.2 },
                { value: "39 / 6" },
                { value: "21 / 27" },
                { value: "8 / 5" },
                { tags: ["照片 4", "定位 3"] },
              ],
            ],
          },
          {
            type: "callout",
            tone: "green",
            kicker: "建议共创对象",
            title: "一号车间点检班",
            text: "领取 268 次、成功归档 92 次，同时遇到照片、关联设备与成员三类关键项受阻；适合作为能力升级的首批验证班组。",
          },
        ],
      },
      {
        id: "roadmap",
        title: "作业路线建议",
        lead: "按「能直接减少无法完成的记录」排序，而不是按字段出现次数排序。",
        blocks: [
          {
            type: "callout",
            tone: "blue",
            title: "最关键的判断：",
            text: "每补齐一种关联设备能力，就能直接减少较多无法完成的记录；照片字段则横跨最多业务。这两项适合同时作为第一优先。定位应从夜间巡检切入；手写签名虽然常见，但当前很少直接卡住提交，可放在后续。",
          },
          {
            type: "steps",
            items: [
              { phase: "第一阶段 · 最优先", title: "照片 + 关联设备", text: "优先解锁生产点检、质量检查与设备维修场景。" },
              { phase: "第二阶段", title: "成员 + 定位", text: "定位先做夜间巡检与室外作业；成员字段与巡检组一起建设。" },
              { phase: "第三阶段", title: "手写签名", text: "优先支持在提交前一次性签名，但不把它误判为当前最大阻碍。" },
              { phase: "持续观察", title: "附件 / 二维码 / 条码", text: "继续观察真实使用情况，当前数据不足以支持优先投入。" },
            ],
          },
        ],
      },
      {
        id: "method",
        title: "分析口径与可信边界",
        lead: "这份报告刻意保留了不可分类和不可判断的部分，避免把数据缺失包装成确定结论。",
        blocks: [
          {
            type: "details",
            items: [
              {
                summary: "样本来自哪里",
                open: true,
                blocks: [
                  {
                    type: "list",
                    items: [
                      "使用点检系统全部可用记录，时间范围为 2026-07-01 至 2026-07-14。",
                      "场景分布以当前仍可用于分析的 1,248 条记录为主样本；未能形成记录的尝试不参与场景归类，但计入班组作业次数。",
                      "字段分析覆盖 986 次字段信息完整的作业；另有 262 次缺少字段信息，不纳入字段先后顺序判断。",
                      "领取任务共 2,486 次：1,748 次已经形成记录，738 次明确失败或被拒绝，两者不相减计算失败率。",
                      "归档结果共 790 次：612 次成功、178 次未成功，只有这一段使用同一批提交结果。",
                    ],
                  },
                ],
              },
              {
                summary: "什么叫「关键项受阻」",
                blocks: [
                  {
                    type: "list",
                    items: [
                      "字段在当前检查表中可见；",
                      "字段为必填；",
                      "当前点检能力无法写入该字段；",
                      "字段当前为空值；",
                      "同一次作业可能同时遇到多个受阻字段，因此各处受阻次数不能直接相加。",
                    ],
                  },
                ],
              },
              {
                summary: "场景与检查项是怎样归纳的",
                blocks: [
                  {
                    type: "list",
                    items: [
                      "归类只使用记录里实际保存的检查项名称，名称明确指向某类业务动作时才归类，名称缺失或含义模糊时不猜测。",
                      "同一个名称同时出现多个业务词时，优先采用更具体的业务对象。",
                      "代表检查表均使用样本里的原名并保留真实次数；193 次信息不足的记录单独保留为「暂不归类」。",
                    ],
                  },
                ],
              },
              {
                summary: "安全与隐私",
                blocks: [
                  { type: "p", text: "整个分析过程只读取数据，且逐项执行，没有修改生产环境中的任何内容；报告不包含手机号、邮箱、实际填写内容、原始照片与外部系统编号。" },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  async render(ctx) {
    const data = ctx.data;
    const sections: Record<string, any>[] = Array.isArray(data.sections) ? data.sections : [];
    const parts: string[] = [];

    /** 取出一个"整块"组件的结果；未选中时 use() 已返回空数组。 */
    const part = (id: string): string[] => (ctx.has(id) ? ((ctx.use(id) as string[]) ?? []) : []);

    parts.push(...part("nav"));
    parts.push(...part("hero"));

    const body: string[] = [];
    for (const section of sections) {
      if (!section || typeof section !== "object") continue;
      const id = String(section.id ?? "").trim();
      const title = String(section.title ?? "").trim();
      const lead = String(section.lead ?? "").trim();
      const sideNote = String(section.sideNote ?? "").trim();
      const blocks: Record<string, any>[] = Array.isArray(section.blocks) ? section.blocks : [];

      const head: string[] = [];
      if (title) head.push("<h2>" + ctx.html.inline(title) + "</h2>");
      if (lead) head.push("<p>" + ctx.html.inline(lead) + "</p>");

      const chunks: string[] = [];
      chunks.push("<section class=\"section\"" + (id ? " id=\"" + ctx.html.inline(id) + "\"" : "") + ">");
      chunks.push(
        "<div class=\"section-head\">" +
          "<div>" + head.join("") + "</div>" +
          (sideNote ? "<div class=\"side-note\">" + ctx.html.inline(sideNote) + "</div>" : "") +
          "</div>",
      );

      for (let index = 0; index < blocks.length; index += 1) {
        const block = blocks[index] as Record<string, any>;
        const type = String(block?.type ?? "");
        const owner = BLOCK_OWNER[type];
        if (!owner) {
          // 未知块类型只跳过，不让整篇渲染失败
          ctx.log("未知块类型 " + type + "（section " + (id || "?") + " 第 " + (index + 1) + " 块），已跳过");
          continue;
        }
        const out = await ctx.renderBlock(owner, { ...block, __index: index });
        if (out) chunks.push(String(out));
      }
      chunks.push("</section>");
      body.push(chunks.join("\n"));
    }

    parts.push(body.length > 0 ? "<main>\n" + body.join("\n") + "\n</main>" : "");
    parts.push(...part("footer"));

    const titleText = String(data.title ?? "数据分析报告").split("\n")[0]?.trim() || "数据分析报告";
    const page = [
      "<!doctype html>",
      "<html lang=\"zh-CN\">",
      "<head>",
      "<meta charset=\"utf-8\">",
      "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">",
      "<title>" + ctx.html.inline(titleText) + "</title>",
      "<style>",
      ANALYSIS_CSS,
      "</style>",
      "</head>",
      "<body>",
      parts.filter(Boolean).join("\n"),
      "</body>",
      "</html>",
      "",
    ].join("\n");

    return { kind: "html", html: page };
  },
});
