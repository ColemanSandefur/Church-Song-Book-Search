import { app, BrowserWindow, ipcMain } from "electron";
// import { createRequire } from 'node:module'
import { fileURLToPath } from "node:url";
import path from "node:path";

// const require = createRequire(import.meta.url)
export const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { db, runMigrate } from "./db";
import { NewSong, songs } from "../src/db/schema";
import { extractAllPptxImagesFromDir } from "./ppt-extract";
import { extractTextFromImage } from "./text-extract";

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
  const images = await extractAllPptxImagesFromDir("");

  const [fileName, imagePaths] = Object.entries(images)[0];
  console.log(`Extracted images from ${fileName}:`);
  imagePaths.forEach((imgPath) => console.log(` - ${imgPath}`));

  const texts = await Promise.all(
    imagePaths.map(async (imgPath) => {
      const text = await extractTextFromImage(imgPath);
      return { imgPath, text };
    })
  );

  texts.forEach(({ imgPath, text }) => {
    console.log(`\nText from image ${imgPath}:\n${text}\n`);
  });
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
  const result = await addSong(songData);
  return result;
});
