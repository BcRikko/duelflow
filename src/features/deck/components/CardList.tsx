import { memo, useCallback, useMemo, useState } from 'react';
import { CardImage } from '../../../components/CardImage';
import { NoteIcon } from '../../../components/icons';
import { DropActionToolbar } from '../../editor/components/DropActionToolbar';
import { useComboStore } from '../../editor/store/comboStore';
import type { Card } from '../../combo/model/types';
import { CardForm } from './CardForm';
import styles from './CardList.module.css';

const NOTE_TOOL_ID = '__note__';

type CardListItemProps = {
  card: Card;
  selected: boolean;
  onSelect: (id: string) => void;
};

const CardListItem = memo(function CardListItem({ card, selected, onSelect }: CardListItemProps) {
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      e.dataTransfer.setData('application/duelflow-card', card.id);
      e.dataTransfer.effectAllowed = 'copy';
    },
    [card.id],
  );

  return (
    <button
      type="button"
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      onClick={() => onSelect(card.id)}
      draggable
      onDragStart={handleDragStart}
      aria-label={`${card.name} (${card.type}) を選択`}
    >
      <div className={styles.imageWrapper}>
        <CardImage
          cardId={card.id}
          cardName={card.name}
          className={styles.image}
          placeholderClassName={styles.placeholder}
        />
      </div>
      <div className={styles.info}>
        <span className={styles.name}>{card.name}</span>
        <span className={styles.type}>{card.type}</span>
      </div>
    </button>
  );
});

export const CardList = memo(function CardList() {
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

  const filteredCards = useMemo(
    () =>
      cards
        .filter((card) => deckCardIds.has(card.id))
        .filter((card) => card.name.toLowerCase().includes(search.toLowerCase())),
    [cards, deckCardIds, search],
  );

  const handleSelectCard = useCallback(
    (id: string) => selectCardForAdd(id),
    [selectCardForAdd],
  );

  const handleNoteDragStart = useCallback((e: React.DragEvent<HTMLButtonElement>) => {
    e.dataTransfer.setData('application/duelflow-note', '1');
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

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
        <button
          type="button"
          className={`${styles.card} ${selectedCardId === NOTE_TOOL_ID ? styles.selected : ''}`}
          onClick={() => selectCardForAdd(NOTE_TOOL_ID)}
          draggable
          onDragStart={handleNoteDragStart}
          title="メモ"
          aria-label="メモを選択"
        >
          <div className={styles.imageWrapper}>
            <NoteIcon className={styles.noteIcon} />
          </div>
          <div className={styles.info}>
            <span className={styles.name}>メモ</span>
            <span className={styles.type}>ノート</span>
          </div>
        </button>

        {filteredCards.map((card) => (
          <CardListItem
            key={card.id}
            card={card}
            selected={selectedCardId === card.id}
            onSelect={handleSelectCard}
          />
        ))}
        {filteredCards.length === 0 && (
          <li className={styles.empty}>このデッキにカードが登録されていません</li>
        )}
      </ul>

      {isFormOpen && <CardForm onClose={() => setIsFormOpen(false)} />}
    </div>
  );
});
