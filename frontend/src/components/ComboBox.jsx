import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

export default function ComboBox({ folders, folder, setFolder }) {
  const lstOfFolders = [...folders];
  return (
    <div className="w-68 md:w-240 flex gap-5 items-center ">
      <h1 className="internal">Set Collection</h1>
      <Combobox
        modal={false}
        items={lstOfFolders}
        value={folder}
        onValueChange={(e) => {
          setFolder(e);
        }}
      >
        <ComboboxInput placeholder="Select a collection" />
        <ComboboxContent>
          <ComboboxEmpty>none</ComboboxEmpty>
          <ComboboxList>
            {(item) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
