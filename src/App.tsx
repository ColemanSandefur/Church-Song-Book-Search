import { useEffect, useState } from 'react';
import './App.css'
import { ThemeProvider } from './components/theme-provider'
import { Song } from './db/schema';
import { Button } from './components/ui/button';
import { NewSong } from './db/schema';

function App() {
  const [songs, getSongs] = useState<Song[]>([]);

  const refreshSongs = async () => {
    const fetchedItems = await window.db.getSongs();
    getSongs(fetchedItems);
  }

  useEffect(() => {
    refreshSongs().then().catch(console.error);
  }, []);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <h1 className='text-2xl'>
        Welcome!
      </h1>
      <ul>
        {songs.map(item => (
          <li key={item.id}>{item.number}: {item.title}</li>
        ))}
      </ul>
      <Button onClick={async () => {await window.db.addSong({title: "Test Song", number: 25} as NewSong); await refreshSongs();}}>Add Row</Button>
    </ThemeProvider>
  )
}

export default App
