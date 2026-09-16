/**
 * Artifact -> 文件字节。模板只负责产出结构，落盘统一在这里。
 */

import { Packer } from "docx";
import type { Artifact, TemplateModule } from "./types";
import { renderError } from "./errors";

export interface Materialized {
  data: Uint8Array;
  ext: string;
}

export async function materialize(artifact: Artifact): Promise<Materialized> {
  switch (artifact.kind) {
    case "docx": {
      const buffer = await Packer.toBuffer(artifact.document as Parameters<typeof Packer.toBuffer>[0]);
      return { data: new Uint8Array(buffer), ext: "docx" };
    }
    case "pdf": {
      const bytes = await artifact.pdf.save();
      return { data: bytes, ext: "pdf" };
    }
    case "html":
      return { data: new TextEncoder().encode(artifact.html), ext: "html" };
    case "bytes":
      return { data: artifact.data, ext: artifact.ext };
    default:
      throw renderError("未知的产物类型");
  }
}

export function defaultExt(template: TemplateModule): string {
  return template.meta.format === "docx" ? "docx" : template.meta.format === "pdf" ? "pdf" : "html";
}
