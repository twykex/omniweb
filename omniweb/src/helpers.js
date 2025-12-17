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
