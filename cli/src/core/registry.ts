/**
 * 模板注册表：所有模板模块的只读查询入口。
 */

import { templates as generated } from "../generated/registry";
import { notFound, usage } from "./errors";
import type { ComponentModule, TemplateModule } from "./types";

export function allTemplates(): TemplateModule[] {
  return [...generated].sort((a, b) => a.meta.id.localeCompare(b.meta.id));
}

export function getTemplate(id: string): TemplateModule | undefined {
  return generated.find((t) => t.meta.id === id);
}

export function requireTemplate(id: string): TemplateModule {
  const template = getTemplate(id);
  if (!template) {
    throw notFound(
      "没有找到文档模板 " + id,
      "运行 paper list 看全部模板 id",
    );
  }
  return template;
}

export function sortedComponents(template: TemplateModule): ComponentModule[] {
  return [...template.components].sort((a, b) => {
    const ao = a.meta.order ?? 100;
    const bo = b.meta.order ?? 100;
    if (ao !== bo) return ao - bo;
    return a.meta.id.localeCompare(b.meta.id);
  });
}

export function getComponent(template: TemplateModule, id: string): ComponentModule | undefined {
  return template.components.find((c) => c.meta.id === id);
}

/**
 * 组件选择规则（决定 --component 之外还能自动带出哪些块）：
 *   1. 显式 --component 优先，顺序按用户给的顺序；
 *   2. 否则：非 optional 组件必选；
 *   3. optional 组件在 when(data) 命中时自动出现。
 */
export function selectComponents(
  template: TemplateModule,
  data: Record<string, any>,
  explicit?: string[],
): string[] {
  const components = sortedComponents(template);
  if (explicit && explicit.length > 0) {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const id of explicit) {
      const component = getComponent(template, id);
      if (!component) {
        throw usage(
          "模板 " + template.meta.id + " 没有组件 " + id,
          "运行 paper list " + template.meta.id + " 看可用组件",
        );
      }
      if (!seen.has(id)) {
        seen.add(id);
        result.push(id);
      }
    }
    return result;
  }
  const result: string[] = [];
  for (const component of components) {
    if (!component.meta.optional) {
      result.push(component.meta.id);
      continue;
    }
    if (component.meta.when && component.meta.when(data)) result.push(component.meta.id);
  }
  return result;
}

/** 数据里是否"有内容"：AI 生成的占位数据常常是空数组/空串，这里统一判断。 */
export function hasContent(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as object).length > 0;
  return true;
}
