import { useRef, useState } from 'react';
import { validateComboDocument } from '../features/combo/model/schema';
import { NeuronImportDialog } from '../features/neuron/components/NeuronImportDialog';
import { useComboStore } from '../features/editor/store/comboStore';
import styles from './Header.module.css';

export function ImportExportControls() {
  const deck = useComboStore((state) => state.document.deck);
  const exportDocument = useComboStore((state) => state.exportDocument);
  const importDocument = useComboStore((state) => state.importDocument);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isNeuronDialogOpen, setIsNeuronDialogOpen] = useState(false);

  const handleExport = () => {
    const doc = exportDocument();
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deck.name || 'deck'}.json`;
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
        const doc = validateComboDocument(json);
        importDocument(doc);
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
      <button
        type="button"
        className={styles.button}
        onClick={() => setIsNeuronDialogOpen(true)}
      >
        ニューロン
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleImport}
        className={styles.hidden}
      />
      <button
        type="button"
        className={styles.button}
        onClick={() => fileInputRef.current?.click()}
      >
        JSON読み込み
      </button>
      <button type="button" className={styles.button} onClick={handleExport}>
        JSON書き出し
      </button>
      {isNeuronDialogOpen ? (
        <NeuronImportDialog onClose={() => setIsNeuronDialogOpen(false)} />
      ) : null}
    </div>
  );
}
