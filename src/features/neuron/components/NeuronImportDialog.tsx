import { useRef, useState } from 'react';
import { Dialog } from '../../../components/Dialog';
import dialogStyles from '../../../components/Dialog.module.css';
import { useComboStore } from '../../editor/store/comboStore';
import { parseNeuronHtml } from '../services/parseNeuronHtml';
import mydeckImage from '../../../../docs/images/mydeck.png';
import downloadImage from '../../../../docs/images/download.png';
import downloadfileImage from '../../../../docs/images/downloadfile.png';
import uploadImage from '../../../../docs/images/upload.png';
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
    <Dialog
      onClose={onClose}
      footer={
        <button
          type="button"
          className={`${dialogStyles.button} ${dialogStyles.buttonSecondary}`}
          onClick={onClose}
        >
          キャンセル
        </button>
      }
    >
      <div className={styles.content}>
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
          からダウンロードしたデッキレシピをアップロードするための手順です。アップロードしたデータは、サーバーには送信されず、お使いのブラウザのLocalStorageに保存されます。
        </p>

        <ol className={styles.steps}>
          <li className={styles.step}>
            <h3 className={styles.stepTitle}>デッキページを開く</h3>
            <p className={styles.stepDescription}>
              遊戯王NEURONの利用したいデッキページを開きます。未公開のマイデッキでも利用可能です。
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
            <img
              src={mydeckImage}
              alt="遊戯王NEURONのデッキページ"
              className={styles.image}
            />
          </li>

          <li className={styles.step}>
            <h3 className={styles.stepTitle}>デッキレシピのページを保存する</h3>
            <div className={styles.stepDescription}>
              <p>以下のいずれかの方法でデッキレシピのページを保存します。</p>
              <ul className={styles.stepList}>
                <li>Ctrl + s / ⌘ + s</li>
                <li>ページで右クリックし、コンテキストメニューから「別名で保存…」をクリック</li>
                <li>ブラウザのツールバーから「ファイル」&gt;「ページを別名で保存」</li>
              </ul>
              <img
                src={downloadImage}
                alt="デッキレシピのダウンロード方法"
                className={styles.image}
              />
              <p>
                保存が完了すると、HTMLファイルと<code>*_files</code>というフォルダが作成されますので、まとめてひとつのフォルダに入れます。
              </p>
              <pre className={styles.codeBlock}>
                <code>
                  {`./新しいフォルダー（好きな名前にしてください）
   ├ 遊戯王 デッキレシピ 詳細 _ 遊戯王ニューロン(オフィシャルカードゲーム カードデータベース).html
   └ 遊戯王 デッキレシピ 詳細 _ 遊戯王ニューロン(オフィシャルカードゲーム カードデータベース)`}
                </code>
              </pre>
              <img
                src={downloadfileImage}
                alt="ダウンロード後はhtmlファイルと_filesフォルダーをひとつのフォルダにまとめる"
                className={styles.image}
              />
            </div>
          </li>

          <li className={styles.step}>
            <h3 className={styles.stepTitle}>デッキレシピを読み込む</h3>
            <div className={styles.stepDescription}>
              <p>
               ダイアログ下部の 「デッキレシピのアップロード」ボタンをクリックし、HTMLファイルと_filesフォルダーが入った<strong>親フォルダ</strong>を選択します。
              </p>
              <p>
                「◯個のファイルをこのサイトにアップロードしますか？「フォルダー名」のすべてのファイルがアップロードされます。この操作は、サイトを信頼できる場合のみ行ってください。」という注意ダイアログが表示されますが、そのまま「アップロード」ボタンをクリックします。
              </p>
              <img
                src={uploadImage}
                alt="デッキレシピのフォルダーを選択する"
                className={styles.image}
              />
              <small>※当Webアプリは、<strong>サーバーにデータを送信しません。</strong>アップロードしたファイルは、お使いのブラウザのLocalStorageに保存されます。アップロードしたデータを削除したい場合は、画面上部のデッキの削除、またはブラウザの開発者ツールから削除できます。</small>

              <div>
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
                  {isImporting ? 'インポート中...' : 'デッキレシピのアップロード'}
                </button>
              </div>
            </div>
          </li>
        </ol>
      </div>
    </Dialog>
  );
}
