/**
 * 极简 argv 解析器：paper 的参数形态固定（子命令 + 少量 flag），
 * 不引入 commander/yargs，减少依赖和打包体积。
 *
 * 支持：
 *   --data d.json      --data=d.json      --json（布尔）
 *   --component a --component b           （重复出现 => 数组）
 *   -o out.docx        （短参数靠 aliases 映射到长参数）
 *   --no-color         （负向布尔）
 *   -- 之后的全部内容进 passthrough
 */

import { usage } from "./errors";

/** paper 各命令共用的短参数映射，避免全局解析时把 -o 当成未知参数。 */
export const COMMON_ALIASES: Record<string, string> = {
  "-d": "--data",
  "-o": "--out",
  "-c": "--component",
};

export interface ParsedArgs {
  positionals: string[];
  flags: Map<string, string | string[] | boolean>;
  passthrough: string[];
}

function looksLikeFlag(token: string): boolean {
  if (!token.startsWith("-")) return false;
  if (token === "-") return false;
  if (token === "--") return true;
  // 负数不当参数，例如 --width -3
  return !/^-\d/.test(token);
}

function setFlag(
  flags: Map<string, string | string[] | boolean>,
  name: string,
  value: string | boolean,
): void {
  const prev = flags.get(name);
  if (prev === undefined) {
    flags.set(name, value);
    return;
  }
  if (Array.isArray(prev)) {
    prev.push(String(value));
    return;
  }
  flags.set(name, [String(prev), String(value)]);
}

export function parseArgs(argv: string[], aliases: Record<string, string> = {}): ParsedArgs {
  const positionals: string[] = [];
  const flags = new Map<string, string | string[] | boolean>();
  const passthrough: string[] = [];

  let i = 0;
  while (i < argv.length) {
    const token = argv[i] as string;

    if (token === "--") {
      passthrough.push(...argv.slice(i + 1));
      break;
    }

    if (token.startsWith("--")) {
      const eq = token.indexOf("=");
      let key = eq >= 0 ? token.slice(2, eq) : token.slice(2);
      let value: string | undefined = eq >= 0 ? token.slice(eq + 1) : undefined;

      if (value === undefined && key.startsWith("no-")) {
        setFlag(flags, "--" + key.slice(3), false);
        i += 1;
        continue;
      }

      if (value === undefined) {
        const next = argv[i + 1];
        if (next !== undefined && !looksLikeFlag(next)) {
          value = next;
          i += 1;
        }
      }
      setFlag(flags, "--" + key, value === undefined ? true : value);
      i += 1;
      continue;
    }

    if (token.startsWith("-") && token.length > 1) {
      const short = token.slice(0, 2);
      const rest = token.slice(2);
      const long = aliases[short];
      if (!long) {
        throw usage("未知参数 " + token, "运行 paper help 查看全部参数");
      }
      let value: string | undefined;
      if (rest.length > 0) {
        value = rest.startsWith("=") ? rest.slice(1) : rest;
      } else {
        const next = argv[i + 1];
        if (next !== undefined && !looksLikeFlag(next)) {
          value = next;
          i += 1;
        }
      }
      setFlag(flags, long, value === undefined ? true : value);
      i += 1;
      continue;
    }

    positionals.push(token);
    i += 1;
  }

  return { positionals, flags, passthrough };
}

export function flagStr(args: ParsedArgs, name: string): string | undefined {
  const v = args.flags.get(name);
  if (v === undefined || v === false) return undefined;
  if (v === true) return "";
  if (Array.isArray(v)) return v[v.length - 1];
  return v;
}

export function flagList(args: ParsedArgs, name: string): string[] {
  const v = args.flags.get(name);
  if (v === undefined || v === false || v === true) return [];
  if (Array.isArray(v)) {
    // 同时支持 --component a,b,c 的逗号写法
    return v.flatMap((item) => String(item).split(",")).map((s) => s.trim()).filter(Boolean);
  }
  return String(v).split(",").map((s) => s.trim()).filter(Boolean);
}

export function flagBool(args: ParsedArgs, name: string): boolean {
  const v = args.flags.get(name);
  if (v === undefined) return false;
  if (v === true) return true;
  if (v === false) return false;
  if (Array.isArray(v)) return v.length > 0;
  return v !== "false" && v !== "0" && v !== "";
}

export function hasFlag(args: ParsedArgs, name: string): boolean {
  return args.flags.has(name);
}

export function flagNum(args: ParsedArgs, name: string): number | undefined {
  const raw = flagStr(args, name);
  if (raw === undefined || raw === "") return undefined;
  const n = Number(raw);
  if (Number.isNaN(n)) throw usage("参数 " + name + " 需要一个数字，收到：" + raw);
  return n;
}
