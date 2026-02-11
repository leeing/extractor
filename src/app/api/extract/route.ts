import OpenAI from "openai";
import { extractEnv } from "@/lib/env";

export const maxDuration = 120;

/** Request body shape for the extract endpoint */
interface ExtractRequestBody {
  imageBase64: string;
  baseUrl?: string;
  modelId?: string;
  apiKey?: string;
  customPrompt?: string;
}

export async function POST(req: Request): Promise<Response> {
  let body: ExtractRequestBody;
  try {
    body = (await req.json()) as ExtractRequestBody;
  } catch {
    return Response.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { imageBase64, customPrompt } = body;

  const MAX_BASE64_SIZE = 20 * 1024 * 1024; // ~20MB base64 ≈ ~15MB decoded
  if (imageBase64 && imageBase64.length > MAX_BASE64_SIZE) {
    return Response.json(
      { success: false, error: "Image too large. Maximum 15MB per page." },
      { status: 413 },
    );
  }

  // Use client-provided values, falling back to env vars
  const baseUrl = body.baseUrl || extractEnv.baseUrl;
  const modelId = body.modelId || extractEnv.modelId;
  const apiKey = body.apiKey || extractEnv.apiKey;

  if (!imageBase64 || !baseUrl || !modelId || !apiKey) {
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

    // Convert OpenAI stream to a ReadableStream of plain text chunks.
    // If the LLM stream errors mid-way, we write a sentinel error line
    // into the stream so the client can detect it, instead of calling
    // controller.error() which abruptly kills the connection and causes
    // an opaque "Failed to fetch" TypeError on the client side.
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
            // The last chunk with usage info (when stream_options.include_usage is set)
            if (chunk.usage) {
              promptTokens = chunk.usage.prompt_tokens;
              completionTokens = chunk.usage.completion_tokens;
            }
          }
          // Append usage sentinel if we got usage data
          if (promptTokens > 0 || completionTokens > 0) {
            controller.enqueue(
              encoder.encode(
                `\n<!--EXTRACT_USAGE:{"prompt_tokens":${promptTokens},"completion_tokens":${completionTokens}}-->`,
              ),
            );
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "LLM 流式响应中断";
          controller.enqueue(
            encoder.encode(`\n\n<!--EXTRACT_STREAM_ERROR:${msg}-->`),
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "LLM API 调用失败";
    return Response.json({ success: false, error: message }, { status: 502 });
  }
}
