import { buildStepFromForm } from '../model/form';
import { useComboStore } from '../store/comboStore';
import styles from './NodeAddToolbar.module.css';

export function NodeAddToolbar() {
  const currentRouteId = useComboStore((state) => state.currentRouteId);
  const addStepAtPosition = useComboStore((state) => state.addStepAtPosition);
  const stepCount = useComboStore((state) =>
    currentRouteId
      ? (state.document.routes.find((r) => r.id === currentRouteId)?.steps.length ?? 0)
      : 0,
  );

  const handleAddNote = () => {
    if (!currentRouteId) {
      // eslint-disable-next-line no-alert
      alert('ルートが選択されていません。ヘッダーからルートを選択してください。');
      return;
    }

    const offset = stepCount * 40;
    addStepAtPosition(buildStepFromForm({ type: 'note', description: '' }), {
      x: 50 + offset,
      y: 50 + offset,
    });
  };

  return (
    <div className={styles.toolbar}>
      <button type="button" className={styles.button} onClick={handleAddNote}>
        + メモノード追加
      </button>
    </div>
  );
}
