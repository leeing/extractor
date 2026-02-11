/**
 * API route: Convert DOCX file to Markdown.
 * Uses mammoth to convert DOCX → HTML, then turndown for HTML → Markdown.
 */

import mammoth from "mammoth";
import TurndownService from "turndown";
import { verifyAuth } from "@/lib/auth";

export const maxDuration = 60;

/** Create a configured turndown instance */
function createTurndown(): TurndownService {
  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });

  // Improve table handling — turndown doesn't handle tables by default
  turndown.addRule("tableCell", {
    filter: ["th", "td"],
    replacement(content) {
      return ` ${content.trim()} |`;
    },
  });

  turndown.addRule("tableRow", {
    filter: "tr",
    replacement(content) {
      return `|${content}\n`;
    },
  });

  turndown.addRule("table", {
    filter: "table",
    replacement(_content, node) {
      const element = node as HTMLElement;
      const rows = element.querySelectorAll("tr");
      if (rows.length === 0) return "";

      const lines: string[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        const cells = row.querySelectorAll("th, td");
        const cellTexts: string[] = [];
        for (const cell of cells) {
          cellTexts.push(cell.textContent?.trim() ?? "");
        }
        lines.push(`| ${cellTexts.join(" | ")} |`);

        // Add header separator after first row
        if (i === 0) {
          lines.push(`| ${cellTexts.map(() => "---").join(" | ")} |`);
        }
      }
      return `\n${lines.join("\n")}\n\n`;
    },
  });

  return turndown;
}

const turndown = createTurndown();

export async function POST(req: Request): Promise<Response> {
  const authResponse = verifyAuth(req);
  if (authResponse) return authResponse;

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return Response.json(
        { success: false, error: "未提供文件" },
        { status: 400 },
      );
    }

    const MAX_DOCX_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_DOCX_SIZE) {
      return Response.json(
        { success: false, error: "File too large. Maximum 100MB." },
        { status: 413 },
      );
    }

    if (!file.name.endsWith(".docx")) {
      return Response.json(
        { success: false, error: "仅支持 .docx 格式" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({
      buffer: Buffer.from(arrayBuffer),
    });

    const markdown = turndown.turndown(result.value);

    return Response.json({
      success: true,
      data: {
        markdown,
        messages: result.messages.map((m) => `${m.type}: ${m.message}`),
      },
    });
  } catch {
    return Response.json(
      { success: false, error: "DOCX 转换失败" },
      { status: 500 },
    );
  }
}
