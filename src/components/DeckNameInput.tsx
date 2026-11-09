import { useComboStore } from '../features/editor/store/comboStore';
import styles from './Header.module.css';

export function DeckNameInput() {
  const deck = useComboStore((state) => state.document.deck);
  const updateDocument = useComboStore((state) => state.updateDocument);

  return (
    <div className={styles.group}>
      <input
        type="text"
        className={styles.deckName}
        value={deck.name}
        onChange={(e) => updateDocument({ deck: { ...deck, name: e.target.value } })}
        placeholder="デッキ名"
      />
    </div>
  );
}
