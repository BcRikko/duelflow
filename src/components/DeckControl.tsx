import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon, PlusIcon } from './icons';
import { NeuronImportDialog } from '../features/neuron/components/NeuronImportDialog';
import { useComboStore } from '../features/editor/store/comboStore';
import styles from './Header.module.css';

export function DeckControl() {
  const decks = useComboStore((state) => state.decks);
  const currentDeck = useComboStore((state) => state.currentDeck);
  const selectDeck = useComboStore((state) => state.selectDeck);
  const deleteDeck = useComboStore((state) => state.deleteDeck);
  const renameDeck = useComboStore((state) => state.renameDeck);

  const [isOpen, setIsOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (deckId: string) => {
    void selectDeck(deckId);
    setIsOpen(false);
  };

  const handleRename = (deckId: string, currentName: string) => {
    const value = window.prompt('デッキ名を入力してください', currentName);
    if (value == null) return;
    const trimmed = value.trim();
    if (!trimmed) return;

    renameDeck(deckId, trimmed);
  };

  const handleDelete = (deckId: string, name: string) => {
    const confirmed = window.confirm(
      `デッキ「${name}」を削除しますか？この操作は元に戻せません。`,
    );
    if (confirmed) {
      void deleteDeck(deckId);
    }
  };

  const handleOpenImport = () => {
    setIsOpen(false);
    setIsImportDialogOpen(true);
  };

  if (decks.length === 0) {
    return (
      <div className={styles.deckControl}>
        <button
          type="button"
          className={`${styles.deckButton} ${styles.addDeckButton}`}
          onClick={handleOpenImport}
        >
          <PlusIcon className={styles.addDeckIcon} />
          デッキを追加
        </button>
        {isImportDialogOpen ? (
          <NeuronImportDialog onClose={() => setIsImportDialogOpen(false)} />
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.deckControl} ref={containerRef}>
      <button
        type="button"
        className={styles.deckButton}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className={styles.deckName}>{currentDeck?.name ?? 'デッキなし'}</span>
        <ChevronDownIcon className={styles.chevron} />
      </button>

      {isOpen && (
        <div className={styles.deckPanel}>
          <button
            type="button"
            className={styles.addDeckButton}
            onClick={handleOpenImport}
          >
            <PlusIcon className={styles.addDeckIcon} />
            デッキを追加
          </button>

          <div className={styles.divider} />

          <ul className={styles.deckList}>
            {decks.map((deck) => {
              const isCurrent = deck.deckId === currentDeck?.deckId;
              return (
                <li
                  key={deck.deckId}
                  className={`${styles.deckRow} ${isCurrent ? styles.deckRowActive : ''}`}
                >
                  <button
                    type="button"
                    className={styles.deckRowName}
                    onClick={() => handleSelect(deck.deckId)}
                    title={deck.name}
                  >
                    {deck.name}
                  </button>
                  <div className={styles.deckRowActions}>
                    <button
                      type="button"
                      className={styles.deckRowAction}
                      onClick={() => handleRename(deck.deckId, deck.name)}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      className={`${styles.deckRowAction} ${styles.dangerAction}`}
                      onClick={() => handleDelete(deck.deckId, deck.name)}
                    >
                      削除
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {isImportDialogOpen ? (
        <NeuronImportDialog onClose={() => setIsImportDialogOpen(false)} />
      ) : null}
    </div>
  );
}
