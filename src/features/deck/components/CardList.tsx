import { useMemo, useState } from 'react';
import { NoteIcon } from '../../../components/icons';
import { DropActionToolbar } from '../../editor/components/DropActionToolbar';
import { useComboStore } from '../../editor/store/comboStore';
import { useCardImageUrl } from '../../../shared/useCardImageUrl';
import type { Card } from '../../combo/model/types';
import { CardForm } from './CardForm';
import styles from './CardList.module.css';

const NOTE_TOOL_ID = '__note__';

type CardListImageProps = {
  card: Card;
};

function CardListImage({ card }: CardListImageProps) {
  const localImageUrl = useCardImageUrl(card.id, card.name);
  const src = localImageUrl || card.imageUrl;

  if (src) {
    return <img src={src} alt={card.name} className={styles.image} />;
  }

  return <div className={styles.placeholder}>{card.name.charAt(0)}</div>;
}

export function CardList() {
  const cards = useComboStore((state) => state.cards);
  const currentDeck = useComboStore((state) => state.currentDeck);
  const selectedCardId = useComboStore((state) => state.selectedCardIdForAdd);
  const selectCardForAdd = useComboStore((state) => state.selectCardForAdd);

  const deckCardIds = useMemo(
    () => new Set((currentDeck?.cards ?? []).map((entry) => entry.cardId)),
    [currentDeck?.cards],
  );

  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filteredCards = cards
    .filter((card) => deckCardIds.has(card.id))
    .filter((card) => card.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>カード一覧</h2>
        <button className={styles.addButton} onClick={() => setIsFormOpen(true)}>
          + 追加
        </button>
      </div>

      <input
        type="search"
        className={styles.search}
        placeholder="カード名で検索"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <DropActionToolbar />

      <ul className={styles.list}>
        <li
          className={`${styles.card} ${selectedCardId === NOTE_TOOL_ID ? styles.selected : ''}`}
          onClick={() => selectCardForAdd(NOTE_TOOL_ID)}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('application/duelflow-note', '1');
            e.dataTransfer.effectAllowed = 'copy';
          }}
          title="メモ"
        >
          <div className={styles.imageWrapper}>
            <NoteIcon className={styles.noteIcon} />
          </div>
          <div className={styles.info}>
            <span className={styles.name}>メモ</span>
            <span className={styles.type}>ノート</span>
          </div>
        </li>

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
              <CardListImage card={card} />
            </div>
            <div className={styles.info}>
              <span className={styles.name}>{card.name}</span>
              <span className={styles.type}>{card.type}</span>
            </div>
          </li>
        ))}
        {filteredCards.length === 0 && (
          <li className={styles.empty}>このデッキにカードが登録されていません</li>
        )}
      </ul>

      {isFormOpen && <CardForm onClose={() => setIsFormOpen(false)} />}
    </div>
  );
}
