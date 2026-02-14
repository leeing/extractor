import net from "node:net";
import OpenAI from "openai";
import { z } from "zod";
import { verifyAuth } from "@/lib/auth";
import { extractEnv } from "@/lib/env";

export const maxDuration = 120;

const extractBodySchema = z.object({
  imageBase64: z.string().min(1),
  baseUrl: z.string().max(500).optional().default(""),
  modelId: z.string().max(200).optional().default(""),
  apiKey: z.string().max(500).optional().default(""),
  customPrompt: z.string().max(5000).optional().default(""),
});

/**
 * Validate URL to prevent SSRF (Server-Side Request Forgery).
 * Blocks loopback, private IPs, and link-local addresses.
 */
export function isValidBaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }

    let hostname = parsed.hostname;

    // Handle IPv6 brackets
    if (hostname.startsWith("[") && hostname.endsWith("]")) {
      hostname = hostname.slice(1, -1);
    }

    // Block localhost explicitly
    if (hostname === "localhost") return false;

    // If it's an IP address, check against private ranges
    if (net.isIP(hostname)) {
      // IPv4
      if (net.isIPv4(hostname)) {
        // 127.0.0.0/8 (Loopback)
        if (hostname.startsWith("127.")) return false;
        // 10.0.0.0/8 (Private)
        if (hostname.startsWith("10.")) return false;
        // 172.16.0.0/12 (Private)
        // 172.16.x.x - 172.31.x.x
        if (hostname.startsWith("172.")) {
          const secondOctet = Number(hostname.split(".")[1]);
          if (secondOctet >= 16 && secondOctet <= 31) return false;
        }
        // 192.168.0.0/16 (Private)
        if (hostname.startsWith("192.168.")) return false;
        // 169.254.0.0/16 (Link-local)
        if (hostname.startsWith("169.254.")) return false;
        // 0.0.0.0/8
        if (hostname.startsWith("0.")) return false;
      }

      // IPv6
      if (net.isIPv6(hostname)) {
        // ::1 (Loopback)
        if (hostname === "::1") return false;
        // fc00::/7 (Unique Local)
        if (
          hostname.toLowerCase().startsWith("fc") ||
          hostname.toLowerCase().startsWith("fd")
        )
          return false;
        // fe80::/10 (Link-local)
        if (hostname.toLowerCase().startsWith("fe80:")) return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

export async function POST(req: Request): Promise<Response> {
  const authResponse = verifyAuth(req);
  if (authResponse) return authResponse;

  let body: z.infer<typeof extractBodySchema>;
  try {
    const raw: unknown = await req.json();
    const result = extractBodySchema.safeParse(raw);
    if (!result.success) {
      return Response.json(
        { success: false, error: "请求参数不合法" },
        { status: 400 },
      );
    }
    body = result.data;
  } catch {
    return Response.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { imageBase64, customPrompt } = body;

  const MAX_BASE64_SIZE = 20 * 1024 * 1024; // ~20MB base64 ≈ ~15MB decoded
  if (imageBase64.length > MAX_BASE64_SIZE) {
    return Response.json(
      { success: false, error: "Image too large. Maximum 15MB per page." },
      { status: 413 },
    );
  }

  // Use client-provided values, falling back to env vars
  const baseUrl = body.baseUrl || extractEnv.baseUrl;
  const modelId = body.modelId || extractEnv.modelId;
  const apiKey = body.apiKey || extractEnv.apiKey;

  if (!baseUrl || !modelId || !apiKey) {
    return Response.json(
      {
        success: false,
        error:
          "Missing required config. Set EXTRACT_BASE_URL, EXTRACT_MODEL_ID, EXTRACT_API_KEY in .env.local or provide via settings.",
      },
      { status: 400 },
    );
  }

  // Validate Base URL to prevent SSRF
  if (!isValidBaseUrl(baseUrl)) {
    return Response.json(
      { success: false, error: "Base URL 不合法或不允许访问私有网络" },
      { status: 400 },
    );
  }

  try {
    const client = new OpenAI({ baseURL: baseUrl, apiKey });

    const stream = await client.chat.completions.create({
      model: modelId,
      stream: true,
      stream_options: { include_usage: true },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                customPrompt || "请将图片中的文档内容转换为 Markdown 格式。",
            },
            {
              type: "image_url",
              image_url: {
                url: imageBase64.startsWith("data:")
                  ? imageBase64
                  : `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
    });

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let promptTokens = 0;
        let completionTokens = 0;
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
            if (chunk.usage) {
              promptTokens = chunk.usage.prompt_tokens;
              completionTokens = chunk.usage.completion_tokens;
            }
          }
          if (promptTokens > 0 || completionTokens > 0) {
            controller.enqueue(
              encoder.encode(
                `\n<!--EXTRACT_USAGE:{"prompt_tokens":${promptTokens},"completion_tokens":${completionTokens}}-->`,
              ),
            );
          }
        } catch (error) {
          console.error("[extract] LLM stream error:", error);
          controller.enqueue(
            encoder.encode("\n\n<!--EXTRACT_STREAM_ERROR:LLM 流式响应中断-->"),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("[extract] LLM API call failed:", error);
    return Response.json(
      { success: false, error: "LLM API 调用失败" },
      { status: 502 },
    );
  }
}
