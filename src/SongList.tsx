import { useState, useEffect } from "react";
import { Song } from "./db/schema";
import { Button } from "./components/ui/button";
import { RefreshCw } from "lucide-react";

export default function SongListElement() {
  const [songs, setSongs] = useState<Song[]>([]);

  const refreshSongs = async () => {
    const fetchedItems = await window.db.getSongs();
    setSongs(fetchedItems);
  };

  useEffect(() => {
    refreshSongs().then().catch(console.error);
  }, []);
  return (
    <div>
      <div className="flex flex-row justify-between">
        <h2 className="text-2xl mb-4">Song List</h2>
        <Button variant="outline" size="icon" onClick={refreshSongs}>
          <RefreshCw />
        </Button>
      </div>
      <ul>
        {songs.map((item) => (
          <li key={item.id}>
            {item.number}: {item.title}
          </li>
        ))}
      </ul>
      {songs.length === 0 && (
        <p className="text-muted-foreground">Your songs will show up here!</p>
      )}
    </div>
  );
}
