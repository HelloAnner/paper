import { defineComponent } from "../../../../core/types";

/** 头部：标题 + 副标题 + 更新时间。模板已经用 html.title 渲染，这里作为占位。 */
export default defineComponent({
  meta: {
    id: "hero",
    name: "头部",
    order: 10,
    description: "标题与更新时间（由模板直接渲染，组件保留给后续扩展）",
  },
  render(): string {
    return "";
  },
});
