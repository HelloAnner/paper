# 新增模板 / 组件（给 coding agent）

原则：**新增文档模板 = 硬编码一个文件夹**，不考虑通用性和扩展性；
模板之间不共享业务代码，只共享 `cli/src/core` 下的公共件。

## 目录结构

```text
cli/src/templates/<模板 id>/          # 文件夹名就是模板 id
  template.ts                        # 必需，默认导出 defineTemplate(...)
  components/<组件 id>/
    component.ts                     # 默认导出 defineComponent(...)
```

新增文件夹后**不需要登记**：`make build` / `make dev` 会自动重新生成
`src/generated/registry.ts`（scripts/gen-registry.ts 扫描子目录）。
组件的注册是显式的：在 `template.ts` 里 import 并放进 `components: [...]`。

## 最小模板（docx）

docx 模板的排版由 `meta.docx` 的角色规范决定（字体、字号、缩进、间距），
组件只写"这段是什么角色"。规范细节见下一节。

```ts
import { defineTemplate } from "../../core/types";
import type { DocxBlock } from "../../core/docx-kit";
import intro from "./components/intro/component";
import { MY_DOCX_SPEC } from "./style";

export default defineTemplate({
  meta: {
    id: "my-doc",              // 必须等于文件夹名
    name: "我的文档",
    format: "docx",            // docx | pdf | html
    description: "一句话说明产出什么",
    useWhen: "什么场景选它（AI 挑模板就看这句，写具体）",
    tags: ["报告"],
    docx: MY_DOCX_SPEC,        // 角色样式规范：run.ts 用它构造 ctx.docx
  },
  schema: {
    title: { type: "string", required: true, desc: "标题", example: "示例标题" },
    // type: string | number | boolean | enum | string[] | object | array
    // 数组用 items.fields 描述对象结构；example 一定要写，AI 会照着填
  },
  components: [intro],
  sample: { title: "示例标题" },   // 可选；缺省由 schema 的 example 生成
  async render(ctx) {
    const body: DocxBlock[] = [...ctx.use("intro")];
    return {
      kind: "docx",
      document: ctx.docx.document({
        sections: [
          { blocks: [...ctx.docx.heading("paper-title", ctx.data.title)] },   // 封面节（可加 footer: null）
          { blocks: body, footer: { pageNumber: true }, pageNumberStart: 1 },  // 正文节，页码从 1
        ],
        title: String(ctx.data.title ?? ""),
      }),
    };
  },
});
```

组件（docx 组件返回块数组，只写角色）：

```ts
import { defineComponent } from "../../../../core/types";
import type { DocxBlock } from "../../../../core/docx-kit";

export default defineComponent({
  meta: {
    id: "intro",
    name: "开篇",
    order: 10,                  // 渲染顺序，越小越前
    description: "一段开篇话",    // 必填：paper list 会展示
    // optional: true 表示"有数据才出现"，必须配 when + useWhen
    // when: (data) => Boolean(data.intro),
    // useWhen: "data.intro 有内容时自动出现",
  },
  render(ctx): DocxBlock[] {
    return [...ctx.docx.heading("paper-h1", "开篇"), ...ctx.docx.blocks("paper-body", ctx.data.intro)];
  },
});
```

### docx 角色样式规范（meta.docx）

    fonts   { body, heading, alt, mono, latin }    中文字体 + 西文字体
    colors  { text, muted, accent, coverTitle, border, tableHeadFill, ... }
    defaultRole  "paper-body"                       其余角色缺省继承它
    marginMm                                      A4 页边距（mm）
    roles   { "paper-body": {...}, "paper-h1": {...}, ... }

角色字段：`name / font / size / bold / color / align / before / after / line /
firstLineChars / left / hanging / outline / keepNext / pageBreakBefore / shading /
borderLeft / borderTop`。

- `size` 用半磅（24 = 12pt）；`line` 240 = 单倍、360 = 1.5 倍；
  `firstLineChars` 是"首行缩进几个字符"（中文正文写 200 = 2 字符）。
- `outline` 是 0/1/2… 大纲级别；目录按它取层级。
- 规范会写进 docx 的样式表（Word 样式面板显示 paper-* 角色），改规范即全局改版式。
- 组件调用形如 `ctx.docx.para("paper-h1", text)`、`ctx.docx.table({...})`、
  `ctx.docx.figure({...})`、`ctx.docx.toc({ entries })`，一律不写字号和颜色。
- 参考实现：`templates/progress-docx/style.ts`。

## 三种格式的约定

- **docx**：组件返回 `DocxBlock[]`，模板按节拼装后交给
  `ctx.docx.document({ sections, ... })`。积木见 core/docx-kit.ts：
  rich / para / paraText / blocks / heading / list / bookmark / table / coverTable /
  kv / figure / toc / rule / spacer / pageBreak / section / document。
  多节用于"封面无页脚 / 目录无页码 / 正文页码从 1"这种分节版式。
- **pdf**：组件直接往 `ctx.pdf` 上画（无返回值），调用顺序即文档顺序，分页用
  `ctx.pdf.pageBreak()`。积木见 core/pdf-kit.ts（含 table / metricCards / cover）。
  第 1 页是封面时在 `meta.page` 写 `cover: true`（封面不画页眉页脚，页码从正文算起）。
- **html**：组件返回 HTML 字符串，模板用 `ctx.html.page({ title, body })` 包成单文件。

## 文档型模板（blocks 数组 + renderBlock）

长文档（PRD、方案、报告）不适合"一个组件渲染一整块"，而适合"一个有序 blocks 数组描述全文"。
这种模板的写法（参考 templates/prd-html）：

    const BLOCK_OWNER = { h2: "prose", h3: "prose", p: "prose", list: "prose",
                          table: "tables", figure: "figures" };

    async render(ctx) {
      const parts = [ ...ctx.use("masthead"), ...ctx.use("title") ];
      for (let i = 0; i < blocks.length; i += 1) {
        const block = blocks[i];
        const owner = BLOCK_OWNER[block.type];
        if (!owner) { ctx.log("未知块类型 " + block.type); continue; }
        const html = await ctx.renderBlock(owner, { ...block, __index: i });
        if (html) parts.push(html);
      }
      return { kind: "html", html: shell(parts.join("\n")) };
    }

配套约定：
- 组件实现可选的 renderBlock(ctx, block)（而不是 render），负责某一类块；
  ctx.block 就是当前块，模板可以通过 __index 传块序号（做锚点用）。
- ctx.renderBlock 在组件未选中时返回空（html 为 ""，docx 为 []），所以 -c prose
  可以只出文字稿；文档顺序和可选粒度同时成立。
- 组件读文件用 readAsset(ctx.assetDir, src)：assetDir 是 data.json 所在目录，
  相对路径都以它为基准（图、附件都这样处理）。
- ctx.use(id) 在组件未选中时统一返回 []，所以 ...ctx.use(id) 可以直接 spread。

## 组件选择规则（core/registry.ts）

1. `-c/--component` 显式指定时只用指定的（顺序按用户给的）；
2. 否则非 optional 组件必选；
3. optional 组件在 `when(data) === true` 时自动出现。

## 数据契约写法

`schema` 每个字段都要有 `desc`（写给 AI 看的中文说明）和 `example`（可直接照抄的示例）。
`paper describe` 会渲染成表格，`paper sample` 用它兜底生成示例数据。

## 自测清单

1. `cd cli && bun run registry && bunx tsc --noEmit`
2. `bun test`（tests/cli.test.ts 会遍历所有模板跑样例渲染）
3. `bun run src/cli.ts list <模板 id>` / `describe <模板 id>` 输出是否可读
4. `bun run src/cli.ts gen <模板 id> -d sample.json -o /tmp/x.<ext>` 后肉眼验证：
   - pdf：`bun run scripts/preview.ts /tmp/x.pdf 1,2` 导出 PNG 看图
   - docx：`textutil -convert txt /tmp/x.docx -stdout | head`；
     目录页是动态域，用 `python3 -c` 解压看 document.xml 里的 PAGEREF / sectPr 更可靠
5. 改了命令 / 参数 / 模板行为，同步更新 `skills/paper` 与 `docs/*.txt`
