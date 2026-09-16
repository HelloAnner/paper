/**
 * 模板 / 组件 / 渲染上下文的核心契约。
 *
 * 三个格式各有一个公共 kit（docx-kit / pdf-kit / html-kit），
 * 模板与组件的业务代码不做任何复用，只复用这些基础件。
 */

import type { Schema } from "./schema";
import type { DocxKit } from "./docx-kit";
import type { PdfBuilder, PdfInitOptions } from "./pdf-kit";
import type { HtmlKit } from "./html-kit";

export type DocFormat = "docx" | "pdf" | "html";

export interface TemplateMeta {
  /** 唯一 id，等于 src/templates 下的文件夹名 */
  id: string;
  /** 中文短名，用于列表展示 */
  name: string;
  format: DocFormat;
  /** 一句话说明这个模板产出什么 */
  description: string;
  /** 什么场景该选它 —— paper list 会把这段给 AI 看 */
  useWhen: string;
  tags?: string[];
  /** pdf / html 的页面参数 */
  page?: PdfInitOptions;
}

export interface ComponentMeta {
  /** 唯一 id，等于 components 下的文件夹名 */
  id: string;
  name: string;
  /** 这个组件负责文档的哪一块 */
  description: string;
  /** 排序权重，越小越靠前 */
  order?: number;
  /** true = 可选组件：只有 when(data) 命中或被 --component 显式指定才会渲染 */
  optional?: boolean;
  /** 给 AI 看的触发条件说明 */
  useWhen?: string;
  when?: (data: Record<string, any>) => boolean;
}

export type ComponentOutput = unknown;

export interface ComponentModule {
  meta: ComponentMeta;
  render: (ctx: RenderContext) => ComponentOutput | Promise<ComponentOutput>;
  /**
   * 文档型模板（一个 blocks 数组描述全文）用：按块渲染。
   * 模板负责遍历 blocks，把每个块交给"管这类块"的组件，从而既保证文档顺序，
   * 又保留 --component 的可选择粒度。
   */
  renderBlock?: (ctx: RenderContext, block: any) => ComponentOutput | Promise<ComponentOutput>;
}

export interface RenderContext {
  data: Record<string, any>;
  template: TemplateMeta;
  /** 命令行透传的自定义参数（--set k=v） */
  params: Record<string, string>;
  /** 最终被选中的组件 id */
  selected: string[];
  has: (id: string) => boolean;
  /** 渲染某个组件；未选中时返回空数组（docx）或 undefined（pdf/html） */
  use: (id: string) => any;
  /** 按 order 渲染全部已选组件 */
  useAll: () => any[];
  /** 把单个块交给指定组件渲染（组件需实现 renderBlock；未选中返回空） */
  renderBlock: (componentId: string, block: any) => any;
  /** 当前渲染的块（组件在 renderBlock 里可读 ctx.block） */
  block?: any;
  /** 数据文件所在目录，用于解析图/附件等相对路径 */
  assetDir?: string;
  docx: DocxKit;
  pdf: PdfBuilder;
  html: HtmlKit;
  log: (msg: string) => void;
}

export type Artifact =
  | { kind: "docx"; document: unknown }
  | { kind: "pdf"; pdf: PdfBuilder }
  | { kind: "html"; html: string }
  | { kind: "bytes"; data: Uint8Array; ext: string };

export interface TemplateModule {
  meta: TemplateMeta;
  schema: Schema;
  /** 手写的示例数据；paper sample 会原样输出 */
  sample?: Record<string, unknown>;
  components: ComponentModule[];
  render: (ctx: RenderContext) => Artifact | Promise<Artifact>;
}

export function defineTemplate(template: TemplateModule): TemplateModule {
  return template;
}

export function defineComponent(component: ComponentModule): ComponentModule {
  return component;
}
