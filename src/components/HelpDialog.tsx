import { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import readme from '../../README.md?raw';
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
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{readme}</ReactMarkdown>
        <div className={styles.buttons}>
          <button type="button" className={styles.close} onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
