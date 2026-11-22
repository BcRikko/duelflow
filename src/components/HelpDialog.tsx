import readme from '../../README.md?raw';
import { Dialog } from './Dialog';
import MarkdownContent from './MarkdownContent';
import dialogStyles from './Dialog.module.css';
import styles from './HelpDialog.module.css';

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
        <MarkdownContent>{readme}</MarkdownContent>
      </div>
    </Dialog>
  );
}
