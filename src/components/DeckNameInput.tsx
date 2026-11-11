import { useComboStore } from '../features/editor/store/comboStore';
import styles from './Header.module.css';

export function DeckNameInput() {
  const deckName = useComboStore((state) => state.currentDeck?.name ?? '');
  const renameCurrentDeck = useComboStore((state) => state.renameCurrentDeck);

  return (
    <div className={styles.group}>
      <input
        type="text"
        className={styles.deckName}
        value={deckName}
        onChange={(e) => renameCurrentDeck(e.target.value)}
        placeholder="デッキ名"
      />
    </div>
  );
}
