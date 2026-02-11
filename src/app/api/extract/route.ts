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
