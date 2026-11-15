import { lazy, Suspense } from 'react';
import readme from '../../README.md?raw';
import { Dialog } from './Dialog';
import dialogStyles from './Dialog.module.css';
import styles from './HelpDialog.module.css';

const MarkdownContent = lazy(() => import('./MarkdownContent'));

type HelpDialogProps = {
  onClose: () => void;
};

export function HelpDialog({ onClose }: HelpDialogProps) {
  return (
    <Dialog
      onClose={onClose}
      footer={
        <button
          type="button"
          className={`${dialogStyles.button} ${dialogStyles.buttonSecondary}`}
          onClick={onClose}
        >
          閉じる
        </button>
      }
    >
      <div className={styles.content}>
        <Suspense fallback={<div className={styles.loading}>読み込み中…</div>}>
          <MarkdownContent>{readme}</MarkdownContent>
        </Suspense>
      </div>
    </Dialog>
  );
}
