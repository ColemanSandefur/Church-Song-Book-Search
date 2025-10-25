import "./App.css";
import { ThemeProvider } from "./components/theme-provider";
import SongBook from "./SongBook";
import { Card, CardContent } from "./components/ui/card";
import SongListElement from "./SongList";
import { SongBooksProvider } from "./contexts/SongBooksContext";
import { SongsProvider } from "./contexts/SongsContext";

function App() {
  return (
    <Providers>
      <div className="max-w-7xl mx-auto m-4">
        <h1 className="text-3xl mb-8">Welcome!</h1>

        <div className="flex flex-col gap-4">
          <Card>
            <CardContent>
              <SongBook />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <SongListElement />
            </CardContent>
          </Card>
        </div>
      </div>
    </Providers>
  );
}

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <SongBooksProvider>
          <SongsProvider>{children}</SongsProvider>
        </SongBooksProvider>
      </ThemeProvider>
    </>
  );
}

export default App;
