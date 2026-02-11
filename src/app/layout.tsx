import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { ModelConfigProvider } from "@/features/settings/context";
import "./globals.css";

export const metadata: Metadata = {
  title: "文档智能提取",
  description:
    "使用多模态大模型将 PDF 文档智能转换为 Markdown 格式。支持 Qwen-VL、GPT-4o、Gemini 等模型。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} min-h-screen bg-zinc-50 font-sans antialiased`}
      >
        <ModelConfigProvider>{children}</ModelConfigProvider>
      </body>
    </html>
  );
}
