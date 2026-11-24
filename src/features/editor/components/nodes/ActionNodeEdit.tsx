import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { actionDefinitions } from '../../../../shared/actionDefinitions';
import { stepCardRoleLabels } from '../../../combo/model/schema';
import type { StepCardRole } from '../../../combo/model/types';
import { useComboStore } from '../../store/comboStore';
import { NodeHandles } from './NodeHandles';
import { getTypeClass } from './nodeStyles';
import styles from './Node.module.css';
import type { ActionNodeData } from './types';

type Props = {
  id: string;
  data: ActionNodeData;
  selected?: boolean;
  onSaved: () => void;
};

export const ActionNodeEdit = memo(function ActionNodeEdit({ id, data, selected, onSaved }: Props) {
  const updateStep = useComboStore((state) => state.updateStep);
  const setNodeEditing = useComboStore((state) => state.setNodeEditing);
  const currentDeck = useComboStore((state) => state.currentDeck);
  const cards = useComboStore((state) => state.cards);
  const deckCardIds = useMemo(
    () => new Set(currentDeck?.cards.map((entry) => entry.cardId) ?? []),
    [currentDeck],
  );
  const cardNames = useMemo(
    () =>
      Object.fromEntries(
        cards.filter((card) => deckCardIds.has(card.id)).map((card) => [card.id, card.name]),
      ),
    [cards, deckCardIds],
  );
  const nodeRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [draft, setDraft] = useState({
    actions: data.actions,
    cardId: data.cardId,
    description: data.description ?? '',
    relatedCards: data.relatedCards,
  });
  const draftRef = useRef(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const save = useCallback(() => {
    const current = draftRef.current;
    updateStep(id, {
      actions: current.actions,
      cardId: current.cardId,
      description: current.description || undefined,
      relatedCards: current.relatedCards,
    });
    onSaved();
  }, [id, onSaved, updateStep]);

  useEffect(() => {
    setNodeEditing(true);
    return () => setNodeEditing(false);
  }, [setNodeEditing]);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [draft.description]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      // 選択肢をクリックしたときに未保存の変更が確定してしまうのを防ぐ
      if (target.closest?.('select, option, optgroup')) return;
      if (nodeRef.current && !nodeRef.current.contains(target)) {
        save();
      }
    };
    document.addEventListener('mousedown', handleMouseDown, true);
    return () => document.removeEventListener('mousedown', handleMouseDown, true);
  }, [save]);

  const toggleAction = useCallback((action: string) => {
    setDraft((prev) => {
      const actions = prev.actions.includes(action)
        ? prev.actions.filter((a) => a !== action)
        : [...prev.actions, action];
      const next = { ...prev, actions };
      draftRef.current = next;
      return next;
    });
  }, []);
  const updateDescription = useCallback((description: string) => {
    setDraft((prev) => {
      const next = { ...prev, description };
      draftRef.current = next;
      return next;
    });
  }, []);

  const addRelatedCard = useCallback(() => {
    setDraft((prev) => {
      const firstCardId = Object.keys(cardNames)[0] ?? '';
      const next = {
        ...prev,
        relatedCards: [
          ...prev.relatedCards,
          { cardId: firstCardId, role: 'cost' as StepCardRole },
        ],
      };
      draftRef.current = next;
      return next;
    });
  }, [cardNames]);

  const updateRelatedCard = useCallback(
    (index: number, cardId?: string, role?: StepCardRole) => {
      setDraft((prev) => {
        const updated = [...prev.relatedCards];
        if (cardId !== undefined) updated[index] = { ...updated[index], cardId };
        if (role !== undefined) updated[index] = { ...updated[index], role };
        const next = { ...prev, relatedCards: updated };
        draftRef.current = next;
        return next;
      });
    },
    [],
  );

  const removeRelatedCard = useCallback((index: number) => {
    setDraft((prev) => {
      const next = {
        ...prev,
        relatedCards: prev.relatedCards.filter((_, i) => i !== index),
      };
      draftRef.current = next;
      return next;
    });
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);
  const handleWheel = useCallback((e: React.WheelEvent) => e.stopPropagation(), []);

  return (
    <div
      ref={nodeRef}
      className={`${styles.node} ${styles.action} ${getTypeClass(data.cardType)} ${selected ? styles.selected : ''} ${styles.editing}`}
      onClick={handleClick}
      onWheel={handleWheel}
    >
      <NodeHandles />
      <div className={styles.editForm}>
        <div className={styles.editCardName}>{data.cardName}</div>
        <fieldset className={styles.actionFieldset}>
          <legend>アクション</legend>
          <div className={styles.actionCheckboxList}>
            {actionDefinitions.map((action) => (
              <label key={action.id} className={styles.actionCheckboxLabel}>
                <input
                  type="checkbox"
                  checked={draft.actions.includes(action.id)}
                  onChange={() => toggleAction(action.id)}
                  autoFocus={action.id === actionDefinitions[0]?.id}
                />
                {action.label}
              </label>
            ))}
          </div>
        </fieldset>
        <textarea
          ref={textareaRef}
          className={styles.editTextarea}
          value={draft.description}
          onChange={(e) => updateDescription(e.target.value)}
          placeholder="説明・メモ"
          rows={1}
        />
        <div className={styles.relatedCardsCompact}>
          {draft.relatedCards.map((related, index) => (
            <div key={index} className={styles.relatedCardRowCompact}>
              <select
                className={styles.editRoleSelect}
                value={related.role}
                onChange={(e) => updateRelatedCard(index, undefined, e.target.value as StepCardRole)}
              >
                {Object.entries(stepCardRoleLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                className={styles.editCardSelect}
                value={related.cardId}
                onChange={(e) => updateRelatedCard(index, e.target.value)}
              >
                {Object.entries(cardNames).map(([cardId, name]) => (
                  <option key={cardId} value={cardId}>
                    {name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles.editRemoveButton}
                onClick={() => removeRelatedCard(index)}
                title="削除"
              >
                ×
              </button>
            </div>
          ))}
          {Object.keys(cardNames).length > 0 ? (
            <button type="button" className={styles.editAddButton} onClick={addRelatedCard}>
              + 関連カード
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
});
