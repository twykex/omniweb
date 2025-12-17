export const extractJSON = (text) => {
    if (!text) return null;
    // Remove markdown code blocks
    let clean = text.replace(/```\w*/gi, "").replace(/```/g, "").trim();

    // Find first { or [
    const startObj = clean.indexOf('{');
    const startArr = clean.indexOf('[');

    if (startObj === -1 && startArr === -1) return null;

    let start = 0;
    let end = clean.length;
    let opener, closer;

    if (startObj !== -1 && (startArr === -1 || startObj < startArr)) {
         start = startObj;
         opener = '{';
         closer = '}';
    } else {
         start = startArr;
         opener = '[';
         closer = ']';
    }

    // Count braces/brackets
    let count = 0;
    for (let i = start; i < clean.length; i++) {
         if (clean[i] === opener) count++;
         else if (clean[i] === closer) count--;

         if (count === 0) {
             end = i + 1;
             break;
         }
    }

    const candidate = clean.substring(start, end);
    try {
        return JSON.parse(candidate);
    } catch (e) {
        // Fallback: try parsing assuming the end was correct even if not balanced or if previous logic failed
        // But for now, returning null is safer than returning garbage
        console.error("Failed to parse extracted JSON candidate", e);
        return null;
    }
};
