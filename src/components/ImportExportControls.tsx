import { useRef } from 'react';
import { validateDeckRecord } from '../features/combo/model/schema';
import { useComboStore } from '../features/editor/store/comboStore';
import { MAX_IMPORT_FILE_SIZE_BYTES } from '../shared/constants';
import { IconButton } from './IconButton';
import { ExportIcon, ImportIcon } from './icons';
import styles from './Header.module.css';

export function ImportExportControls() {
  const deckName = useComboStore((state) => state.currentDeck?.name ?? '');
  const exportDocument = useComboStore((state) => state.exportDocument);
  const importDocument = useComboStore((state) => state.importDocument);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const deck = exportDocument();
    if (!deck) return;

    const payload = {
      schemaVersion: 0,
      ...deck,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deckName || 'deck'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
      alert(`ファイルサイズが大きすぎます（上限 ${MAX_IMPORT_FILE_SIZE_BYTES / 1024 / 1024}MB）`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);
        const record = validateDeckRecord(json);
        void importDocument(
          {
            deckId: record.deckId,
            name: record.name,
            source: record.source,
            cards: record.cards,
            route: record.route,
          },
          [],
        );
      } catch (error) {
        alert(`読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={styles.group}>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleImport}
        className={styles.hidden}
      />
      <IconButton
        icon={<ImportIcon />}
        label="展開ファイルの読み込み"
        title="展開ファイルの読み込み"
        onClick={() => fileInputRef.current?.click()}
      />
      <IconButton
        icon={<ExportIcon />}
        label="展開ファイルの保存"
        title="展開ファイルの保存"
        onClick={handleExport}
      />
    </div>
  );
}
