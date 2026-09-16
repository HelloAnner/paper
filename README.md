# paper

给 AI 用的本地离线文档生成 CLI：**固定排版模板 + 动态数据 → 稳定质量的 docx / pdf / html**。

AI 手写排版代码每次都不一样，字号、间距、分页全靠运气。paper 把排版固化进模板，
AI 只负责三件事：选模板、填数据、按需组装组件。

    AI 的活                        paper 的活
    ───────────────────────        ────────────────────────────────
    1. 选模板（读 useWhen）        排版：字体 / 间距 / 表格 / 页码
    2. 填数据（按 schema）         中文字体嵌入 + 只嵌用到的字形
    3. 选组件（可选）              校验数据、报错、落盘、自检

## 安装

```bash
git clone https://github.com/HelloAnner/paper.git && cd paper
make install          # 编译 CLI 到 ~/.local/bin/paper，字体到 ~/.local/share/paper/fonts，skill 软链到 ~/.agents/skills/paper
paper doctor          # 自检
```

依赖 [bun](https://bun.sh)（编译单文件二进制）；准备 PDF 中文字体时需要 `python3 + fontTools`。

## 使用

```bash
paper list                            # 看有哪些模板（每行都带适用场景）
paper describe prd-html               # 读数据契约（字段说明 + 示例数据）
paper sample prd-html -o data.json    # 拿一份能跑通的骨架
paper gen prd-html -d data.json -o 报告.html
paper gen prd-html -d data.json -o 文字稿.html -c prose   # 只出某几类组件
```

`--json` 时 stdout 是纯 JSON（成功含 `out/bytes/components`，失败含 `ok:false/error`），
过程信息走 stderr，方便 AI 直接解析。

## 内置模板

| 模板 id | 格式 | 产出 |
|---------|------|------|
| `weekly-report` | docx | 工作周报：概况 + 指标 + 进展 + 风险 + 下阶段计划 |
| `analysis-report` | pdf | 分析报告：封面 + 摘要 + 指标卡 + 章节 + 数据表 + 结论（A4 可直接打印） |
| `brief-html` | html | 一页速览：要点 + 键值 + 表格，单文件可分享 |
| `prd-html` | html | 产品需求文档：页眉条 + 标题区 + 两列目录 + 多级标题 + 数据表（状态矩阵）+ 内联 SVG 图 |

两个形态：**拼装型**（模板写好排版顺序，组件各管一段）与**文档型**（`blocks[]` 有序数组，
逐块分发给 `prose / tables / figures`，顺序由数据决定，同时保留 `-c` 的可选粒度）。

## 目录结构

    cli/
      src/cli.ts            命令路由（list / describe / sample / gen / doctor）
      src/core/             公共层：schema、registry、run、richtext、
                            docx-kit、pdf-kit、html-kit、fonts、ttf
      src/templates/        文档模板（每个模板一个文件夹，不共享业务代码）
      src/generated/        自动生成的模板注册表
      tests/                契约测试 + 所有模板的样例渲染冒烟
    docs/*.txt              设计文档（纯文本）：总览 / CLI / 模板 / core / 安装 / PRD 模板
    skills/paper/           配套 skill（随 `make install` 软链给 coding agent 用）
    Makefile                install / build / dev / fonts / test / check

## 开发

```bash
make dev ARGS='list'                      # 源码模式
cd cli && bun test                        # 18 项测试
make check                                # typecheck + test + build
bun run scripts/preview.ts out.pdf 1,2    # 把 PDF 某几页导成 PNG，肉眼看排版
```

新增文档模板 = 在 `cli/src/templates/` 下新建一个文件夹（文件夹名就是模板 id），
写 `template.ts` + `components/<id>/component.ts`，不需要登记。
契约见 [docs/03-template.txt](docs/03-template.txt)，文档型模板见 [docs/06-prd-html.txt](docs/06-prd-html.txt)。

## 技术取舍（踩过的坑）

- **PDF 用 pdf-lib + 自研稀疏子集**：pdf-lib 自带子集对中文大字体丢字，CFF(otf) 直接乱码；
  现在的做法是「保留字形 id 的稀疏子集」——只留用到的轮廓，复合字形递归保留分量，
  `cmap/hmtx/name` 原样带。一份 4 页报告从 14MB 降到 500KB。
- **字体只用 ttf**：`make fonts` 下载 Noto Sans SC 可变字体，用 fontTools 实例化出常规/粗体；
  ttc 是字体集合、otf 是 CFF，都不能用于稀疏子集。
- **关掉 `locl` 特性**：Noto Sans SC 的 `locl` 会把 `3.2` 里的数字换成另一套字形，
  导致排版与字形集合对不上；嵌入时统一 `features: { locl: false }`。
- **行内富文本用栈解析**：`**加粗**` / 反引号代码 / `==强调==` 支持嵌套
  （原文档里存在 `<strong>…<span class="can-do">…</span>…</strong>` 这种结构）。

## License

MIT
