export function extractJson(text: string): Record<string, any> | null {
  if (!text || !text.trim()) return null;

  const strategies: [string, (t: string) => Record<string, any> | null][] = [
    ["direct_parse", tryDirectParse],
    ["code_fence", tryCodeFence],
    ["brace_extraction", tryBraceExtraction],
    ["relaxed_parse", tryRelaxedParse],
    ["truncated_repair", tryTruncatedRepair],
  ];

  for (const [, strategy] of strategies) {
    try {
      const result = strategy(text);
      if (result !== null && typeof result === "object") {
        return result;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function tryDirectParse(text: string): Record<string, any> | null {
  return JSON.parse(text.trim());
}

function tryCodeFence(text: string): Record<string, any> | null {
  const patterns = [
    /```json\s*\n?([\s\S]*?)\n?\s*```/,
    /```\s*\n?([\s\S]*?)\n?\s*```/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const content = fixCommonIssues(match[1].trim());
      return JSON.parse(content);
    }
  }
  return null;
}

function tryBraceExtraction(text: string): Record<string, any> | null {
  const objStart = text.indexOf("{");
  if (objStart === -1) return null;

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = objStart; i < text.length; i++) {
    const ch = text[i]!;

    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (ch === "\\") {
      escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const candidate = fixCommonIssues(text.slice(objStart, i + 1));
        return JSON.parse(candidate);
      }
    }
  }
  return null;
}

function tryRelaxedParse(text: string): Record<string, any> | null {
  const fixed = fixCommonIssues(text.trim());
  return JSON.parse(fixed);
}

function tryTruncatedRepair(text: string): Record<string, any> | null {
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{" || text[i] === "[") {
      start = i;
      break;
    }
  }
  if (start === -1) return null;

  let jsonText = fixCommonIssues(text.slice(start));

  // Track state
  let inString = false;
  let escapeNext = false;
  const stack: string[] = [];

  for (const ch of jsonText) {
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") stack.push("{");
    else if (ch === "[") stack.push("[");
    else if (ch === "}") {
      if (stack.length && stack[stack.length - 1] === "{") stack.pop();
    } else if (ch === "]") {
      if (stack.length && stack[stack.length - 1] === "[") stack.pop();
    }
  }

  if (stack.length === 0) return null; 

  if (inString) jsonText += '"';

  
  jsonText = jsonText.replace(/,\s*"[^"]*"\s*:\s*$/, "");
  jsonText = jsonText.replace(/,\s*$/, "");

  for (let i = stack.length - 1; i >= 0; i--) {
    jsonText += stack[i] === "{" ? "}" : "]";
  }


  jsonText = jsonText.replace(/,\s*([}\]])/g, "$1");

  return JSON.parse(jsonText);
}

function fixCommonIssues(text: string): string {
  text = text.replace(/,\s*([}\]])/g, "$1");
  text = text.replace(/\/\/.*$/gm, "");
  text = text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
  return text;
}
