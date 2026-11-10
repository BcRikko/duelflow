import { useComboStore } from '../features/editor/store/comboStore';
import styles from './Header.module.css';

export function ClearAllButton() {
  const clearAll = useComboStore((state) => state.clearAll);

  const handleClick = async () => {
    if (window.confirm('すべてのデッキ・カード・ルートを削除しますか？')) {
      await clearAll();
    }
  };

  return (
    <button type="button" className={`${styles.button} ${styles.danger}`} onClick={handleClick}>
      すべてクリア
    </button>
  );
}
