/**
 * Generate test PDFs with various watermark types for testing the Document Extractor.
 *
 * Usage: npx tsx scripts/generate-test-pdfs.ts
 *
 * Generates:
 * 1. diagonal-watermark.pdf      - 对角线半透明文字水印 (CONFIDENTIAL)
 * 2. header-footer.pdf           - 页眉 + 页脚 + 页码
 * 3. dense-watermark.pdf         - 密集平铺水印
 * 4. border-watermark.pdf        - 带装饰边框 + 底部版权声明
 * 5. combined-watermark.pdf      - 组合：对角线水印 + 页眉页脚 + 页码
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib";

const OUTPUT_DIR = join(process.cwd(), "test-fixtures");

/** 示例正文内容（中文使用英文替代，因 pdf-lib 标准字体不支持中文） */
const BODY_LINES = [
  "Chapter 1: Introduction to Artificial Intelligence",
  "",
  "Artificial intelligence (AI) is a branch of computer science that aims to create",
  "intelligent machines that can perform tasks typically requiring human intelligence.",
  "These tasks include learning, reasoning, problem-solving, perception, and language",
  "understanding.",
  "",
  "1.1 History of AI",
  "",
  "The concept of artificial intelligence has roots that go back to ancient myths and",
  "stories of artificial beings endowed with intelligence. The field of AI research was",
  "founded at a workshop held on the campus of Dartmouth College during the summer of 1956.",
  "",
  "Early AI research explored topics like problem solving, symbolic methods, and search",
  "algorithms. In the 1960s, the US Department of Defense took interest in this type of",
  "work and began training computers to mimic basic human reasoning.",
  "",
  "1.2 Machine Learning",
  "",
  "Machine learning is a subset of AI that focuses on the development of systems that can",
  "learn from and make decisions based on data. Instead of being explicitly programmed,",
  "these systems use algorithms to parse data, learn from it, and then make predictions",
  "or decisions.",
  "",
  "Key types of machine learning:",
  "  - Supervised Learning: The model learns from labeled training data",
  "  - Unsupervised Learning: The model finds patterns in unlabeled data",
  "  - Reinforcement Learning: The model learns through trial and error",
  "",
  "1.3 Deep Learning",
  "",
  "Deep learning is a subset of machine learning that uses neural networks with multiple",
  "layers (hence 'deep') to analyze various factors of data. Deep learning has driven",
  "many recent advances in AI, including computer vision, natural language processing,",
  "and speech recognition.",
];

/** Draw body text on a page */
function drawBody(
  page: ReturnType<PDFDocument["addPage"]>,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  startY: number,
  endY: number,
): void {
  const fontSize = 11;
  const lineHeight = 16;
  let y = startY;
  const x = 72;

  for (const line of BODY_LINES) {
    if (y < endY) break;
    page.drawText(line, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= lineHeight;
  }
}

// ----- 1. Diagonal text watermark -----
async function generateDiagonalWatermark(): Promise<void> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  for (let p = 0; p < 2; p++) {
    const page = doc.addPage([595, 842]); // A4

    // Body text
    drawBody(page, font, 780, 60);

    // Diagonal watermark
    const text = "CONFIDENTIAL";
    page.drawText(text, {
      x: 100,
      y: 300,
      size: 72,
      font: boldFont,
      color: rgb(0.85, 0.85, 0.85),
      rotate: degrees(45),
    });
  }

  const bytes = await doc.save();
  writeFileSync(join(OUTPUT_DIR, "diagonal-watermark.pdf"), bytes);
  console.log("✅ diagonal-watermark.pdf");
}

// ----- 2. Header + Footer + Page number -----
async function generateHeaderFooter(): Promise<void> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  for (let p = 0; p < 3; p++) {
    const page = doc.addPage([595, 842]);

    // Header
    page.drawText("AI Research Institute — Internal Report 2026", {
      x: 72,
      y: 815,
      size: 9,
      font: boldFont,
      color: rgb(0.4, 0.4, 0.4),
    });
    page.drawLine({
      start: { x: 72, y: 810 },
      end: { x: 523, y: 810 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });

    // Body
    drawBody(page, font, 790, 60);

    // Footer line
    page.drawLine({
      start: { x: 72, y: 40 },
      end: { x: 523, y: 40 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    // Footer text
    page.drawText("Strictly Confidential — Do Not Distribute", {
      x: 72,
      y: 28,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    // Page number
    page.drawText(`Page ${p + 1} of 3`, {
      x: 470,
      y: 28,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  const bytes = await doc.save();
  writeFileSync(join(OUTPUT_DIR, "header-footer.pdf"), bytes);
  console.log("✅ header-footer.pdf");
}

// ----- 3. Dense tiled watermark -----
async function generateDenseWatermark(): Promise<void> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  for (let p = 0; p < 2; p++) {
    const page = doc.addPage([595, 842]);

    // Dense tiled watermark (drawn first, behind text)
    const watermarkText = "DRAFT";
    for (let x = 0; x < 600; x += 150) {
      for (let y = 0; y < 900; y += 120) {
        page.drawText(watermarkText, {
          x,
          y,
          size: 28,
          font: boldFont,
          color: rgb(0.9, 0.9, 0.9),
          rotate: degrees(30),
        });
      }
    }

    // Body text on top
    drawBody(page, font, 780, 60);
  }

  const bytes = await doc.save();
  writeFileSync(join(OUTPUT_DIR, "dense-watermark.pdf"), bytes);
  console.log("✅ dense-watermark.pdf");
}

// ----- 4. Decorative border + copyright -----
async function generateBorderWatermark(): Promise<void> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (let p = 0; p < 2; p++) {
    const page = doc.addPage([595, 842]);

    // Decorative border (double line)
    const borderColor = rgb(0.6, 0.6, 0.8);
    // Outer border
    page.drawRectangle({
      x: 30,
      y: 30,
      width: 535,
      height: 782,
      borderColor,
      borderWidth: 2,
    });
    // Inner border
    page.drawRectangle({
      x: 38,
      y: 38,
      width: 519,
      height: 766,
      borderColor,
      borderWidth: 0.5,
    });

    // Body text
    drawBody(page, font, 770, 70);

    // Bottom copyright band
    page.drawRectangle({
      x: 30,
      y: 30,
      width: 535,
      height: 25,
      color: rgb(0.95, 0.95, 0.97),
    });
    page.drawText(
      "Copyright (c) 2026 AI Research Institute. All rights reserved. Document ID: DOC-2026-00847",
      {
        x: 50,
        y: 38,
        size: 7,
        font,
        color: rgb(0.5, 0.5, 0.6),
      },
    );
  }

  const bytes = await doc.save();
  writeFileSync(join(OUTPUT_DIR, "border-watermark.pdf"), bytes);
  console.log("✅ border-watermark.pdf");
}

// ----- 5. Combined: diagonal + header/footer + page number -----
async function generateCombinedWatermark(): Promise<void> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  for (let p = 0; p < 3; p++) {
    const page = doc.addPage([595, 842]);

    // Background diagonal watermark
    page.drawText("FOR REVIEW ONLY", {
      x: 60,
      y: 280,
      size: 60,
      font: boldFont,
      color: rgb(0.92, 0.88, 0.88),
      rotate: degrees(40),
    });

    // Header
    page.drawText("ACME Corp — Quarterly Report Q4 2025", {
      x: 72,
      y: 815,
      size: 9,
      font: boldFont,
      color: rgb(0.35, 0.35, 0.35),
    });
    page.drawLine({
      start: { x: 72, y: 810 },
      end: { x: 523, y: 810 },
      thickness: 0.8,
      color: rgb(0.2, 0.4, 0.8),
    });

    // Body
    drawBody(page, font, 790, 65);

    // Footer
    page.drawLine({
      start: { x: 72, y: 45 },
      end: { x: 523, y: 45 },
      thickness: 0.8,
      color: rgb(0.2, 0.4, 0.8),
    });
    page.drawText("Classification: Internal Use Only", {
      x: 72,
      y: 30,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    page.drawText(`${p + 1} / 3`, {
      x: 500,
      y: 30,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  const bytes = await doc.save();
  writeFileSync(join(OUTPUT_DIR, "combined-watermark.pdf"), bytes);
  console.log("✅ combined-watermark.pdf");
}

// ----- Main -----
async function main(): Promise<void> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Generating test PDFs in ${OUTPUT_DIR}...\n`);

  await generateDiagonalWatermark();
  await generateHeaderFooter();
  await generateDenseWatermark();
  await generateBorderWatermark();
  await generateCombinedWatermark();

  console.log("\nDone! Generated 5 test PDFs.");
}

main().catch(console.error);
