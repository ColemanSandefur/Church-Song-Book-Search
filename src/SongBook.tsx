import { useEffect, useState } from "react";
import { Button } from "./components/ui/button";
import { Plus, XIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "./components/ui/field";
import { Input } from "./components/ui/input";
import { parse } from "pathe";
import { useSongBooks } from "./contexts/SongBooksContext";

export default function SongBookView() {
  const { songBooks, addSongBook, removeSongBookById } = useSongBooks();
  const [isOpen, setIsOpen] = useState(false);
  const [songBookName, setSongBookName] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSongBookName("");
    }
  }, [setSongBookName, isOpen]);

  return (
    <div className="">
      <div className="flex flex-row justify-between">
        <h2 className="text-2xl mb-4">Song Books</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Song Book</DialogTitle>
              <DialogDescription>
                Select a folder that contains the PowerPoint files.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                console.log(e);

                const form = e.currentTarget;
                const fileInput = form.elements.namedItem(
                  "folder"
                ) as HTMLInputElement;
                const files = fileInput?.files;

                if (files && files.length > 0) {
                  const directory = parse(files[0].path).dir;

                  console.log(songBookName, directory);
                  addSongBook({
                    path: directory,
                    name: songBookName,
                  });
                }

                setIsOpen(false);
              }}
            >
              <FieldGroup>
                <FieldSet>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="folder">
                        PowerPoint folder
                      </FieldLabel>
                      <Input
                        id="folder"
                        type="file"
                        {...{ webkitdirectory: "true", directory: "true" }}
                        onChange={(e) => {
                          const files = e.target.files;
                          console.log(files);
                          if (files && files.length > 0) {
                            const file = files[0] as File & {
                              webkitRelativePath?: string;
                            };
                            const firstPath = file.webkitRelativePath || "";
                            const folderName = firstPath.split("/")[0];
                            console.log(folderName);
                            if (songBookName.trim().length === 0) {
                              setSongBookName(folderName);
                            }
                          }
                        }}
                      />
                      <FieldDescription>
                        The folder that directly holds all the PowerPoint files.
                      </FieldDescription>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="name">Song Book Name</FieldLabel>
                      <Input
                        id="name"
                        placeholder="Awesome Songs"
                        value={songBookName}
                        onChange={(e) => setSongBookName(e.target.value)}
                      />
                    </Field>
                  </FieldGroup>
                </FieldSet>
                <Field orientation="horizontal">
                  <Button type="submit">Submit</Button>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancel
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {songBooks.length === 0 ? (
        <p className="text-muted-foreground">
          Your song books will show up here!
        </p>
      ) : (
        <ul className="flex flex-col gap-4 mt-4">
          {songBooks.map((item) => (
            <li key={item.id} className="flex flex-col gap-1">
              <div className="flex flex-row justify-between">
                <div className="">
                  <p className="">{item.name} </p>
                  <p className="text-muted-foreground">{item.path}</p>
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="float-end"
                  onClick={async () => {
                    await removeSongBookById(item.id);
                  }}
                >
                  <XIcon />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
