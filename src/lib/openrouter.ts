export interface DeepSeekModelOption {
  id: string;
  name: string;
  description: string;
}

export const AVAILABLE_MODELS: DeepSeekModelOption[] = [
  {
    id: "deepseek/deepseek-v4.1-flash-1017",
    name: "DeepSeek V4.1 Flash",
    description: "Ultra-fast response time for rapid job & salary analysis",
  },
  {
    id: "deepseek/deepseek-r1-0528",
    name: "DeepSeek R1 (0528)",
    description: "Deep reasoning model for detailed negotiation & fit insights",
  },
];

/**
 * Robust JSON extraction and repair for AI model outputs
 */
export function extractAndParseJson(rawContent: string): any {
  if (!rawContent || !rawContent.trim()) {
    throw new Error("Empty response received from AI model.");
  }

  // 1. Strip <think>...</think> tags emitted by reasoning models
  let text = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // 2. Extract from markdown code fence if present
  const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (markdownMatch && markdownMatch[1]) {
    text = markdownMatch[1].trim();
  }

  // 3. Locate the first opening JSON bracket { or [
  const firstBrace = text.indexOf("{");
  const firstBracket = text.indexOf("[");
  let startIdx = 0;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }
  text = text.slice(startIdx).trim();

  // 4. Try standard JSON.parse
  try {
    return JSON.parse(text);
  } catch (err1) {
    // Continue to repair strategies
  }

  // 5. Try finding the last matching closing brace
  const lastBrace = text.lastIndexOf("}");
  const lastBracket = text.lastIndexOf("]");
  const endIdx = Math.max(lastBrace, lastBracket);
  if (endIdx > 0) {
    const trimmed = text.slice(0, endIdx + 1);
    try {
      return JSON.parse(trimmed);
    } catch (err2) {
      text = trimmed;
    }
  }

  // 6. Remove trailing commas before } or ]
  let cleaned = text.replace(/,\s*([\]}])/g, "$1");
  try {
    return JSON.parse(cleaned);
  } catch (err3) {
    // Continue to auto-closing strategy
  }

  // 7. Auto-repair unclosed strings / brackets / braces if truncated
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (isEscaped) {
      isEscaped = false;
      continue;
    }
    if (char === "\\") {
      isEscaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === "{") openBraces++;
      else if (char === "}") openBraces = Math.max(0, openBraces - 1);
      else if (char === "[") openBrackets++;
      else if (char === "]") openBrackets = Math.max(0, openBrackets - 1);
    }
  }

  let repaired = cleaned;
  if (inString) repaired += '"';
  while (openBrackets > 0) {
    repaired += "]";
    openBrackets--;
  }
  while (openBraces > 0) {
    repaired += "}";
    openBraces--;
  }

  try {
    return JSON.parse(repaired);
  } catch (errFinal) {
    console.error("Failed to parse JSON response after all repair attempts:", rawContent);
    throw new Error("Unable to parse AI JSON response.");
  }
}

export async function callOpenRouterAI({
  prompt,
  model = "deepseek/deepseek-v4.1-flash-1017",
  apiKey,
}: {
  prompt: string;
  model?: string;
  apiKey?: string;
}): Promise<any> {
  const activeKey =
    apiKey ||
    import.meta.env.VITE_OPENROUTER_API_KEY;

  if (!activeKey) {
    throw new Error("Missing OpenRouter API key.");
  }

  const isReasoning = model.includes("r1");
  const maxTokens = isReasoning ? 5000 : 8000;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${activeKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "http://localhost:5173",
      "X-Title": "Worthy.ai",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are an expert career and compensation advisor. You must respond ONLY with a valid, parseable JSON object matching the requested schema. Do not output conversational filler, preamble, or markdown backticks.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.error?.message ||
        `OpenRouter request failed with status ${response.status} (${response.statusText})`
    );
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || "";

  return extractAndParseJson(content);
}
