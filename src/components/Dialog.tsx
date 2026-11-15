import { useEffect } from 'react';
import styles from './Dialog.module.css';

type DialogSize = 'small' | 'large';

type DialogProps = {
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: DialogSize;
  onClose: () => void;
};

export function Dialog({ children, footer, size = 'large', onClose }: DialogProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const sizeClass = size === 'small' ? styles.dialogSmall : styles.dialogLarge;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.dialog} ${sizeClass}`} onClick={(e) => e.stopPropagation()}>
        {children}
        {footer ? <div className={styles.buttons}>{footer}</div> : null}
      </div>
    </div>
  );
}
