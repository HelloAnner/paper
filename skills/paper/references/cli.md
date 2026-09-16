# paper 命令参考

## list

    paper list [--json]
    paper list <模板 id> [--json]

不带参数：列出全部模板（id / 名称 / 格式 / 适用场景）。
带 id：列出该模板的组件（id / 名称 / 必选 / 作用）和可选组件的触发条件。

## describe

    paper describe <模板 id> [--json]

AI 的说明书：模板定位与适用场景、**逐字段的数据契约**、组件清单、示例数据、常用命令。
填数据前必须读它，不要猜字段。

## sample

    paper sample <模板 id> [-o data.json] [--json]

输出可直接编辑的示例数据；不指定 `-o` 时打到 stdout（`--json` 时结构为 `{template, sample}`）。

## gen

    paper gen <模板 id> -d data.json [-o out.docx] [--json] [--open] [-c <组件 id>]... [--set k=v]...

行为：
1. 读 data.json 并按模板 schema 校验；缺字段/类型错会逐条列出并退出码 1，多余字段给 warning 并忽略。
2. 选出组件集合（非 optional 组件 + when(data) 命中的 optional 组件），`-c` 可显式覆盖。
3. 渲染并写文件（自动建目录），打印路径与体积。

`--json` 成功输出：

```json
{
  "ok": true,
  "template": "prd-html",
  "format": "html",
  "out": "/abs/path/prd.html",
  "bytes": 30782,
  "components": ["summary", "metrics", "progress"],
  "dataFile": "/abs/path/data.json"
}
```

## doctor

    paper doctor [--json]

自检：bun 版本、模板与示例数据是否自洽、组件 id 是否重复、字体来源、PDF 链路、
skill 是否已安装。有 fail 项时退出码 1。

## 全局参数

    --json / --verbose / --quiet / --no-color

## 填数据三条建议

1. 字段的 `example` 直接套结构，内容换成真实的。
2. 可选字段留空（删掉 key）比编造内容好：留空就不生成该组件。
3. 长文本用完整句子，不要用 "…" 省略；表格里的短字段不要换行。
