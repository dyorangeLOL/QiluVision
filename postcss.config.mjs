import path from "node:path";

const postcssConfig = {
  plugins: {
    // 只扫描产品源码，不扫描解压目录、文档或测试输出中的嵌套项目。
    "@tailwindcss/postcss": { base: path.resolve(process.cwd(), "src") },
  },
};

export default postcssConfig;
