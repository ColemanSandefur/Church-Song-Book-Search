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

  const filteredText = text
    .split("\n")
    .filter((line) => isEnglishLike(line.trim()))
    .map((line) =>
      line
        .trim()
        .replace(/\s*[-—]\s*/g, "")
        .replace(/\|/g, "I")
    )
    .join("\n");

  return filteredText;
}

console.log(import.meta.dirname);

// Load a word list
const englishWords = new Set(
  fs
    .readFileSync(
      path.join(import.meta.dirname, "..", "electron", "words_alpha.txt"),
      "utf-8"
    )
    .split("\n")
    .map((w) => w.toLowerCase().replace(/[^a-z\s]/g, ""))
);

/**
 * Determine if a line of text is English-like
 * @param line The line of text to evaluate
 * @param threshold The minimum ratio of real words to total words (higher = stricter)
 * @returns True if the line is likely English-like, false otherwise
 */
export function isEnglishLike(line: string, threshold = 0.75): boolean {
  const words = line
    .toLowerCase()
    .replace(/[,.!?;:]/g, " ")
    .replace(/\s*[-—]\s*/g, "")
    .replace(/['"]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return false;

  const realWords = words.filter((w) => englishWords.has(w));
  const matches = realWords.length;

  // Very basic heuristic: consider it English-like
  if (realWords.some((w) => w.length >= 4)) {
    return true;
  }

  // Otherwise, require a higher ratio of real words
  return matches / words.length >= threshold;
}
