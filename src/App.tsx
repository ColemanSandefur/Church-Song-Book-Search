import { useEffect, useState } from 'react';
import './App.css'
import { ThemeProvider } from './components/theme-provider'
import { Item } from './db/schema';
import { Button } from './components/ui/button';

function App() {
  const [items, setItems] = useState<Item[]>([]);

  const refreshItems = async () => {
    const fetchedItems = await window.db.getItems();
    setItems(fetchedItems);
  }

  useEffect(() => {
    refreshItems().then().catch(console.error);
  }, []);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <h1 className='text-2xl'>
        Welcome!
      </h1>
      <ul>
        {items.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
      <Button onClick={async () => {await window.db.addItem({name: 'hello'}); await refreshItems();}}>Add Row</Button>
    </ThemeProvider>
  )
}

export default App
