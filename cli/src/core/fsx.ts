/**
 * 文件读写小工具：统一 UTF-8、自动建目录、写后返回绝对路径。
 */

import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { PaperError, toPaperError } from "./errors";

export function absPath(p: string, base = process.cwd()): string {
  return isAbsolute(p) ? p : resolve(base, p);
}

export async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

export async function readText(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (e) {
    throw toPaperError(e, "E_IO", "读取文件失败 " + path);
  }
}

export async function readJson(path: string): Promise<unknown> {
  const text = await readText(path);
  try {
    return JSON.parse(text) as unknown;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new PaperError("E_DATA", "JSON 解析失败 " + path + "：" + msg, "检查是否有尾逗号或注释");
  }
}

/** 读取模板资产（图片、SVG 等）：相对路径以数据文件所在目录为基准。 */
export async function readAsset(baseDir: string | undefined, src: string): Promise<string> {
  const target = absPath(src, baseDir ?? process.cwd());
  try {
    return await readFile(target, "utf8");
  } catch (e) {
    throw toPaperError(e, "E_IO", "读取资源失败 " + target);
  }
}

export async function writeText(path: string, content: string): Promise<string> {
  const target = absPath(path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
  return target;
}

export async function writeBytes(path: string, data: Uint8Array): Promise<string> {
  const target = absPath(path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, data);
  return target;
}
