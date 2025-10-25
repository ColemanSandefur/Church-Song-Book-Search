import { ipcRenderer, contextBridge } from "electron";
import { NewSong, NewSongBook } from "../src/db/schema";

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) =>
      listener(event, ...args)
    );
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },

  // You can expose other APTs you need here.
  // ...
});

contextBridge.exposeInMainWorld("db", {
  getSongs: () => ipcRenderer.invoke("db:get-songs"),
  addSong: (songData: NewSong) => ipcRenderer.invoke("db:add-song", songData),
  getSongBooks: () => ipcRenderer.invoke("db:get-song-books"),
  addSongBook: (songBookData: NewSongBook) =>
    ipcRenderer.invoke("db:add-song-book", songBookData),
  removeSongBookById: (songNum: number) =>
    ipcRenderer.invoke("db:remove-song-book-by-id", songNum),
});
