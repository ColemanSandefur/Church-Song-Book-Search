/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string;
    /** /dist/ or /public/ */
    VITE_PUBLIC: string;
  }
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
  ipcRenderer: import("electron").IpcRenderer;
  db: {
    getSongs: () => Promise<import("../src/db/schema").Song[]>;
    addSong: (songData: import("../src/db/schema").NewSong) => Promise<unknown>;
    getSongBooks: () => Promise<import("../src/db/schema").SongBook[]>;
    addSongBook: (
      songBookData: import("../src/db/schema").NewSongBook
    ) => Promise<unknown>;
    removeSongBookById: (
      songNum: number
    ) => Promise<import("../src/db/schema").SongBook>;
  };
}
