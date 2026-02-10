/**
 * Generate Chinese test PDFs with dense watermark "00010934/测试测试"
 *
 * Usage: npx tsx scripts/generate-chinese-pdfs.ts
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { degrees, PDFDocument, rgb } from "pdf-lib";

const OUTPUT_DIR = join(process.cwd(), "test-fixtures");

// Noto Sans CJK SC (downloaded OTF — compatible with pdf-lib + fontkit)
const FONT_PATH = join(process.cwd(), "scripts", "NotoSansSC-Regular.ttf");

/** Chinese document content samples */
const DOCUMENTS = [
  {
    filename: "chinese-report.pdf",
    title: "2025年度数字化转型工作报告",
    sections: [
      {
        heading: "一、工作概述",
        body: [
          '2025年，我行紧紧围绕"科技引领、数字驱动"的战略目标，全面推进数字化转型工作。',
          "在全行上下的共同努力下，各项数字化指标均取得显著进展，线上业务占比持续提升，",
          "客户服务体验明显改善，内部运营效率大幅提高。",
          "",
          "全年完成数字化项目127个，其中核心系统升级项目15个，创新试点项目32个，",
          "流程自动化项目80个。数字化投入同比增长35%，达到年度预算的98.6%。",
        ],
      },
      {
        heading: "二、重点成果",
        body: [
          "1. 智能风控平台上线运行，实时风险监控覆盖率达到99.2%。",
          "2. 移动银行APP月活用户突破5000万，同比增长42%。",
          "3. 企业网银全流程线上化率提升至87%，较年初提高23个百分点。",
          "4. RPA机器人部署数量达到156个，累计节省人工工时超过12万小时。",
          "5. 数据中台建设完成第二阶段，数据资产目录条目超过8万条。",
        ],
      },
      {
        heading: "三、存在问题",
        body: [
          "在取得成绩的同时，我们也清醒地认识到仍存在一些不足：",
          "（一）部分老旧系统改造进度滞后，影响了整体数字化进程；",
          "（二）数据治理工作有待加强，数据质量问题仍然较为突出；",
          "（三）数字化人才储备不足，特别是AI和大数据方向的专业人才缺口较大；",
          "（四）部分基层网点的数字化应用能力有待提升。",
        ],
      },
    ],
  },
  {
    filename: "chinese-spec.pdf",
    title: "智能客服系统技术规范 V2.0",
    sections: [
      {
        heading: "1 范围",
        body: [
          "本规范规定了智能客服系统的技术架构、功能要求、接口规范、",
          "性能指标和安全要求。适用于总行及各分行智能客服系统的设计、",
          "开发、测试和部署。",
        ],
      },
      {
        heading: "2 术语和定义",
        body: [
          "2.1 自然语言处理（NLP）：计算机理解和处理人类语言的技术。",
          "2.2 意图识别：从用户输入中识别用户真实目的的过程。",
          "2.3 知识图谱：以结构化形式描述实体及其关系的知识库。",
          "2.4 多轮对话：系统与用户进行的多次交互式对话过程。",
          "2.5 坐席辅助：AI系统在人工客服服务过程中提供的实时辅助功能。",
        ],
      },
      {
        heading: "3 系统架构",
        body: [
          "3.1 整体架构采用微服务设计，分为接入层、应用层、能力层和数据层。",
          "3.2 接入层支持文本、语音、视频等多种交互渠道。",
          "3.3 应用层包含智能问答、任务型对话、情感分析等核心模块。",
          "3.4 能力层提供NLP引擎、语音引擎、知识图谱等基础AI能力。",
          "3.5 数据层负责日志存储、对话记录、用户画像等数据管理。",
        ],
      },
      {
        heading: "4 性能要求",
        body: [
          "4.1 系统响应时间：文本交互 ≤ 500ms，语音交互 ≤ 1000ms。",
          "4.2 意图识别准确率 ≥ 92%。",
          "4.3 系统可用性 ≥ 99.95%。",
          "4.4 并发用户支持数 ≥ 10000。",
          "4.5 知识库问答覆盖率 ≥ 85%。",
        ],
      },
    ],
  },
  {
    filename: "chinese-meeting.pdf",
    title: "第三季度经营分析会会议纪要",
    sections: [
      {
        heading: "会议信息",
        body: [
          "时间：2025年10月15日 14:00-17:30",
          "地点：总行大厦22楼会议室",
          "主持人：张明（副行长）",
          "参会人：各部门负责人及相关业务骨干，共计42人",
          "记录人：李华",
        ],
      },
      {
        heading: "一、三季度经营情况汇报",
        body: [
          "财务部王总监汇报了三季度主要经营指标完成情况：",
          "（1）营业收入完成全年计划的78.3%，同比增长12.5%；",
          "（2）净利润完成全年计划的81.2%，同比增长8.7%；",
          "（3）不良贷款率1.23%，较年初下降0.15个百分点；",
          "（4）资本充足率14.56%，满足监管要求；",
          "（5）成本收入比28.7%，同比改善1.2个百分点。",
        ],
      },
      {
        heading: "二、重点议题讨论",
        body: [
          "与会人员就以下议题进行了深入讨论：",
          "1. 零售业务转型战略的推进情况及四季度工作计划；",
          "2. 普惠金融业务拓展中的风险管控措施；",
          "3. 金融科技投入产出评估及下阶段规划；",
          "4. 人才队伍建设与绩效考核优化方案。",
        ],
      },
      {
        heading: "三、会议决议",
        body: [
          "经充分讨论，形成以下决议：",
          "（一）加快推进零售银行数字化转型，四季度完成手机银行6.0版本上线；",
          "（二）成立普惠金融风控专项小组，由风险管理部牵头；",
          "（三）批准科技部提出的2026年数字化预算方案；",
          "（四）启动新一轮管培生校园招聘计划。",
        ],
      },
    ],
  },
];

async function generateChinesePdf(
  doc: (typeof DOCUMENTS)[number],
  fontBytes: Uint8Array,
): Promise<void> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const chineseFont = await pdfDoc.embedFont(fontBytes);

  const pageWidth = 595; // A4
  const pageHeight = 842;
  const margin = 72;
  const contentWidth = pageWidth - margin * 2;

  // Calculate all content lines first, then distribute across pages
  interface ContentItem {
    text: string;
    isHeading: boolean;
  }
  const allContent: ContentItem[] = [];

  // Title
  allContent.push({ text: doc.title, isHeading: true });
  allContent.push({ text: "", isHeading: false });

  for (const section of doc.sections) {
    allContent.push({ text: "", isHeading: false });
    allContent.push({ text: section.heading, isHeading: true });
    allContent.push({ text: "", isHeading: false });
    for (const line of section.body) {
      allContent.push({ text: line, isHeading: false });
    }
  }

  // Paginate
  const lineHeight = 20;
  const headingSize = 14;
  const bodySize = 11;
  const topY = pageHeight - margin;
  const bottomY = margin + 20;
  const linesPerPage = Math.floor((topY - bottomY) / lineHeight);

  let lineIdx = 0;
  let pageNum = 0;

  while (lineIdx < allContent.length) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    pageNum++;

    // --- Dense watermark layer (behind text) ---
    const wmText = "00010934/测试测试";
    const wmSize = 18;
    for (let wx = -50; wx < pageWidth + 100; wx += 180) {
      for (let wy = -50; wy < pageHeight + 100; wy += 80) {
        page.drawText(wmText, {
          x: wx,
          y: wy,
          size: wmSize,
          font: chineseFont,
          color: rgb(0.88, 0.88, 0.88),
          rotate: degrees(30),
        });
      }
    }

    // --- Content ---
    let y = topY;
    let linesOnPage = 0;

    while (lineIdx < allContent.length && linesOnPage < linesPerPage) {
      const item = allContent[lineIdx];
      if (!item) break;

      if (item.text === "") {
        y -= lineHeight * 0.6;
        lineIdx++;
        linesOnPage++;
        continue;
      }

      const fontSize = item.isHeading ? headingSize : bodySize;

      // Simple word-wrap for Chinese text
      const charsPerLine = Math.floor(contentWidth / (fontSize * 1.05));
      const wrappedLines: string[] = [];
      let remaining = item.text;
      while (remaining.length > 0) {
        wrappedLines.push(remaining.slice(0, charsPerLine));
        remaining = remaining.slice(charsPerLine);
      }

      for (const wLine of wrappedLines) {
        if (y < bottomY) break;

        page.drawText(wLine, {
          x: margin,
          y,
          size: fontSize,
          font: chineseFont,
          color: rgb(0.1, 0.1, 0.1),
        });
        y -= lineHeight;
        linesOnPage++;
      }

      lineIdx++;
    }

    // Page number
    const pageLabel = `- ${pageNum} -`;
    const labelWidth = chineseFont.widthOfTextAtSize(pageLabel, 9);
    page.drawText(pageLabel, {
      x: (pageWidth - labelWidth) / 2,
      y: margin - 10,
      size: 9,
      font: chineseFont,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  const bytes = await pdfDoc.save();
  writeFileSync(join(OUTPUT_DIR, doc.filename), bytes);
  console.log(`✅ ${doc.filename} (${pageNum} pages)`);
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log("Loading Chinese font (Songti)...");
  const fontBytes = readFileSync(FONT_PATH);

  console.log(`Generating Chinese test PDFs in ${OUTPUT_DIR}...\n`);

  for (const doc of DOCUMENTS) {
    await generateChinesePdf(doc, fontBytes);
  }

  console.log("\nDone! Generated 3 Chinese test PDFs with dense watermark.");
}

main().catch(console.error);
