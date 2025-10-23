import fs from "fs";
import path from "path";
import os from "os";
import yauzl from "yauzl";
import pLimit from "p-limit";

/**
 * Extract images from a .pptx file
 * @param pptxPath Path to the .pptx file
 * @returns Array of paths to extracted image files
 */
export async function extractPptxImages(pptxPath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const extractedPaths: string[] = [];
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pptx-images-"));

    yauzl.open(pptxPath, { lazyEntries: true }, (err, zipFile) => {
      if (err || !zipFile) return reject(err);

      zipFile.readEntry();

      zipFile.on("entry", (entry) => {
        // Only extract media files
        if (entry.fileName.startsWith("ppt/media/")) {
          const outputPath = path.join(tempDir, path.basename(entry.fileName));
          zipFile.openReadStream(entry, (err, readStream) => {
            if (err) return reject(err);

            const writeStream = fs.createWriteStream(outputPath);
            readStream.pipe(writeStream);

            writeStream.on("finish", () => {
              extractedPaths.push(outputPath);
              zipFile.readEntry(); // move to next entry
            });

            writeStream.on("error", (err) => reject(err));
          });
        } else {
          zipFile.readEntry(); // skip non-media files
        }
      });

      zipFile.on("end", () => resolve(extractedPaths));
      zipFile.on("error", (err) => reject(err));
    });
  });
}

/**
 * Extract images from all .pptx files in a directory
 * @param dirPath Directory containing .pptx files
 * @returns A mapping of .pptx filenames to their extracted image paths
 */
export async function extractAllPptxImagesFromDir(
  dirPath: string
): Promise<{ [pptxFile: string]: string[] }> {
  const result: { [pptxFile: string]: string[] } = {};
  const files = fs.readdirSync(dirPath);

  const pptFiles = files.filter((file) => file.endsWith(".pptx"));

  const limit = pLimit(5); // Limit concurrency to 5

  const allImages = await Promise.all(
    pptFiles.map((file) =>
      limit(async () => {
        const fullPath = path.join(dirPath, file);
        try {
          const images = await extractPptxImages(fullPath);
          return { file, images };
        } catch (err) {
          console.error(`Failed to extract images from ${file}:`, err);
        }
      })
    )
  );

  allImages.forEach((item) => {
    if (item) {
      result[item.file] = item.images;
    }
  });

  return result;
}
