import { TrashIcon } from './icons';
import { useComboStore } from '../features/editor/store/comboStore';
import styles from './Header.module.css';

export function ClearRouteButton() {
  const clearRoute = useComboStore((state) => state.clearRoute);

  const handleClick = () => {
    if (!window.confirm('表示中のルートをクリアしますか？')) return;
    clearRoute();
  };

  return (
    <button
      type="button"
      className={`${styles.iconButton} ${styles.danger}`}
      title="ルートをクリア"
      aria-label="ルートをクリア"
      onClick={handleClick}
    >
      <TrashIcon />
      <span className={styles.label}>ルートをクリア</span>
    </button>
  );
}
