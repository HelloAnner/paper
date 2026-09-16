/**
 * 渲染执行器：把"模板 + 数据 + 组件选择"跑成一个产物。
 *
 * 模板作者只需要拿到 ctx 里的三个 kit 和 ctx.use()，其余（组件选择、
 * 缓存、pdf 字体子集、错误包装）都在这里统一处理。
 *
 * pdf 为什么跑两遍：
 *   嵌入的字体只保留文档真正用到的字形（否则一份 PDF 要背 8MB 字体）。
 *   第一遍用完整字体排版，顺便记录"画过哪些文本"；第二遍用裁好的字体
 *   重新渲染。因为字形 id 不变、布局是确定性的，两遍结果完全一致，
 *   而最终 PDF 只嵌 100~400KB 的字体数据。
 */

import { createDocxKit } from "./docx-kit";
import { createHtmlKit } from "./html-kit";
import { createPdf, subsetFontsForTexts, type PdfInitOptions } from "./pdf-kit";
import { getComponent, selectComponents } from "./registry";
import { renderError } from "./errors";
import type { Artifact, ComponentModule, RenderContext, TemplateModule } from "./types";

export interface RenderRequest {
  template: TemplateModule;
  data: Record<string, any>;
  /** --component 显式指定的组件（顺序即渲染顺序） */
  components?: string[];
  /** --set k=v 透传参数 */
  params?: Record<string, string>;
  /** 数据文件所在目录（图片等相对路径的基准） */
  assetDir?: string;
  onLog?: (message: string) => void;
}

export interface RenderResult {
  artifact: Artifact;
  selected: string[];
}

function pdfStub(): RenderContext["pdf"] {
  const message = "当前模板不是 pdf 模板，ctx.pdf 不可用";
  return new Proxy(
    {},
    {
      get() {
        throw renderError(message);
      },
      has() {
        return false;
      },
    },
  ) as unknown as RenderContext["pdf"];
}

export async function renderTemplate(request: RenderRequest): Promise<RenderResult> {
  const { template, data } = request;
  const format = template.meta.format;
  const selected = selectComponents(template, data, request.components);
  const docx = createDocxKit();
  const html = createHtmlKit();

  /** 每次渲染都要一份全新的 ctx（组件缓存不能跨遍复用）。 */
  const makeContext = (pdf: RenderContext["pdf"]): RenderContext => {
    const cache = new Map<string, unknown>();
    const ctx: RenderContext = {
      data,
      template: template.meta,
      params: request.params ?? {},
      selected,
      has: (id) => selected.includes(id),
      use: (id) => {
        // 未选中统一返回空数组：调用方可以直接 ...ctx.use(id)，不用先判空
        if (!selected.includes(id)) return [];
        if (cache.has(id)) return cache.get(id);
        const component: ComponentModule | undefined = getComponent(template, id);
        if (!component) return format === "docx" ? [] : undefined;
        const result = component.render(ctx);
        cache.set(id, result);
        return result;
      },
      useAll: () => {
        const results: unknown[] = [];
        for (const id of selected) {
          const value = ctx.use(id);
          if (value !== undefined && value !== null) results.push(value);
        }
        return results;
      },
      renderBlock: (componentId, block) => {
        if (!selected.includes(componentId)) return format === "docx" ? [] : "";
        const component = getComponent(template, componentId);
        if (!component || !component.renderBlock) return format === "docx" ? [] : "";
        return component.renderBlock({ ...ctx, block }, block);
      },
      block: undefined,
      assetDir: request.assetDir,
      docx,
      pdf,
      html,
      log: (message) => request.onLog?.(message),
    };
    return ctx;
  };

  if (format === "pdf") {
    const pdfOptions: PdfInitOptions = {
      title: typeof data.title === "string" ? data.title : template.meta.name,
      author: typeof data.author === "string" ? data.author : "paper",
      ...(template.meta.page ?? {}),
    };

    const first = await createPdf(pdfOptions);
    let artifact = await Promise.resolve(template.render(makeContext(first)));

    const used = first.getUsedTexts();
    if (used.regular.length + used.bold.length > 0) {
      const subsets = await subsetFontsForTexts(used);
      if (subsets) {
        const second = await createPdf(pdfOptions, subsets);
        artifact = await Promise.resolve(template.render(makeContext(second)));
      }
    }
    return { artifact, selected };
  }

  const artifact = await Promise.resolve(template.render(makeContext(pdfStub())));
  return { artifact, selected };
}
