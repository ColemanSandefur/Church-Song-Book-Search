import { createRequire } from "node:module";
import fs from "fs";
import path from "node:path";
const require = createRequire(import.meta.url);
const Tesseract = require("tesseract.js") as typeof import("tesseract.js");

export async function extractTextFromImage(imagePath: string) {
  const {
    data: { text },
  } = await Tesseract.recognize(imagePath, "eng", {
    // logger: (m) => console.log(m), // optional: progress updates
  });
  return text
    .split("\n")
    .filter((line) => isEnglishLike(line.trim()))
    .map((line) => line.trim().replace(/\s*[-—]\s*/g, ""))
    .join("\n");
}

console.log(import.meta.dirname);

// Load a word list
const englishWords = fs
  .readFileSync(
    path.join(import.meta.dirname, "..", "electron", "words_alpha.txt"),
    "utf-8"
  )
  .split("\n")
  .map((w) => w.toLowerCase().replace(/[^a-z\s]/g, ""));

englishWords
  .filter((w) => w.length <= 2)
  .forEach((w) => console.log(`Ignoring short word: "${w}"`));

console.log(englishWords.length);

export function isEnglishLike(line: string, threshold = 0.5): boolean {
  const words = line
    .toLowerCase()
    .replace(/[,.!?;:]/g, " ")
    .replace(/\s*[-—]\s*/g, "")
    .replace(/['"]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  const matches = words.filter((w) => englishWords.includes(w)).length;

  const mapping = words.map((word) => {
    return { [word]: englishWords.includes(word) };
  });
  console.log({
    line,
    mapping,
    matches,
    ratio: matches / words.length,
    threshold,
  });
  if (words.length === 0) return false;
  return matches / words.length >= threshold;
}
