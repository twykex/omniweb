// Converts "[Image of X]" tags into Markdown images with a generation URL
export const processAutoDiagrams = (text) => {
  if (!text) return "";
  const regex = /\[Image of (.*?)\]/g;
  return text.replace(regex, (match, query) => {
    // We append specific keywords to ensure the AI generator creates a diagram style image
    const prompt = encodeURIComponent(`educational scientific diagram schematic white on black background: ${query}`);
    const url = `https://image.pollinations.ai/prompt/${prompt}?width=800&height=450&nologo=true&seed=${query.length}`;
    return `\n\n![${query}](${url})\n\n`;
  });
};

export const robustJsonParse = (jsonString, type = 'any') => {
    if (!jsonString) return null;
    let cleanJson = jsonString.trim();
    cleanJson = cleanJson.replace(/```json/gi, "").replace(/```/g, "");

    // First try direct parse
    try {
        const result = JSON.parse(cleanJson);
        // If strict type requested, validate
        if (type === 'array' && !Array.isArray(result)) throw new Error("Not an array");
        if (type === 'object' && (Array.isArray(result) || typeof result !== 'object')) throw new Error("Not an object");
        return result;
    } catch (e) {
        // Fallback to extraction
    }

    let startChar, endChar;
    if (type === 'array') {
        startChar = '[';
        endChar = ']';
    } else if (type === 'object') {
        startChar = '{';
        endChar = '}';
    } else {
        // Auto-detect
        const startObj = cleanJson.indexOf('{');
        const startArr = cleanJson.indexOf('[');
        if (startObj === -1 && startArr === -1) return null;
        if (startObj !== -1 && (startArr === -1 || startObj < startArr)) {
            startChar = '{';
            endChar = '}';
        } else {
            startChar = '[';
            endChar = ']';
        }
    }

    const start = cleanJson.indexOf(startChar);
    if (start === -1) return null;

    let stack = 0;
    let end = -1;
    let inString = false;
    let escape = false;

    for (let i = start; i < cleanJson.length; i++) {
        const char = cleanJson[i];

        if (escape) {
            escape = false;
            continue;
        }

        if (char === '\\') {
            escape = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            continue;
        }

        if (!inString) {
            if (char === startChar) stack++;
            else if (char === endChar) {
                stack--;
                if (stack === 0) {
                    end = i + 1;
                    break;
                }
            }
        }
    }

    if (end !== -1) {
        try {
            return JSON.parse(cleanJson.substring(start, end));
        } catch (e) {
             // Fallback to greedy if strict parse fails?
        }
    }

    // Last resort fallback (greedy)
    const greedyEnd = cleanJson.lastIndexOf(endChar) + 1;
    if (greedyEnd > start) {
         try {
            return JSON.parse(cleanJson.substring(start, greedyEnd));
        } catch (e) {
            return null;
        }
    }

    return null;
};
