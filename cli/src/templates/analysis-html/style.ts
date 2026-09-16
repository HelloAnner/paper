/**
 * analysis-html 的设计样式：把原始数据报告文档的 CSS 原样搬进来，不做改写。
 *
 * 唯一要留意的是原文档的 .reveal 入场动画（opacity:0 + translateY，靠 JS 加 .show 才显示）。
 * 模板侧约定永不输出 reveal 类，所以静态 HTML（QuickLook / 无 JS 浏览器）里内容全部可见；
 * 规则本身保留，方便与原文档逐条对照。
 */

export const ANALYSIS_CSS = `

  :root {
    --bg: #F8F7F4;
    --surface: #FFFFFF;
    --surface-alt: #F3F1EC;
    --text: #1A1815;
    --text-2: #52504B;
    --text-3: #908D85;
    --border: #E5E2DB;
    --border-light: #EDEAE4;

    --green: #0D9668;
    --green-bg: #EEFBF5;
    --green-border: #C6F0DC;

    --red: #D94F4F;
    --red-bg: #FDF2F2;
    --red-border: #F5C6C6;

    --amber: #C2850E;
    --amber-bg: #FEF9EC;
    --amber-border: #F5E3B5;

    --blue: #3B6CE7;
    --blue-bg: #F0F4FE;
    --blue-border: #C5D4F5;

    --radius: 14px;
    --radius-sm: 10px;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    font-family: 'Inter', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--bg);
    color: var(--text-2);
    font-size: 15px;
    line-height: 1.7;
    -webkit-font-smoothing: antialiased;
  }
  a { color: inherit; }

  nav {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(248, 247, 244, 0.9);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
  }
  nav .inner {
    max-width: 1080px;
    margin: 0 auto;
    padding: 0 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 56px;
  }
  nav .brand { font-weight: 600; font-size: 15px; color: var(--text); white-space: nowrap; }
  nav .links { display: flex; gap: 25px; }
  nav .links a {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-3);
    text-decoration: none;
    transition: color 0.2s;
  }
  nav .links a:hover { color: var(--text); }

  .hero {
    max-width: 1080px;
    margin: 0 auto;
    padding: 72px 40px 54px;
  }
  .eyebrow {
    display: flex;
    align-items: center;
    gap: 9px;
    color: var(--blue);
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 18px;
    letter-spacing: 0.04em;
  }
  .eyebrow::before { content: ''; width: 18px; height: 3px; background: var(--blue); border-radius: 2px; }
  .hero h1 {
    font-size: clamp(34px, 5vw, 46px);
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.035em;
    line-height: 1.18;
    margin-bottom: 18px;
  }
  .hero > p {
    font-size: 17px;
    line-height: 1.8;
    color: var(--text-2);
    max-width: 720px;
  }
  .hero .meta { margin-top: 24px; display: flex; flex-wrap: wrap; gap: 10px; }
  .hero .meta span {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-3);
    padding: 4px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
  }

  .hero-verdict {
    margin-top: 42px;
    padding: 24px 26px;
    background: var(--green-bg);
    border: 1px solid var(--green-border);
    border-radius: var(--radius);
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 18px;
    align-items: start;
  }
  .hero-verdict .index {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: rgba(13, 150, 104, 0.12);
    color: var(--green);
    display: grid;
    place-items: center;
    font-size: 13px;
    font-weight: 700;
  }
  .hero-verdict h2 { color: var(--text); font-size: 17px; line-height: 1.5; margin-bottom: 5px; }
  .hero-verdict p { font-size: 14px; line-height: 1.75; }

  .section {
    max-width: 1080px;
    margin: 0 auto;
    padding: 58px 40px;
  }
  .section + .section { border-top: 1px solid var(--border); }
  .section-head { margin-bottom: 38px; display: flex; justify-content: space-between; gap: 30px; align-items: end; }
  .section-head h2 {
    font-size: 26px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.02em;
    margin-bottom: 8px;
  }
  .section-head p { font-size: 15px; max-width: 680px; line-height: 1.75; }
  .section-head .side-note { font-size: 12px; color: var(--text-3); white-space: nowrap; }

  .sub-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.04em;
    margin-bottom: 20px;
    margin-top: 42px;
  }
  .sub-label:first-child { margin-top: 0; }
  .sub-label .bar { width: 18px; height: 3px; border-radius: 2px; }
  .sub-label.green { color: var(--green); }
  .sub-label.green .bar { background: var(--green); }
  .sub-label.red { color: var(--red); }
  .sub-label.red .bar { background: var(--red); }
  .sub-label.amber { color: var(--amber); }
  .sub-label.amber .bar { background: var(--amber); }
  .sub-label.blue { color: var(--blue); }
  .sub-label.blue .bar { background: var(--blue); }

  .grid { display: grid; gap: 14px; }
  .grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .grid-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 23px;
  }
  .card.green { background: var(--green-bg); border-color: var(--green-border); }
  .card.red { background: var(--red-bg); border-color: var(--red-border); }
  .card.amber { background: var(--amber-bg); border-color: var(--amber-border); }
  .card.blue { background: var(--blue-bg); border-color: var(--blue-border); }
  .metric .label { font-size: 12px; color: var(--text-3); font-weight: 500; margin-bottom: 8px; }
  .metric .value { color: var(--text); font-size: 28px; font-weight: 700; letter-spacing: -0.03em; line-height: 1.2; }
  .metric .value small { font-size: 13px; color: var(--text-3); font-weight: 500; margin-left: 4px; }
  .metric .desc { font-size: 12px; color: var(--text-3); line-height: 1.55; margin-top: 7px; }
  .metric.red .value { color: var(--red); }
  .metric.green .value { color: var(--green); }
  .metric.blue .value { color: var(--blue); }

  .flow-row { display: flex; align-items: stretch; gap: 0; margin-top: 10px; }
  .flow-card {
    flex: 1;
    min-width: 0;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 19px 13px;
    text-align: center;
  }
  .flow-card .num { font-size: 11px; font-weight: 600; color: var(--text-3); margin-bottom: 6px; }
  .flow-card .count { color: var(--text); font-size: 23px; font-weight: 700; line-height: 1.25; }
  .flow-card .label { font-size: 13px; font-weight: 600; color: var(--text); margin-top: 4px; }
  .flow-card .desc { font-size: 11px; color: var(--text-3); line-height: 1.5; margin-top: 5px; }
  .flow-card.final { background: var(--green-bg); border-color: var(--green-border); }
  .flow-card.final .count { color: var(--green); }
  .flow-connector {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 5px;
    color: var(--text-3);
    flex-shrink: 0;
    font-size: 15px;
  }
  .flow-connector span { background: var(--surface-alt); border-radius: 5px; padding: 2px 5px; font-size: 10px; color: var(--text-3); }
  .flow-note { color: var(--text-3); font-size: 12px; margin-top: 12px; }

  .truth-banner {
    margin-top: 18px;
    padding: 18px 21px;
    background: var(--blue-bg);
    border: 1px solid var(--blue-border);
    border-radius: var(--radius);
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 14px;
    align-items: start;
  }
  .truth-banner .mark {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    background: rgba(59, 108, 231, .12);
    color: var(--blue);
    font-weight: 700;
  }
  .truth-banner strong { display: block; color: var(--text); font-size: 14px; margin-bottom: 3px; }
  .truth-banner p { font-size: 12px; line-height: 1.7; }

  .attribution-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
  .attribution-panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 24px;
    display: flex;
    flex-direction: column;
  }
  .attribution-panel .step { color: var(--blue); font-size: 11px; font-weight: 700; letter-spacing: .05em; }
  .attribution-panel h3 { color: var(--text); font-size: 17px; line-height: 1.45; margin: 7px 0; min-height: 50px; }
  .attribution-panel > p { font-size: 12px; line-height: 1.7; min-height: 82px; }
  .attribution-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 18px 0; }
  .attribution-kpi { background: var(--surface-alt); border-radius: 8px; padding: 11px 10px; }
  .attribution-kpi strong { display: block; color: var(--text); font-size: 20px; line-height: 1.2; }
  .attribution-kpi span { display: block; color: var(--text-3); font-size: 10px; margin-top: 4px; }
  .attribution-kpi.good { background: var(--green-bg); }
  .attribution-kpi.good strong { color: var(--green); }
  .attribution-kpi.bad { background: var(--red-bg); }
  .attribution-kpi.bad strong { color: var(--red); }
  .stacked-bar { height: 14px; display: flex; overflow: hidden; border-radius: 5px; background: var(--surface-alt); margin: 4px 0 14px; }
  .stacked-bar span { display: block; height: 100%; }
  .reason-list { display: grid; gap: 8px; margin-bottom: 17px; }
  .reason-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: baseline; padding-bottom: 7px; border-bottom: 1px solid var(--border-light); }
  .reason-row:last-child { border-bottom: 0; padding-bottom: 0; }
  .reason-row span { color: var(--text-2); font-size: 11px; }
  .reason-row strong { color: var(--text); font-size: 12px; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .evidence-note { margin-top: auto; padding: 13px 14px; border-radius: 8px; background: var(--amber-bg); border: 1px solid var(--amber-border); font-size: 11px; line-height: 1.7; }
  .evidence-note strong { color: var(--text); }
  .proof-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 14px; }
  .proof-card { padding: 18px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); }
  .proof-card .proof-label { color: var(--text-3); font-size: 10px; line-height: 1.45; min-height: 30px; }
  .proof-card .proof-value { color: var(--text); font-size: 26px; font-weight: 700; line-height: 1.2; margin: 6px 0; }
  .proof-card .proof-value small { color: var(--text-3); font-size: 11px; font-weight: 500; margin-left: 3px; }
  .proof-card p { color: var(--text-3); font-size: 10px; line-height: 1.55; }
  .proof-card.green { background: var(--green-bg); border-color: var(--green-border); }
  .proof-card.green .proof-value { color: var(--green); }
  .proof-card.red { background: var(--red-bg); border-color: var(--red-border); }
  .proof-card.red .proof-value { color: var(--red); }
  .proof-card.amber { background: var(--amber-bg); border-color: var(--amber-border); }
  .proof-card.amber .proof-value { color: var(--amber); }

  .chart-panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 25px 26px;
  }
  .chart-title { color: var(--text); font-size: 15px; font-weight: 600; }
  .chart-subtitle { color: var(--text-3); font-size: 12px; margin-top: 3px; }
  .bar-chart { margin-top: 24px; display: grid; gap: 16px; }
  .bar-row { display: grid; grid-template-columns: 210px minmax(120px, 1fr) 76px; gap: 14px; align-items: center; }
  .bar-row .name { color: var(--text); font-size: 13px; font-weight: 500; line-height: 1.4; }
  .bar-row .name small { display: block; color: var(--text-3); font-size: 11px; font-weight: 400; margin-top: 2px; }
  .bar-track { height: 12px; background: var(--surface-alt); border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; background: var(--blue); border-radius: 4px; }
  .bar-fill.green { background: var(--green); }
  .bar-fill.red { background: var(--red); }
  .bar-fill.amber { background: var(--amber); }
  .bar-row .number { color: var(--text); font-size: 13px; text-align: right; font-variant-numeric: tabular-nums; }
  .bar-row .number strong { font-weight: 700; }
  .bar-row .number small { color: var(--text-3); margin-left: 3px; }

  .scene-family-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 14px; }
  .scene-family { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 23px; }
  .scene-family-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 8px; }
  .scene-family-kicker { color: var(--text-3); font-size: 11px; font-weight: 600; letter-spacing: .04em; }
  .scene-family h3 { color: var(--text); font-size: 17px; margin-top: 4px; }
  .scene-family-total { color: var(--blue); font-size: 23px; font-weight: 700; line-height: 1.15; text-align: right; white-space: nowrap; }
  .scene-family-total small { display: block; color: var(--text-3); font-size: 10px; font-weight: 500; margin-top: 4px; }
  .scene-item { border-top: 1px solid var(--border-light); padding: 15px 0 13px; }
  .scene-item:last-child { padding-bottom: 0; }
  .scene-item-top { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; }
  .scene-item-name { color: var(--text); font-size: 14px; font-weight: 600; }
  .scene-item-value { color: var(--text); font-size: 14px; font-weight: 700; white-space: nowrap; }
  .scene-item-value small { color: var(--text-3); font-size: 10px; font-weight: 500; margin-left: 4px; }
  .scene-item-meta { color: var(--text-3); font-size: 11px; margin-top: 3px; }
  .scene-item-examples { color: var(--text-2); font-size: 12px; line-height: 1.65; margin-top: 7px; }
  .scene-family.amber { background: var(--amber-bg); border-color: var(--amber-border); }
  .scene-family.green { background: var(--green-bg); border-color: var(--green-border); }

  .legend { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 18px; color: var(--text-3); font-size: 11px; }
  .legend span { display: inline-flex; align-items: center; gap: 6px; }
  .legend i { width: 9px; height: 9px; border-radius: 2px; display: inline-block; }

  .blocker-chart { margin-top: 24px; display: grid; gap: 19px; }
  .blocker-row { display: grid; grid-template-columns: 92px 1fr 1fr; gap: 18px; align-items: center; }
  .blocker-name { color: var(--text); font-size: 13px; font-weight: 600; }
  .dual-metric .dual-head { display: flex; justify-content: space-between; gap: 8px; color: var(--text-3); font-size: 11px; margin-bottom: 5px; }
  .dual-metric .dual-head strong { color: var(--text); font-size: 12px; }
  .track { height: 10px; background: var(--surface-alt); border-radius: 4px; overflow: hidden; }
  .fill { height: 100%; border-radius: 4px; }
  .fill.blue { background: var(--blue); }
  .fill.red { background: var(--red); }

  .priority-grid { display: grid; grid-template-columns: 1.2fr 1.2fr 1fr 1fr; gap: 14px; }
  .priority-card { padding: 22px; border-radius: var(--radius); border: 1px solid var(--border); background: var(--surface); }
  .priority-card .rank { font-size: 11px; font-weight: 700; color: var(--text-3); letter-spacing: .05em; }
  .priority-card h3 { font-size: 16px; color: var(--text); margin: 7px 0 7px; }
  .priority-card p { font-size: 12px; line-height: 1.65; }
  .priority-card.p0 { background: var(--red-bg); border-color: var(--red-border); }
  .priority-card.p0 .rank { color: var(--red); }
  .priority-card.p1 { background: var(--amber-bg); border-color: var(--amber-border); }
  .priority-card.p1 .rank { color: var(--amber); }
  .priority-card.p2 { background: var(--blue-bg); border-color: var(--blue-border); }
  .priority-card.p2 .rank { color: var(--blue); }

  .heatmap-wrap { overflow-x: auto; }
  .heatmap { min-width: 760px; display: grid; grid-template-columns: 220px repeat(5, 1fr); gap: 6px; margin-top: 22px; }
  .heat-cell { min-height: 46px; padding: 10px 8px; border-radius: 7px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 12px; font-variant-numeric: tabular-nums; }
  .heat-head { color: var(--text-3); font-size: 11px; font-weight: 600; min-height: 30px; }
  .heat-label { justify-content: flex-start; color: var(--text); font-weight: 500; background: transparent; padding-left: 0; }
  .heat-0 { background: var(--surface-alt); color: var(--text-3); }
  .heat-1 { background: #FDF0F0; color: #9A4343; }
  .heat-2 { background: #F9DEDE; color: #873737; }
  .heat-3 { background: #F5CCCC; color: #6E2B2B; font-weight: 600; }
  .heat-4 { background: #EFAFAF; color: #511D1D; font-weight: 700; }

  .concentration {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 30px;
    align-items: center;
  }
  .donut {
    width: 190px;
    height: 190px;
    border-radius: 50%;
    background: conic-gradient(var(--blue) 0 22.3%, #7595EB 22.3% 40.4%, #ABC0F5 40.4% 52.5%, var(--surface-alt) 52.5% 100%);
    position: relative;
    display: grid;
    place-items: center;
    margin: 0 auto;
  }
  .donut::after { content: ''; position: absolute; inset: 31px; background: var(--surface); border-radius: 50%; }
  .donut .inside { position: relative; z-index: 1; text-align: center; }
  .donut .inside strong { display: block; color: var(--text); font-size: 26px; line-height: 1.1; }
  .donut .inside span { color: var(--text-3); font-size: 11px; }
  .concentration-copy h3 { font-size: 17px; color: var(--text); margin-bottom: 8px; }
  .concentration-copy p { font-size: 13px; line-height: 1.7; }
  .distribution-line { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 18px; }
  .distribution-line div { border-top: 3px solid var(--border); padding-top: 7px; }
  .distribution-line div:nth-child(1) { border-color: var(--blue); }
  .distribution-line div:nth-child(2) { border-color: #7595EB; }
  .distribution-line div:nth-child(3) { border-color: #ABC0F5; }
  .distribution-line strong { color: var(--text); font-size: 13px; display: block; }
  .distribution-line span { color: var(--text-3); font-size: 11px; }

  .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); }
  table { width: 100%; border-collapse: collapse; min-width: 930px; }
  caption { text-align: left; padding: 18px 20px 10px; color: var(--text-3); font-size: 12px; }
  thead th {
    color: var(--text-3);
    font-size: 11px;
    font-weight: 600;
    text-align: left;
    padding: 11px 14px;
    border-bottom: 1px solid var(--border);
    background: #FBFAF8;
    white-space: nowrap;
  }
  tbody td {
    font-size: 12px;
    padding: 13px 14px;
    border-bottom: 1px solid var(--border-light);
    vertical-align: middle;
  }
  tbody tr:last-child td { border-bottom: 0; }
  tbody tr:hover { background: #FCFBF9; }
  .tenant-name { color: var(--text); font-weight: 600; min-width: 190px; }
  .tenant-name code { display: block; color: var(--text-3); font-size: 10px; font-weight: 400; background: none; }
  .num-cell { font-variant-numeric: tabular-nums; white-space: nowrap; color: var(--text); }
  .mini-bar { width: 84px; height: 5px; background: var(--surface-alt); border-radius: 3px; overflow: hidden; display: inline-block; vertical-align: middle; margin-left: 7px; }
  .mini-bar i { display: block; height: 100%; background: var(--blue); border-radius: 3px; }
  .field-tags { display: flex; flex-wrap: wrap; gap: 4px; min-width: 150px; }
  .field-tag { padding: 2px 6px; border-radius: 4px; font-size: 10px; background: var(--red-bg); color: var(--red); border: 1px solid var(--red-border); white-space: nowrap; }
  .field-tag.none { background: var(--surface-alt); color: var(--text-3); border-color: var(--border); }

  .insight-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .insight-card { border-radius: var(--radius); border: 1px solid var(--border); background: var(--surface); padding: 23px; }
  .insight-card .signal { color: var(--blue); font-size: 11px; font-weight: 700; letter-spacing: .04em; margin-bottom: 8px; }
  .insight-card h3 { color: var(--text); font-size: 15px; margin-bottom: 7px; }
  .insight-card p { font-size: 12px; line-height: 1.7; }

  .callout {
    background: var(--blue-bg);
    border: 1px solid var(--blue-border);
    border-radius: var(--radius);
    padding: 20px 24px;
    font-size: 13px;
    line-height: 1.75;
  }
  .callout strong { color: var(--text); }
  .roadmap { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; margin-top: 22px; }
  .roadmap-step { position: relative; padding: 22px 20px; background: var(--surface); border: 1px solid var(--border); border-right: 0; }
  .roadmap-step:first-child { border-radius: var(--radius-sm) 0 0 var(--radius-sm); }
  .roadmap-step:last-child { border-radius: 0 var(--radius-sm) var(--radius-sm) 0; border-right: 1px solid var(--border); }
  .roadmap-step .phase { font-size: 11px; color: var(--text-3); font-weight: 600; }
  .roadmap-step h3 { font-size: 14px; color: var(--text); margin: 6px 0 6px; }
  .roadmap-step p { font-size: 11px; color: var(--text-3); line-height: 1.55; }
  .roadmap-step:first-child { background: var(--red-bg); border-color: var(--red-border); }
  .roadmap-step:nth-child(2) { background: var(--amber-bg); border-color: var(--amber-border); }

  details { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 0 22px; margin-top: 12px; }
  summary { cursor: pointer; list-style: none; color: var(--text); font-size: 14px; font-weight: 600; padding: 18px 0; }
  summary::-webkit-details-marker { display: none; }
  summary::after { content: '+'; float: right; color: var(--text-3); font-size: 18px; font-weight: 400; }
  details[open] summary::after { content: '−'; }
  .detail-body { border-top: 1px solid var(--border-light); padding: 16px 0 20px; font-size: 12px; line-height: 1.75; color: var(--text-2); }
  .detail-body ul { padding-left: 18px; }
  .detail-body li { margin: 5px 0; }

  footer { max-width: 1080px; margin: 0 auto; padding: 40px 40px 60px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; gap: 20px; }
  footer p { font-size: 12px; color: var(--text-3); }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
  .reveal { opacity: 0; transform: translateY(14px); transition: opacity .55s ease, transform .55s ease; }
  .reveal.show { opacity: 1; transform: translateY(0); }

  @media (max-width: 920px) {
    .grid-5 { grid-template-columns: repeat(3, 1fr); }
    .bar-row { grid-template-columns: 180px 1fr 68px; }
    .priority-grid { grid-template-columns: 1fr 1fr; }
    .scene-family-grid { grid-template-columns: 1fr; }
    .insight-grid { grid-template-columns: 1fr 1fr; }
    .proof-grid { grid-template-columns: 1fr 1fr; }
    .roadmap { grid-template-columns: 1fr 1fr; gap: 10px; }
    .roadmap-step, .roadmap-step:first-child, .roadmap-step:last-child { border: 1px solid var(--border); border-radius: var(--radius-sm); }
  }
  @media (max-width: 720px) {
    nav .inner { padding: 0 20px; }
    nav .links { gap: 12px; }
    nav .links a:nth-child(3) { display: none; }
    .hero { padding: 48px 20px 42px; }
    .section { padding: 42px 20px; }
    .section-head { display: block; }
    .section-head .side-note { margin-top: 8px; }
    .grid-5, .grid-3, .grid-2 { grid-template-columns: 1fr 1fr; }
    .flow-row { display: grid; grid-template-columns: 1fr; gap: 8px; }
    .flow-connector { display: none; }
    .attribution-grid { grid-template-columns: 1fr; }
    .attribution-panel h3, .attribution-panel > p { min-height: 0; }
    .reason-list { margin-bottom: 0; }
    .evidence-note { margin-top: 17px; }
    .bar-row { grid-template-columns: 1fr 62px; gap: 7px 10px; }
    .bar-row .name { grid-column: 1 / -1; }
    .blocker-row { grid-template-columns: 1fr; gap: 8px; padding-bottom: 12px; border-bottom: 1px solid var(--border-light); }
    .priority-grid, .insight-grid, .roadmap { grid-template-columns: 1fr; }
    .concentration { grid-template-columns: 1fr; }
    .distribution-line { grid-template-columns: 1fr 1fr; }
    footer { padding: 32px 20px 48px; flex-direction: column; }
  }
  @media (max-width: 430px) {
    nav .links { display: none; }
    .grid-5, .grid-3, .grid-2 { grid-template-columns: 1fr; }
    .hero-verdict { grid-template-columns: 1fr; }
    .chart-panel { padding: 20px 18px; }
    .truth-banner { grid-template-columns: 1fr; }
    .proof-grid { grid-template-columns: 1fr; }
  }
  @media print {
    nav { display: none; }
    body { background: #fff; }
    .hero, .section { max-width: none; }
    .reveal { opacity: 1 !important; transform: none !important; }
    .section { break-inside: avoid; }
    details { break-inside: avoid; }
  }
`;
