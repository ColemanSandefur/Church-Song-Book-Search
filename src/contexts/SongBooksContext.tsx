import { NewSongBook, SongBook } from "@/db/schema";
import {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
  useCallback,
} from "react";

const SongBooksContext = createContext<{
  songBooks: SongBook[];
  refresh: () => void;
  addSongBook: (songBook: NewSongBook) => Promise<void>;
  removeSongBookById: (songBookId: number) => Promise<void>;
} | null>(null);

export function SongBooksProvider({ children }: { children: ReactNode }) {
  const [songBooks, setSongBooks] = useState([] as SongBook[]);

  const refresh = useCallback(async function refresh() {
    const fetchedBooks = await window.db.getSongBooks();
    setSongBooks(fetchedBooks);
  }, []);

  const addSongBook = useCallback(
    async function addSongBook(songBook: NewSongBook) {
      await window.db.addSongBook(songBook);
      await refresh();
    },
    [refresh]
  );

  const removeSongBookById = useCallback(
    async function removeSongBookById(id: number) {
      await window.db.removeSongBookById(id);
      await refresh();
    },
    [refresh]
  );

  useEffect(() => {
    refresh().then().catch(console.error);
  }, [refresh]);

  useEffect(() => {
    const interval = setInterval(() => {
      refresh().catch(console.error);
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <SongBooksContext.Provider
      value={{ songBooks, refresh, addSongBook, removeSongBookById }}
    >
      {children}
    </SongBooksContext.Provider>
  );
}

export function useSongBooks() {
  const context = useContext(SongBooksContext);
  if (!context) {
    throw new Error("useTheme must be used inside a ThemeProvider");
  }
  return context;
}
