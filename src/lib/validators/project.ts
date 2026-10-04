import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "请输入项目名称。").max(80, "项目名称不能超过 80 个字符。"),
  creativeIntent: z
    .string()
    .trim()
    .min(1, "请输入一句创作意图。")
    .max(300, "创作意图不能超过 300 个字符。"),
});
