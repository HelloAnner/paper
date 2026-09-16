#!/usr/bin/env python3
"""把可变字体（variable font）实例化成静态 ttf。

为什么用 ttf 而不是 otf：
  1. pdf-lib 的自带子集化对 CFF(otf) 有 bug，中文会乱码；
  2. paper 的字体子集实现（保留字形 id 的稀疏子集）只支持 glyf 轮廓，
     也就是 ttf。可变字体本身就是 glyf，实例化是最安全的 ttf 来源。

用法：
    python3 scripts/instance-font.py NotoSansSC-VF.ttf NotoSansSC-Regular.ttf --weight 400
依赖：fontTools（pip install fonttools）
"""

import argparse
import sys

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont


def set_name(font, name_id, value):
    for record in font["name"].names:
        if record.nameID == name_id:
            record.string = value.encode("utf-16-be") if record.platformID == 3 else value.encode("latin-1", "ignore")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("target")
    parser.add_argument("--weight", type=float, default=400)
    parser.add_argument("--ps-name", default="")
    args = parser.parse_args()

    font = TTFont(args.source)
    if "fvar" in font:
        instantiateVariableFont(font, {"wght": args.weight}, inplace=True, updateFontNames=False)

    if args.ps_name:
        # 常规与粗体必须有不同的 PostScript 名，否则阅读器可能复用同一份字体
        set_name(font, 6, args.ps_name)
        set_name(font, 4, args.ps_name)

    font.save(args.target)
    print("✓ " + args.target)


if __name__ == "__main__":
    sys.exit(main())
