# paper —— 本地离线文档生成 CLI
#
# 常用目标：
#   make                = make help
#   make install        编译 CLI 到 $(PREFIX)/bin/paper + 字体到 $(PREFIX)/share/paper/fonts
#                       + skills/paper 软链到 ~/.agents/skills/paper
#   make dev ARGS=list  用源码直接跑（开发模式）
#   make check          typecheck + 测试 + 编译

SHELL      := /bin/bash
ROOT       := $(shell pwd)

PREFIX     ?= $(HOME)/.local
BIN_DIR    := $(PREFIX)/bin
FONT_DEST  := $(PREFIX)/share/paper/fonts

CLI_DIR    := cli
CLI_BIN    := $(CLI_DIR)/dist/paper
CLI_DEPS   := $(CLI_DIR)/node_modules/.paper-deps
FONT_SRC   := $(CLI_DIR)/assets/fonts

SKILL_SRC  := skills/paper
SKILL_DEST := $(HOME)/.agents/skills/paper

.DEFAULT_GOAL := help
.PHONY: help deps fonts registry build install install-cli install-fonts install-skill \
        uninstall uninstall-skill dev list test typecheck check clean

help:
	@echo "paper —— 本地离线文档生成 CLI"
	@echo ""
	@echo "  make install        安装 CLI + 字体 + skill 软链（推荐）"
	@echo "  make install-cli    只安装 CLI 二进制到 $(BIN_DIR)/paper"
	@echo "  make install-fonts  只安装字体到 $(FONT_DEST)"
	@echo "  make install-skill  只安装 skill 软链到 $(SKILL_DEST)"
	@echo "  make uninstall      卸载 CLI 与 skill"
	@echo "  make build          编译单文件二进制到 $(CLI_BIN)"
	@echo "  make dev ARGS=list  用源码运行（例：make dev ARGS='describe weekly-report'）"
	@echo "  make list           列出内置文档模板"
	@echo "  make fonts          下载 pdf 中文字体到 $(FONT_SRC)"
	@echo "  make test           跑测试"
	@echo "  make typecheck      TypeScript 类型检查"
	@echo "  make check          typecheck + test + build"
	@echo "  make clean          清理构建产物"
	@echo ""
	@echo "PREFIX 当前为 $(PREFIX)，可用 make install PREFIX=/usr/local 覆盖"

# ── 依赖 ────────────────────────────────────────────────
$(CLI_DEPS): $(CLI_DIR)/package.json
	@command -v bun >/dev/null || { echo "✗ 需要 bun：https://bun.sh"; exit 1; }
	@echo "→ 安装依赖 ..."
	@cd $(CLI_DIR) && bun install
	@touch $@

deps: $(CLI_DEPS)

# ── 字体 ────────────────────────────────────────────────
$(FONT_SRC)/NotoSansSC-Regular.ttf: $(CLI_DEPS)
	@echo "→ 准备 pdf 中文字体 ..."
	@cd $(CLI_DIR) && bun run fonts

fonts: $(FONT_SRC)/NotoSansSC-Regular.ttf

# ── 构建 ────────────────────────────────────────────────
registry: deps
	@cd $(CLI_DIR) && bun run registry

build: deps fonts
	@cd $(CLI_DIR) && bun run build

dev: registry
	@cd $(CLI_DIR) && bun run dev -- $(ARGS)

# ── 安装 ────────────────────────────────────────────────
install: install-cli install-fonts install-skill
	@echo ""
	@echo "✓ paper 安装完成"
	@if echo ":$$PATH:" | grep -q ":$(BIN_DIR):"; then echo "  $(BIN_DIR) 已在 PATH 中"; else echo "  提醒：$(BIN_DIR) 不在 PATH 中，请加入 PATH"; fi
	@echo "  试一下：paper doctor"

install-cli: deps
	@echo "→ 编译 paper ..."
	@cd $(CLI_DIR) && bun run build
	@mkdir -p "$(BIN_DIR)"
	@cp "$(CLI_BIN)" "$(BIN_DIR)/paper"
	@chmod +x "$(BIN_DIR)/paper"
	@echo "  ✓ $(BIN_DIR)/paper"

install-fonts: fonts
	@mkdir -p "$(FONT_DEST)"
	@cp $(FONT_SRC)/NotoSansSC-Regular.ttf $(FONT_SRC)/NotoSansSC-Bold.ttf "$(FONT_DEST)/"
	@echo "  ✓ $(FONT_DEST)"

install-skill:
	@echo "→ 安装 skill ..."
	@mkdir -p "$(HOME)/.agents/skills"
	@rm -rf "$(SKILL_DEST)"
	@ln -s "$(ROOT)/$(SKILL_SRC)" "$(SKILL_DEST)"
	@echo "  ✓ $(SKILL_DEST) -> $(ROOT)/$(SKILL_SRC)"
	@test -f "$(SKILL_DEST)/SKILL.md" && echo "  ✓ SKILL.md 可读"

uninstall: uninstall-skill
	@rm -f "$(BIN_DIR)/paper"
	@echo "→ 已移除 $(BIN_DIR)/paper（字体保留在 $(FONT_DEST)）"

uninstall-skill:
	@if [ -L "$(SKILL_DEST)" ]; then rm -f "$(SKILL_DEST)"; echo "→ 已移除 skill 软链"; else echo "→ 未发现 skill 软链，跳过"; fi

# ── 开发 ────────────────────────────────────────────────
list: deps
	@cd $(CLI_DIR) && bun run dev -- list

test: registry
	@cd $(CLI_DIR) && bun test

typecheck: registry
	@cd $(CLI_DIR) && bun run typecheck

check: typecheck test build

clean:
	@rm -rf $(CLI_DIR)/dist $(CLI_DIR)/out
	@echo "→ 已清理 $(CLI_DIR)/dist"
