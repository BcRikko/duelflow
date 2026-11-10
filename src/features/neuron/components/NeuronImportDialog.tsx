import { useEffect, useRef, useState } from 'react';
import { useComboStore } from '../../editor/store/comboStore';
import { convertNeuronToComboDocument, parseNeuronDeck } from '../services/importNeuron';
import { parseNeuronHtml } from '../services/parseNeuronHtml';
import { generateBookmarkletHref } from '../services/bookmarklet';
import styles from './NeuronImportDialog.module.css';

interface FileSystemFileHandle {
  kind: 'file';
  name: string;
  getFile(): Promise<File>;
}

interface FileSystemDirectoryHandle {
  kind: 'directory';
  name: string;
  values(): AsyncIterable<FileSystemFileHandle | FileSystemDirectoryHandle>;
}

interface WindowWithDirectoryPicker extends Window {
  showDirectoryPicker(): Promise<FileSystemDirectoryHandle>;
}

type ImportMode = 'json' | 'html';

type NeuronImportDialogProps = {
  onClose: () => void;
};

export function NeuronImportDialog({ onClose }: NeuronImportDialogProps) {
  const importDocument = useComboStore((state) => state.importDocument);
  const importNeuronHtml = useComboStore((state) => state.importNeuronHtml);
  const [mode, setMode] = useState<ImportMode>('json');
  const [jsonText, setJsonText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bookmarkletRef = useRef<HTMLDivElement>(null);

  const bookmarkletHref = generateBookmarkletHref();

  useEffect(() => {
    const input = fileInputRef.current;
    if (input) {
      input.setAttribute('webkitdirectory', '');
      input.setAttribute('directory', '');
    }
  }, []);

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

  const handleJsonImport = () => {
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

  async function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  async function processFiles(files: File[]) {
    const htmlFile = files.find((file) => file.name.endsWith('.html'));

    if (!htmlFile) {
      alert('HTMLファイルが見つかりません。保存したフォルダ全体を選択してください。');
      return;
    }

    setIsImporting(true);
    try {
      const html = await readFileAsText(htmlFile);
      const data = parseNeuronHtml(html);
      await importNeuronHtml(data, files);
      onClose();
    } catch (error) {
      alert(`インポートに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  const handleHtmlFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await processFiles(Array.from(e.target.files || []));
  };

  async function collectFilesFromDirectory(
    handle: FileSystemDirectoryHandle,
    path = handle.name,
  ): Promise<File[]> {
    const files: File[] = [];
    for await (const entry of handle.values()) {
      const entryPath = `${path}/${entry.name}`;
      if (entry.kind === 'directory') {
        files.push(...(await collectFilesFromDirectory(entry, entryPath)));
      } else {
        const file = await entry.getFile();
        Object.defineProperty(file, 'webkitRelativePath', {
          value: entryPath,
          writable: false,
        });
        files.push(file);
      }
    }
    return files;
  }

  const handleSelectFolder = async () => {
    const win = window as unknown as Partial<WindowWithDirectoryPicker>;
    if (typeof win.showDirectoryPicker === 'function') {
      try {
        const dirHandle = await win.showDirectoryPicker();
        const files = await collectFilesFromDirectory(dirHandle);
        await processFiles(files);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        alert(`フォルダ選択に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      // File System Access API が使えない場合は webkitdirectory 入力へフォールバック
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h2>ニューロンからインポート</h2>

        <div className={styles.tabs}>
          <button
            type="button"
            className={mode === 'json' ? styles.activeTab : styles.tab}
            onClick={() => setMode('json')}
          >
            ブックマークレット
          </button>
          <button
            type="button"
            className={mode === 'html' ? styles.activeTab : styles.tab}
            onClick={() => setMode('html')}
          >
            保存HTML
          </button>
        </div>

        {mode === 'json' ? (
          <>
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
                  onClick={handleJsonImport}
                  disabled={!jsonText.trim()}
                >
                  インポート
                </button>
              </div>
            </section>
          </>
        ) : (
          <>
            <section className={styles.section}>
              <h3>1. ニューロンのページを保存</h3>
              <p className={styles.description}>
                遊戯王ニューロンのデッキ詳細ページを、ブラウザの「名前を付けてページを保存」で保存してください。
                HTMLファイルと同じフォルダ内の「〜_files」フォルダも必要です。
              </p>
            </section>

            <section className={styles.section}>
              <h3>2. 保存したフォルダを選択</h3>
              <p className={styles.description}>
                HTMLファイルと「〜_files」フォルダが入った<strong>親フォルダ</strong>を選択してください。
                画像はブラウザ内の IndexedDB に保存され、リポジトリには含まれません。
              </p>

              <input
                ref={fileInputRef}
                type="file"
                className={styles.hiddenInput}
                onChange={handleHtmlFileSelect}
                disabled={isImporting}
              />
              <button
                type="button"
                className={styles.import}
                onClick={handleSelectFolder}
                disabled={isImporting}
              >
                {isImporting ? 'インポート中...' : '保存フォルダを選択'}
              </button>
            </section>

            <section className={styles.section}>
              <p className={styles.description}>
                画像ファイルが見つからないカードは、種別アイコンのみ表示されます。
              </p>
              <div className={styles.buttons}>
                <button type="button" className={styles.cancel} onClick={onClose}>
                  キャンセル
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
