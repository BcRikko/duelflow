import { useRef, useState } from 'react';
import { useComboStore } from '../../editor/store/comboStore';
import { parseNeuronHtml } from '../services/parseNeuronHtml';
import styles from './NeuronImportDialog.module.css';

type NeuronImportDialogProps = {
  onClose: () => void;
};

export function NeuronImportDialog({ onClose }: NeuronImportDialogProps) {
  const importNeuronHtml = useComboStore((state) => state.importNeuronHtml);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  async function processFiles(files: File[]) {
    const htmlFile = files.find((file) => /\.html?$/i.test(file.name));

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

  const handleSelectFolder = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h2>デッキを追加</h2>

        <p className={styles.intro}>
          <a
            href="https://www.db.yugioh-card.com/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            遊戯王NEURON
          </a>
          からダウンロードしたデッキ情報をインポートするための手順です。
        </p>

        <ol className={styles.steps}>
          <li className={styles.step}>
            <h3 className={styles.stepTitle}>デッキページを開く</h3>
            <p className={styles.stepDescription}>
              遊戯王NEURONの利用したいデッキページを開きます。
              <br />
              例:{" "}
              <a
                href="https://www.db.yugioh-card.com/yugiohdb/member_deck.action?cgid=ff3b05aa9b7f51f014a4069be2e51902&dno=9"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                レッドデーモンデッキ
              </a>
            </p>
          </li>

          <li className={styles.step}>
            <h3 className={styles.stepTitle}>デッキページを保存する</h3>
            <div className={styles.stepDescription}>
              <p>デッキページを保存します。保存方法は以下のとおりです。</p>
              <ul className={styles.stepList}>
                <li>Ctrl + s / ⌘ + s</li>
                <li>ページで右クリックし、コンテキストメニューから「別名で保存…」をクリック_</li>
                <li>ブラウザのツールバーから ファイル &gt; ページを別名で保存</li>
              </ul>
              <p>
                保存が完了すると、HTMLファイルと<code>*_files</code>というフォルダが作成されます。
                2つをまとめてひとつのフォルダに入れます。
              </p>
              <pre className={styles.codeBlock}>
                <code>
                  {`./新しいフォルダー（好きな名前にしてください）
   ├ 遊戯王 デッキレシピ 詳細 _ 遊戯王ニューロン(オフィシャルカードゲーム カードデータベース).html
   └ 遊戯王 デッキレシピ 詳細 _ 遊戯王ニューロン(オフィシャルカードゲーム カードデータベース)`}
                </code>
              </pre>
            </div>
          </li>

          <li className={styles.step}>
            <h3 className={styles.stepTitle}>デッキレシピを読み込む</h3>
            <div className={styles.stepDescription}>
              <p>
                HTMLファイルと_filesフォルダーが入った<strong>親フォルダ</strong>を選択します。データはブラウザのローカルストレージに保存され、サーバーには送信されません。
              </p>
              <p>
                デッキレシピのフォルダーを選択すると「このサイトにファイルの表示とコピーを許可しますか？」という確認ダイアログが表示されるので許可します。
              </p>

              <input
                ref={fileInputRef}
                type="file"
                className={styles.hiddenInput}
                onChange={handleHtmlFileSelect}
                disabled={isImporting}
                // @ts-expect-error webkitdirectory is non-standard but supported in Chromium browsers
                webkitdirectory=""
                directory=""
              />
              <button
                type="button"
                className={styles.import}
                onClick={handleSelectFolder}
                disabled={isImporting}
              >
                {isImporting ? 'インポート中...' : 'デッキレシピのフォルダーを選択'}
              </button>
            </div>
          </li>
        </ol>

        <div className={styles.buttons}>
          <button type="button" className={styles.cancel} onClick={onClose}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
