/**
 * 轻量数据契约（schema）。
 *
 * 为什么不用 zod：
 *   1. 模板作者要写的注释就是给 AI 看的文档，字段上的 desc 直接出现在
 *      "paper describe" 里，zod 做不到这么直白的中文说明；
 *   2. 依赖更少，打包更快；
 *   3. 数据来自 AI 生成，错误信息需要"人话"，而不是类型体操。
 *
 * 约定：schema 是 Record<字段名, Field>，只描述顶层对象。
 */

export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "enum"
  | "string[]"
  | "object"
  | "array";

export interface Field {
  type: FieldType;
  /** 给 AI/人看的说明，写清楚"填什么、什么格式、给个例子" */
  desc: string;
  required?: boolean;
  /** 示例值：paper sample 会优先用它 */
  example?: unknown;
  /** enum 的可选值 */
  values?: string[];
  /** object 的字段 */
  fields?: Record<string, Field>;
  /** array 的元素定义 */
  items?: Field;
}

export interface Schema {
  [key: string]: Field;
}

export interface Issue {
  path: string;
  message: string;
}

export interface ValidationResult {
  errors: Issue[];
  warnings: Issue[];
}

function typeNameOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function describeExpected(field: Field): string {
  switch (field.type) {
    case "string[]":
      return "字符串数组";
    case "array":
      return "数组";
    case "object":
      return "对象";
    case "enum":
      return "枚举 " + (field.values ?? []).join(" | ");
    default:
      return field.type;
  }
}

function matchesType(field: Field, value: unknown): boolean {
  switch (field.type) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    case "enum":
      return typeof value === "string" && (field.values ?? []).includes(value);
    case "string[]":
      return Array.isArray(value) && value.every((v) => typeof v === "string");
    case "array":
      return Array.isArray(value);
    case "object":
      return typeof value === "object" && value !== null && !Array.isArray(value);
    default:
      return true;
  }
}

function validateField(field: Field, value: unknown, path: string, result: ValidationResult): void {
  if (!matchesType(field, value)) {
    result.errors.push({
      path,
      message: "应为 " + describeExpected(field) + "，实际是 " + typeNameOf(value),
    });
    return;
  }
  if (field.type === "object" && field.fields) {
    validateObject(field.fields, value as Record<string, unknown>, path, result);
  }
  if (field.type === "array" && field.items) {
    for (let i = 0; i < (value as unknown[]).length; i += 1) {
      const item = (value as unknown[])[i];
      const itemPath = path + "[" + i + "]";
      if (field.items.type === "object" && field.items.fields) {
        if (typeof item !== "object" || item === null || Array.isArray(item)) {
          result.errors.push({ path: itemPath, message: "应为对象" });
          continue;
        }
        validateObject(field.items.fields, item as Record<string, unknown>, itemPath, result);
      } else if (!matchesType(field.items, item)) {
        result.errors.push({
          path: itemPath,
          message: "应为 " + describeExpected(field.items) + "，实际是 " + typeNameOf(item),
        });
      }
    }
  }
}

function validateObject(
  schema: Schema,
  data: Record<string, unknown>,
  prefix: string,
  result: ValidationResult,
): void {
  for (const [key, field] of Object.entries(schema)) {
    const path = prefix ? prefix + "." + key : key;
    const value = data[key];
    if (value === undefined || value === null || value === "") {
      if (field.required) {
        result.errors.push({ path, message: "缺少必填字段（" + field.desc + "）" });
      }
      continue;
    }
    validateField(field, value, path, result);
  }
  for (const key of Object.keys(data)) {
    if (!(key in schema)) {
      result.warnings.push({
        path: prefix ? prefix + "." + key : key,
        message: "schema 里没有这个字段，会被模板忽略",
      });
    }
  }
}

export function validateData(schema: Schema, data: unknown): ValidationResult {
  const result: ValidationResult = { errors: [], warnings: [] };
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    result.errors.push({ path: "(root)", message: "数据根节点必须是对象 {}" });
    return result;
  }
  validateObject(schema, data as Record<string, unknown>, "", result);
  return result;
}

export interface SchemaRow {
  path: string;
  type: string;
  required: string;
  desc: string;
}

function typeLabel(field: Field): string {
  switch (field.type) {
    case "string[]":
      return "string[]";
    case "array":
      return field.items && field.items.type === "object" ? "object[]" : "array";
    case "enum":
      return "enum";
    default:
      return field.type;
  }
}

/** 把 schema 拍平成可对齐的表格行，供 paper describe 输出。 */
export function schemaRows(schema: Schema): SchemaRow[] {
  const rows: SchemaRow[] = [];

  const walk = (fields: Schema, prefix: string, depth: number): void => {
    for (const [key, field] of Object.entries(fields)) {
      const path = prefix ? prefix + "." + key : key;
      rows.push({
        path: (depth > 0 ? "  ".repeat(depth) + "└ " : "") + key,
        type: typeLabel(field),
        required: field.required ? "必填" : "可选",
        desc: field.desc,
      });
      if (field.type === "object" && field.fields) walk(field.fields, path, depth + 1);
      if (field.type === "array" && field.items?.type === "object" && field.items.fields) {
        walk(field.items.fields, path + "[]", depth + 1);
      }
    }
  };

  walk(schema, "", 0);
  return rows;
}

function placeholder(field: Field): unknown {
  if (field.example !== undefined) return field.example;
  switch (field.type) {
    case "string":
      return "";
    case "number":
      return 0;
    case "boolean":
      return false;
    case "enum":
      return field.values?.[0] ?? "";
    case "string[]":
      return [];
    case "array": {
      const item = field.items ? sampleField(field.items) : null;
      return item === null ? [] : [item];
    }
    case "object":
      return field.fields ? sampleObject(field.fields) : {};
    default:
      return null;
  }
}

function sampleField(field: Field): unknown {
  return placeholder(field);
}

function sampleObject(schema: Schema): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(schema)) out[key] = placeholder(field);
  return out;
}

/** 没有手写 sample 时，用 schema 的 example 兜底生成示例数据。 */
export function sampleFromSchema(schema: Schema): Record<string, unknown> {
  return sampleObject(schema);
}

/** 给 AI 看的一行式类型签名，例如 progress: { item: string, status: enum }[] */
export function compactSignature(schema: Schema): string {
  const parts: string[] = [];
  for (const [key, field] of Object.entries(schema)) {
    let sig: string;
    if (field.type === "object" && field.fields) {
      sig = "{ " + Object.keys(field.fields).join(", ") + " }";
    } else if (field.type === "array" && field.items?.type === "object" && field.items.fields) {
      sig = "{ " + Object.keys(field.items.fields).join(", ") + " }[]";
    } else {
      sig = typeLabel(field);
      if (field.type === "enum") sig += "(" + (field.values ?? []).join("|") + ")";
    }
    parts.push(key + (field.required ? "" : "?") + ": " + sig);
  }
  return "{ " + parts.join(", ") + " }";
}
