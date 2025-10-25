import { app, BrowserWindow, ipcMain } from "electron";
// import { createRequire } from "node:module"
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "fs";

// const require = createRequire(import.meta.url)
export const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { db, runMigrate } from "./db";
import {
  NewSong,
  NewSongBook,
  SongBook,
  songBooks,
  songs,
} from "../src/db/schema";
import { extractAllPptxImagesFromDir } from "./ppt-extract";
import { extractTextFromImage } from "./text-extract";
import { eq } from "drizzle-orm";

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC!, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(async () => {
  await runMigrate();
  createWindow();
});

export function getSongs() {
  return db.select().from(songs).all();
}

ipcMain.handle("db:get-songs", async () => {
  return getSongs();
});

export function addSong(itemData: NewSong) {
  return db.insert(songs).values(itemData);
}

ipcMain.handle("db:add-song", async (_event, songData) => {
  return addSong(songData);
});

export function getSongBooks() {
  return db.select().from(songBooks).all();
}

ipcMain.handle("db:get-song-books", async () => {
  return getSongBooks();
});

export async function addSongBook(songBook: NewSongBook) {
  const result = await db.insert(songBooks).values(songBook).returning().get();

  readDirectory(result);
}

ipcMain.handle("db:add-song-book", async (_event, songBookData) => {
  return addSongBook(songBookData);
});

export async function removeSongBookById(songNum: number) {
  const songBook = await db
    .delete(songBooks)
    .where(eq(songBooks.id, songNum))
    .returning()
    .get();

  return songBook;
}

ipcMain.handle("db:remove-song-book-by-id", async (_event, songNum) => {
  return removeSongBookById(songNum);
});

function getSlideNumber(filename: string): number | null {
  const match = filename.match(/image(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

async function readDirectory(songBook: SongBook) {
  const dirPath = songBook.path;
  console.log(`Reading directory: ${dirPath}`);
  const images = await extractAllPptxImagesFromDir(dirPath);

  console.time(`Processing PPTX Images`);
  for (const [fileName, imagePaths] of Object.entries(images).slice(0, 5)) {
    const texts = await Promise.all(
      imagePaths.map(async (imgPath) => {
        const text = await extractTextFromImage(imgPath);
        return { fileName: path.parse(imgPath).name, text };
      })
    );

    const text = texts
      .map(({ fileName, text }) => ({
        slideNumber: getSlideNumber(fileName),
        text,
      }))
      .sort((a, b) => (a.slideNumber ?? 0) - (b.slideNumber ?? 0))
      .map((item) => item.text)
      .join("\n");

    const folderPath = path.dirname(imagePaths[0]);
    if (folderPath) {
      console.log(`Cleaning up temporary folder: ${folderPath}`);
      fs.rmSync(folderPath, { recursive: true, force: true });
    }

    const pptName = path.parse(path.join(dirPath, fileName)).name;
    const match = pptName.match(/^(\d*\s+)?(.*?)(?:-[A-Za-z]+)?$/);
    const songNumber = match && match[1] ? parseInt(match[1].trim()) : null;
    const songName = match ? match[2].trim() : pptName;

    db.insert(songs)
      .values({
        songBookId: songBook.id,
        title: songName,
        number: songNumber,
        text,
      })
      .then(() => {
        console.log(`Inserted song into database: ${songName} (${songNumber})`);
        console.log(`----------------------------------------`);
        console.log(text);
      })
      .catch((err) => {
        console.error(
          `Failed to insert song into database: ${songName} (${songNumber})`,
          err
        );
      });
  }
  console.timeEnd(`Processing PPTX Images`);
  return;
}
