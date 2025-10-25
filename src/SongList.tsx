import { Button } from "./components/ui/button";
import { RefreshCw } from "lucide-react";
import { useSongs } from "./contexts/SongsContext";

export default function SongListElement() {
  const { songs, refresh } = useSongs();
  return (
    <div>
      <div className="flex flex-row justify-between">
        <h2 className="text-2xl mb-4">Song List</h2>
        <Button variant="outline" size="icon" onClick={refresh}>
          <RefreshCw />
        </Button>
      </div>
      <ul>
        {songs.map((item) => (
          <li key={item.id}>
            {item.number && `${item.number}:`} {item.title}
          </li>
        ))}
      </ul>
      {songs.length === 0 && (
        <p className="text-muted-foreground">Your songs will show up here!</p>
      )}
    </div>
  );
}
