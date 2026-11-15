import { useEffect } from 'react';
import { performRedo, performUndo, useComboStore } from '../features/editor/store/comboStore';
import { IconButton } from './IconButton';
import { RedoIcon, UndoIcon } from './icons';
import styles from './Header.module.css';

export function HistoryControls() {
  const canUndo = useComboStore((state) => state.past.length > 0);
  const canRedo = useComboStore((state) => state.future.length > 0);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMod = event.metaKey || event.ctrlKey;
      if (!isMod) return;

      if (event.key === 'z' || event.key === 'Z') {
        event.preventDefault();
        if (event.shiftKey) {
          performRedo();
        } else {
          performUndo();
        }
      } else if (event.key === 'y' || event.key === 'Y') {
        event.preventDefault();
        performRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={styles.group}>
      <IconButton
        icon={<UndoIcon />}
        label="元に戻す"
        title="元に戻す (Ctrl+Z / Cmd+Z)"
        onClick={performUndo}
        disabled={!canUndo}
      />
      <IconButton
        icon={<RedoIcon />}
        label="やり直し"
        title="やり直し (Ctrl+Y / Cmd+Shift+Z)"
        onClick={performRedo}
        disabled={!canRedo}
      />
    </div>
  );
}
