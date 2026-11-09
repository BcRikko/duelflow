import { actionDefinitions } from '../../../shared/actionDefinitions';
import { useComboStore } from '../store/comboStore';
import styles from './DropActionToolbar.module.css';

export function DropActionToolbar() {
  const form = useComboStore((state) => state.addNodeForm);
  const setAddNodeForm = useComboStore((state) => state.setAddNodeForm);

  const handleActionChange = (action: string) => {
    setAddNodeForm((prev) =>
      prev.type === 'action'
        ? { ...prev, actions: [action] }
        : { type: 'action', actions: [action], cardId: '', relatedCards: [], description: '' },
    );
  };

  return (
    <div className={styles.toolbar}>
      <div className={styles.field}>
        <label htmlFor="drop-action" className={styles.label}>
          ドロップ時のアクション
        </label>
        <select
          id="drop-action"
          className={styles.select}
          value={form.type === 'action' ? form.actions[0] ?? '' : ''}
          onChange={(e) => handleActionChange(e.target.value)}
        >
          {actionDefinitions.map((action) => (
            <option key={action.id} value={action.id}>
              {action.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
