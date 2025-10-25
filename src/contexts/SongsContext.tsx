import { Song } from "@/db/schema";
import {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
  useCallback,
} from "react";

const SongsContext = createContext<{
  songs: Song[];
  refresh: () => void;
} | null>(null);

export function SongsProvider({ children }: { children: ReactNode }) {
  const [songs, setSongs] = useState([] as Song[]);

  const refresh = useCallback(async function refresh() {
    const fetchedSongs = await window.db.getSongs();
    setSongs(fetchedSongs);
  }, []);

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
    <SongsContext.Provider value={{ songs, refresh }}>
      {children}
    </SongsContext.Provider>
  );
}

export function useSongs() {
  const context = useContext(SongsContext);
  if (!context) {
    throw new Error("useTheme must be used inside a ThemeProvider");
  }
  return context;
}
