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
                  : `data:image/png;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
    });

    // Convert OpenAI stream to a ReadableStream of plain text chunks
    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch (err) {
          controller.error(err);
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
