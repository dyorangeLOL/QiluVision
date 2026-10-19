import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  DEEPSEEK_API_KEY: z.string().min(1),
  DEEPSEEK_BASE_URL: z.url().default("https://api.deepseek.com"),
  DEEPSEEK_MODEL: z.string().min(1).default("deepseek-flash"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(apiKey?: string | null): ServerEnv {
  const result = serverEnvSchema.safeParse({
    DEEPSEEK_API_KEY: apiKey ?? process.env.DEEPSEEK_API_KEY,
    DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL,
    DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL,
  });
  if (!result.success) throw new Error("DeepSeek 配置不可用，请在设置中填写 API Key，或联系部署者检查服务器配置。");
  return result.data;
}
