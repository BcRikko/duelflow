import { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import readme from '../../README.md?raw';
import dialogStyles from './Dialog.module.css';
import styles from './HelpDialog.module.css';

type HelpDialogProps = {
  onClose: () => void;
};

export function HelpDialog({ onClose }: HelpDialogProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className={dialogStyles.overlay} onClick={onClose}>
      <div
        className={`${dialogStyles.dialog} ${dialogStyles.dialogLarge} ${styles.content}`}
        onClick={(e) => e.stopPropagation()}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{readme}</ReactMarkdown>
        <div className={dialogStyles.buttons}>
          <button
            type="button"
            className={`${dialogStyles.button} ${dialogStyles.buttonSecondary}`}
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
