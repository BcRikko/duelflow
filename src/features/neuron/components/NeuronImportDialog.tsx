import { useEffect, useRef, useState } from 'react';
import { useComboStore } from '../../editor/store/comboStore';
import { convertNeuronToComboDocument, parseNeuronDeck } from '../services/importNeuron';
import { generateBookmarkletHref } from '../services/bookmarklet';
import styles from './NeuronImportDialog.module.css';

type NeuronImportDialogProps = {
  onClose: () => void;
};

export function NeuronImportDialog({ onClose }: NeuronImportDialogProps) {
  const importDocument = useComboStore((state) => state.importDocument);
  const [jsonText, setJsonText] = useState('');
  const [copied, setCopied] = useState(false);
  const bookmarkletRef = useRef<HTMLDivElement>(null);

  const bookmarkletHref = generateBookmarkletHref();

  useEffect(() => {
    if (!bookmarkletRef.current) return;

    // React は javascript: URL をブロックするため、DOM API で直接生成する
    const container = bookmarkletRef.current;
    container.textContent = '';

    const anchor = document.createElement('a');
    anchor.href = bookmarkletHref;
    anchor.textContent = 'DuelFlowインポート';
    anchor.className = styles.bookmarkletLink;
    anchor.draggable = true;
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      alert('このリンクはブックマークバーにドラッグ＆ドロップするか、下のコードをコピーしてブックマークに登録してください。');
    });

    container.appendChild(anchor);

    return () => {
      container.textContent = '';
    };
  }, [bookmarkletHref]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // コピー失敗時は何もしない
    }
  };

  const handleImport = () => {
    try {
      const json = JSON.parse(jsonText);
      const neuronData = parseNeuronDeck(json);
      const doc = convertNeuronToComboDocument(neuronData);
      importDocument(doc);
      onClose();
    } catch (error) {
      alert(`インポートに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h2>ニューロンからインポート</h2>

        <section className={styles.section}>
          <h3>1. ブックマークレットを登録</h3>
          <p className={styles.description}>
            ① 下の「DuelFlowインポート」をブックマークバーにドラッグ＆ドロップするか、
            ② 下のコードをコピーして新しいブックマークのURLに貼り付けてください。
          </p>

          <div className={styles.bookmarkletArea}>
            <div ref={bookmarkletRef} />
            <button
              type="button"
              className={styles.copyButton}
              onClick={() => handleCopy(bookmarkletHref)}
            >
              {copied ? 'コピー済み' : 'コピー'}
            </button>
          </div>

          <textarea
            className={styles.codeInput}
            value={bookmarkletHref}
            readOnly
            rows={3}
            onClick={(e) => e.currentTarget.select()}
          />
        </section>

        <section className={styles.section}>
          <h3>2. ニューロンのデッキページで実行</h3>
          <p className={styles.description}>
            遊戯王ニューロンのデッキ詳細ページを開き、ブックマークレットをクリックします。
            デッキ情報がJSONとしてクリップボードにコピーされます。
          </p>
        </section>

        <section className={styles.section}>
          <h3>3. JSONを貼り付けてインポート</h3>
          <textarea
            className={styles.jsonInput}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder="ここにJSONを貼り付け"
            rows={10}
          />
          <div className={styles.buttons}>
            <button type="button" className={styles.cancel} onClick={onClose}>
              キャンセル
            </button>
            <button
              type="button"
              className={styles.import}
              onClick={handleImport}
              disabled={!jsonText.trim()}
            >
              インポート
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
