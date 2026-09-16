/**
 * paper 统一错误类型。
 * 所有可预期的失败都用 PaperError 抛出，cli.ts 会把它渲染成
 * "✗ 消息 + 提示"，而不打印堆栈（堆栈只在 --verbose 下出现）。
 */

export type ErrorCode =
  | "E_USAGE"
  | "E_NOT_FOUND"
  | "E_DATA"
  | "E_ENV"
  | "E_RENDER"
  | "E_IO";

export class PaperError extends Error {
  readonly code: ErrorCode;
  readonly hint?: string;

  constructor(code: ErrorCode, message: string, hint?: string) {
    super(message);
    this.name = "PaperError";
    this.code = code;
    this.hint = hint;
  }
}

export function usage(message: string, hint?: string): PaperError {
  return new PaperError("E_USAGE", message, hint);
}

export function notFound(message: string, hint?: string): PaperError {
  return new PaperError("E_NOT_FOUND", message, hint);
}

export function dataError(message: string, hint?: string): PaperError {
  return new PaperError("E_DATA", message, hint);
}

export function envError(message: string, hint?: string): PaperError {
  return new PaperError("E_ENV", message, hint);
}

export function renderError(message: string, hint?: string): PaperError {
  return new PaperError("E_RENDER", message, hint);
}

/** 把任意异常收敛成 PaperError，保留原始消息方便排查。 */
export function toPaperError(e: unknown, code: ErrorCode, prefix: string): PaperError {
  if (e instanceof PaperError) return e;
  const msg = e instanceof Error ? e.message : String(e);
  return new PaperError(code, prefix + "：" + msg);
}

export function errorMessage(e: unknown): string {
  if (e instanceof PaperError) {
    return e.hint ? e.message + "\n  提示：" + e.hint : e.message;
  }
  if (e instanceof Error) return e.message;
  return String(e);
}

export function errorHint(e: unknown): string | undefined {
  return e instanceof PaperError ? e.hint : undefined;
}
