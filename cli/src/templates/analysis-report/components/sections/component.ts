import { defineComponent } from "../../../../core/types";

/** 正文章节：每个 section 输出 h1 + 段落 + 要点。 */
export default defineComponent({
  meta: {
    id: "sections",
    name: "正文章节",
    order: 40,
    optional: true,
    description: "正文章节：小标题 + 段落 + 要点",
    useWhen: "data.sections 有内容时自动出现",
    when: (data) => Array.isArray(data.sections) && data.sections.length > 0,
  },

  render(ctx): void {
    const pdf = ctx.pdf;
    const sections = Array.isArray(ctx.data.sections) ? ctx.data.sections : [];
    for (const section of sections) {
      const heading = String(section.heading ?? "").trim();
      if (heading) pdf.h1(heading);
      const paragraphs = Array.isArray(section.paragraphs) ? section.paragraphs : [];
      for (const paragraph of paragraphs) pdf.p(String(paragraph ?? ""));
      const bullets = Array.isArray(section.bullets) ? section.bullets : [];
      if (bullets.length > 0) pdf.bullets(bullets.map((item: unknown) => String(item)));
    }
  },
});
