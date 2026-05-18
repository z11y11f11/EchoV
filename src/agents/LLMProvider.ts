import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";

let aiInstance: GoogleGenAI | null = null;
let openaiInstance: OpenAI | null = null;
const OPENAI_MAX_PROMPT_CHARS = 18000;

export type OrchestratorToolName = "analyze_document" | "fetch_market_data" | "compare_peers" | "synthesize_verdict";

export interface OrchestratorToolCall {
  name: OrchestratorToolName;
  arguments: {
    ticker?: string;
    options?: string[];
    context?: string;
  };
}

export function getGemini(): GoogleGenAI {
  if (!aiInstance) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing. Please configure it.");
    }
    aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiInstance;
}

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is missing. Gemini fallback is unavailable.");
    }
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      dangerouslyAllowBrowser: true
    });
  }
  return openaiInstance;
}

function isGeminiFallbackError(error: unknown): boolean {
  const status = (error as any)?.status || (error as any)?.code;
  const message = String((error as any)?.message || error || "").toLowerCase();

  return (
    status === 401 ||
    status === 403 ||
    status === 429 ||
    message.includes("api key") ||
    message.includes("auth") ||
    message.includes("permission") ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("429")
  );
}

function toJsonSchema(schema: any): any {
  if (!schema || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map(toJsonSchema);

  const converted: any = Object.fromEntries(
    Object.entries(schema).map(([key, value]) => [key, toJsonSchema(value)])
  );
  if (typeof converted.type === "string") {
    converted.type = converted.type.toLowerCase();
  }

  return converted;
}

function trimForOpenAI(prompt: string): string {
  if (prompt.length <= OPENAI_MAX_PROMPT_CHARS) return prompt;

  console.info(`OpenAI prompt trimmed from ${prompt.length} to ${OPENAI_MAX_PROMPT_CHARS} characters to stay below rate limits.`);
  return `${prompt.substring(0, OPENAI_MAX_PROMPT_CHARS)}

[Content truncated to stay within the current OpenAI tokens-per-minute limit.]`;
}

async function runOpenAIFallback(prompt: string, schemaProperties: any, requiredFields: string[], fileBase64?: string): Promise<any> {
  const openai = getOpenAI();
  const inputContent: any[] = [{ type: "input_text", text: trimForOpenAI(prompt) }];

  if (fileBase64) {
    console.info("OpenAI provider using extracted report text only; PDF attachment omitted to stay within context limits.");
  }

  const response = await openai.responses.create({
    model: "gpt-4o",
    max_output_tokens: 4000,
    input: [
      {
        role: "user",
        content: inputContent
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "finagent_analysis",
        strict: false,
        schema: {
          type: "object",
          required: requiredFields,
          properties: toJsonSchema(schemaProperties)
        }
      }
    }
  } as any);

  const analysisText = response.output_text;
  if (!analysisText) throw new Error("Empty response from OpenAI fallback");
  return JSON.parse(analysisText);
}

export async function planOrchestratorToolCalls(input: {
  userRequest: string;
  ticker?: string;
  hasDocument: boolean;
  fallbackOptions: string[];
}): Promise<OrchestratorToolCall[]> {
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `You are the FinAgent V2 Orchestrator. Decide which tools to call and in what order based only on the user's request and available inputs.
Available tools map to agents:
- analyze_document: FundamentalAgent for uploaded PDFs, financial metrics, highlights, risks, ESG.
- fetch_market_data: QuantAgent for ticker market data, valuation, price, ratios.
- compare_peers: PeerAgent for competitor discovery and peer comparison.
- synthesize_verdict: CIOAgent for final investment verdict or cross-analysis after other agent outputs.

Rules:
- Call analyze_document only if a document is available and the request needs report, fundamental, ESG, risk, or highlight analysis.
- Call fetch_market_data if a ticker is available and the request needs valuation, market data, quantitative metrics, price, ratios, or a final verdict.
- Call compare_peers only when peer, competitor, industry comparison, or benchmark analysis is requested.
- Call synthesize_verdict when the user asks for a verdict, recommendation, conclusion, synthesis, or when multiple prior tools should be reconciled.
- Respect skip/exclude requests. If the user says skip peers, do not call compare_peers.
- If the request is vague, use the fallback options as the user's checkbox fallback.`
      },
      {
        role: "user",
        content: JSON.stringify(input)
      }
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "analyze_document",
          description: "Run FundamentalAgent on the uploaded financial report PDF.",
          parameters: {
            type: "object",
            properties: {
              options: {
                type: "array",
                items: { type: "string", enum: ["highlights", "risks", "esg"] }
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "fetch_market_data",
          description: "Run QuantAgent to fetch market data and perform valuation or quantitative analysis.",
          parameters: {
            type: "object",
            properties: {
              ticker: { type: "string" },
              options: {
                type: "array",
                items: { type: "string", enum: ["highlights", "risks", "esg", "competitors"] }
              }
            },
            required: ["ticker"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "compare_peers",
          description: "Run PeerAgent to identify and compare competitors.",
          parameters: {
            type: "object",
            properties: {
              context: { type: "string" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "synthesize_verdict",
          description: "Run CIOAgent to synthesize prior agent outputs into a verdict or divergence analysis.",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      }
    ],
    tool_choice: "auto"
  } as any);

  const toolCalls = response.choices[0]?.message?.tool_calls || [];
  return toolCalls
    .map((toolCall: any) => {
      const name = toolCall.function?.name as OrchestratorToolName;
      if (!["analyze_document", "fetch_market_data", "compare_peers", "synthesize_verdict"].includes(name)) return null;
      return {
        name,
        arguments: JSON.parse(toolCall.function?.arguments || "{}")
      };
    })
    .filter(Boolean) as OrchestratorToolCall[];
}

export async function runGenerativeAI(prompt: string, schemaProperties: any, requiredFields: string[], fileBase64?: string): Promise<any> {
  if (process.env.OPENAI_API_KEY) {
    return await runOpenAIFallback(prompt, schemaProperties, requiredFields, fileBase64);
  }

  if (!process.env.GEMINI_API_KEY) {
    return await runOpenAIFallback(prompt, schemaProperties, requiredFields, fileBase64);
  }

  try {
    const gemini = getGemini();

    const parts: any[] = [{ text: prompt }];
    if (fileBase64) {
      parts.push({
        inlineData: {
          data: fileBase64,
          mimeType: "application/pdf"
        }
      });
    }

    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash", // Use stable model identifier
      contents: [{ parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: requiredFields,
          properties: schemaProperties
        }
      }
    });

    const analysisText = response.text;
    if (!analysisText) throw new Error("Empty response from Gemini");
    return JSON.parse(analysisText);
  } catch (error) {
    if (isGeminiFallbackError(error)) {
      console.warn("Gemini unavailable, switching to OpenAI fallback:", (error as any)?.message || error);
      return await runOpenAIFallback(prompt, schemaProperties, requiredFields, fileBase64);
    }
    throw error;
  }
}
