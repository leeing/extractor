import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ModelConfigProvider } from "@/features/settings/context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Document Extractor — PDF to Markdown",
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
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-zinc-50 font-sans antialiased dark:bg-zinc-950`}
      >
        <ModelConfigProvider>{children}</ModelConfigProvider>
      </body>
    </html>
  );
}
