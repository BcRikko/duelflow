import { useState } from 'react';
import { DropActionToolbar } from '../../editor/components/DropActionToolbar';
import { NodeAddToolbar } from '../../editor/components/NodeAddToolbar';
import { useComboStore } from '../../editor/store/comboStore';
import { CardForm } from './CardForm';
import styles from './CardList.module.css';

export function CardList() {
  const cards = useComboStore((state) => state.document.cardCatalog);
  const selectedCardId = useComboStore((state) => state.selectedCardIdForAdd);
  const selectCardForAdd = useComboStore((state) => state.selectCardForAdd);
  const removeCardFromCatalog = useComboStore((state) => state.removeCardFromCatalog);

  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filteredCards = cards.filter((card) =>
    card.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className={styles.container}>
      <NodeAddToolbar />
      <div className={styles.header}>
        <h2>カード一覧</h2>
        <button className={styles.addButton} onClick={() => setIsFormOpen(true)}>
          + 追加
        </button>
      </div>

      <input
        type="text"
        className={styles.search}
        placeholder="カード名で検索"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <DropActionToolbar />

      <ul className={styles.list}>
        {filteredCards.map((card) => (
          <li
            key={card.id}
            className={`${styles.card} ${selectedCardId === card.id ? styles.selected : ''}`}
            onClick={() => selectCardForAdd(card.id)}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/duelflow-card', card.id);
              e.dataTransfer.effectAllowed = 'copy';
            }}
          >
            <div className={styles.imageWrapper}>
              {card.imageUrl ? (
                <img src={card.imageUrl} alt={card.name} className={styles.image} />
              ) : (
                <div className={styles.placeholder}>{card.name.charAt(0)}</div>
              )}
            </div>
            <div className={styles.info}>
              <span className={styles.name}>{card.name}</span>
              <span className={styles.type}>{card.type}</span>
            </div>
            <button
              className={styles.delete}
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`「${card.name}」を削除しますか？`)) {
                  removeCardFromCatalog(card.id);
                }
              }}
            >
              ×
            </button>
          </li>
        ))}
        {filteredCards.length === 0 && (
          <li className={styles.empty}>カードが登録されていません</li>
        )}
      </ul>

      {isFormOpen && <CardForm onClose={() => setIsFormOpen(false)} />}
    </div>
  );
}
