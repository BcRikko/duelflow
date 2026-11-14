import { useRef } from 'react';
import { validateDeckRecord } from '../features/combo/model/schema';
import { useComboStore } from '../features/editor/store/comboStore';
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
      <button
        type="button"
        className={styles.iconButton}
        onClick={() => fileInputRef.current?.click()}
        title="展開ファイルの読み込み"
        aria-label="展開ファイルの読み込み"
      >
        <ImportIcon />
        <span className={styles.label}>展開ファイルの読み込み</span>
      </button>
      <button
        type="button"
        className={styles.iconButton}
        onClick={handleExport}
        title="展開ファイルの保存"
        aria-label="展開ファイルの保存"
      >
        <ExportIcon />
        <span className={styles.label}>展開ファイルの保存</span>
      </button>
    </div>
  );
}
