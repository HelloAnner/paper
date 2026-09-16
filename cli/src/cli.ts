#!/usr/bin/env bun
/**
 * paper CLI 入口：只做命令路由、帮助输出、错误收敛。
 *
 * 命令一览：
 *   list / describe / sample / gen / doctor
 */

import { COMMON_ALIASES, flagBool, parseArgs } from "./core/args";
import { usage, errorMessage } from "./core/errors";
import { createIO, fail, hint, type IO } from "./core/output";
import { listCommand } from "./commands/list";
import { describeCommand } from "./commands/describe";
import { sampleCommand } from "./commands/sample";
import { genCommand } from "./commands/gen";
import { doctorCommand } from "./commands/doctor";

const VERSION = "0.1.0";

const HELP = [
  "paper —— 生成本地离线专业文档的 CLI（docx / pdf / html）",
  "",
  "用法",
  "  paper list [<模板 id>]              列出文档模板；带 id 则列出该模板的组件",
  "  paper describe <模板 id>            查看数据契约、组件、示例数据（AI 主要读这个）",
  "  paper sample <模板 id> [-o f.json]  输出示例数据 JSON",
  "  paper gen <模板 id> -d data.json    生成文档",
  "  paper doctor                        环境自检（字体 / 模板 / PDF 链路）",
  "  paper help | version",
  "",
  "paper gen 参数",
  "  -d, --data <file>       数据 JSON（必填，先用 paper sample 生成）",
  "  -o, --out <file>        输出路径，默认 <模板 id>.<格式>",
  "  -c, --component <id>    只渲染指定组件（可重复、可逗号分隔）",
  "      --set k=v           透传给模板的自定义参数（可重复）",
  "      --open              生成后用系统默认程序打开",
  "",
  "生成工作流",
  "  1) paper list                         选模板",
  "  2) paper describe <id>                读字段说明（AI 填数据前必读）",
  "  3) paper sample <id> > data.json      拿到示例数据并按说明填内容",
  "  4) paper gen <id> -d data.json -o out 产出文档",
  "",
  "全局参数",
  "  --json          机器可读输出（AI 调用建议始终带上）",
  "  --verbose       出错时打印堆栈",
  "  --quiet         只输出结果，不打印过程",
  "  --no-color      关闭 ANSI 颜色",
  "",
  "文档：仓库 docs/*.txt；新增模板见 docs/03-template.txt",
].join("\n");

async function dispatch(argv: string[], io: IO): Promise<void> {
  const command = argv[0];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    process.stdout.write(HELP + "\n");
    return;
  }
  if (command === "version" || command === "--version" || command === "-v") {
    process.stdout.write("paper " + VERSION + "\n");
    return;
  }

  switch (command) {
    case "list":
    case "templates":
      await listCommand(argv, io);
      return;
    case "describe":
    case "show":
      await describeCommand(argv, io);
      return;
    case "sample":
      await sampleCommand(argv, io);
      return;
    case "gen":
    case "generate":
      await genCommand(argv, io);
      return;
    case "doctor":
      await doctorCommand(argv, io);
      return;
    default:
      throw usage("未知子命令 " + command, "运行 paper help 查看全部命令");
  }
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const globalArgs = parseArgs(argv, COMMON_ALIASES);
  const io = createIO(globalArgs);
  const verbose = flagBool(globalArgs, "--verbose");

  try {
    await dispatch(argv, io);
    return 0;
  } catch (e) {
    fail(io, errorMessage(e));
    if (verbose && e instanceof Error && e.stack) {
      process.stderr.write(e.stack + "\n");
    } else if (!verbose) {
      hint(io, "加 --verbose 可看到完整堆栈");
    }
    if (io.json) {
      process.stdout.write(JSON.stringify({ ok: false, error: errorMessage(e) }, null, 2) + "\n");
    }
    return 1;
  }
}

process.exit(await main());
