import { app, BrowserWindow, ipcMain } from "electron";
// import { createRequire } from "node:module"
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "fs";

// const require = createRequire(import.meta.url)
export const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { db, runMigrate } from "./db";
import {
  NewScheduledSong,
  NewSong,
  NewSongBook,
  ScheduledSong,
  scheduledSongs,
  SongBook,
  songBooks,
  songs,
} from "../src/db/schema";
import { extractPptxImages, getAllPptxFilesFromDir } from "./ppt-extract";
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
  db.update(scheduledSongs)
    .set({ isActive: 0 })
    .where(eq(scheduledSongs.isActive, 1))
    .run();
  await syncAllSongBooks();
  createWindow();
  startScheduledSongProcessingLoop();
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

  await syncDirectorySongs(result).catch((err) => {
    console.error(`Error syncing songs for song book ID ${result.id}:`, err);
  });

  return result;
}

async function syncAllSongBooks() {
  const allSongBooks = await db.select().from(songBooks).all();

  await Promise.all(
    allSongBooks.map((songBook) => syncDirectorySongs(songBook))
  );
}

async function syncDirectorySongs(songBook: SongBook) {
  const searchedSongs = await db
    .select()
    .from(songs)
    .where(eq(songs.songBookId, songBook.id));
  const queuedSongs = await db
    .select()
    .from(scheduledSongs)
    .where(eq(scheduledSongs.songBookId, songBook.id));

  const existingSongPaths = new Set<string>(
    [...searchedSongs, ...queuedSongs].map((s) => s.powerPointPath)
  );

  const allPptFiles = (await getAllPptxFilesFromDir(songBook.path)).map(
    (fileName) => path.join(songBook.path, fileName)
  );

  const newSongsPaths = allPptFiles.filter(
    (filePath) => existingSongPaths.has(filePath) === false
  );

  const newSongs = newSongsPaths.map((songPath) => {
    const pptName = path.parse(songPath).name;
    const match = pptName.match(/^(\d*\s+)?(.*?)(?:-[A-Za-z]+)?$/);
    const songNumber = match && match[1] ? parseInt(match[1].trim()) : null;
    const songName = (match ? match[2].trim() : pptName).replace(
      /([a-z])_([a-z])/i,
      "$1'$2"
    );

    return {
      songBookId: songBook.id,
      number: songNumber,
      title: songName,
      powerPointPath: songPath,
    } as NewScheduledSong;
  });

  if (newSongs.length === 0) {
    return [];
  }

  return await db.insert(scheduledSongs).values(newSongs).returning().all();
}

async function startScheduledSongProcessingLoop() {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    console.log("Checking for scheduled songs to process...");
    // process all scheduled songs available
    while (
      (await processScheduledSongs().catch((err) => {
        console.error("Error processing scheduled songs:", err);
        return 0;
      })) > 0
    );

    // Wait for 10 seconds before checking again
    await new Promise((resolve) => {
      setTimeout(resolve, 10_000);
    });
  }
}

async function processScheduledSongs() {
  const songs = db
    .update(scheduledSongs)
    .set({ isActive: 1 })
    .where(eq(scheduledSongs.isActive, 0))
    .limit(5)
    .returning()
    .all();

  if (songs.length === 0) {
    console.log("No scheduled songs to process.");
    return 0;
  }

  console.log(`Processing ${songs.length} scheduled songs...`);

  await Promise.all(
    songs.map(async (song) => {
      await processSong(song);
      const completedSong = db
        .delete(scheduledSongs)
        .where(eq(scheduledSongs.id, song.id))
        .returning()
        .get();

      console.log(
        `Processed and removed scheduled song: ${completedSong?.title}`
      );
    })
  );

  return songs.length;
}

async function processSong(song: ScheduledSong) {
  if (!song.powerPointPath || fs.existsSync(song.powerPointPath) === false) {
    console.error(
      `PowerPoint file does not exist: ${song.powerPointPath}. Skipping song: ${song.title} (${song.number})`
    );
    return;
  }

  const imagePaths = await extractPptxImages(song.powerPointPath);

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

  db.insert(songs)
    .values({
      songBookId: song.songBookId,
      title: song.title,
      number: song.number,
      powerPointPath: song.powerPointPath,
      text,
    })
    .then(() => {
      console.log(
        `Inserted song into database: ${song.title} (${song.number})`
      );
      console.log(`----------------------------------------`);
      console.log(text);
    })
    .catch((err) => {
      console.error(
        `Failed to insert song into database: ${song.title} (${song.number})`,
        err
      );
    });
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
