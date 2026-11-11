import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { actionDefinitions } from '../../../../shared/actionDefinitions';
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
  const cards = useComboStore((state) => state.cards);
  const nodeRef = useRef<HTMLDivElement>(null);

  const [draft, setDraft] = useState({
    actions: data.actions,
    cardId: data.cardId,
    description: data.description ?? '',
    relatedCards: data.relatedCards,
  });

  const save = useCallback(() => {
    updateStep(id, {
      actions: draft.actions,
      cardId: draft.cardId,
      description: draft.description || undefined,
      relatedCards: draft.relatedCards,
    });
    onSaved();
  }, [draft, id, onSaved, updateStep]);

  useEffect(() => {
    setNodeEditing(true);
    return () => setNodeEditing(false);
  }, [setNodeEditing]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (nodeRef.current && !nodeRef.current.contains(e.target as Node)) {
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
      return { ...prev, actions };
    });
  }, []);
  const updateCardId = useCallback(
    (cardId: string) => setDraft((prev) => ({ ...prev, cardId })),
    [],
  );
  const updateDescription = useCallback(
    (description: string) => setDraft((prev) => ({ ...prev, description })),
    [],
  );

  const addRelatedCard = useCallback(() => {
    setDraft((prev) => ({
      ...prev,
      relatedCards: [
        ...prev.relatedCards,
        { cardId: cards[0]?.id ?? '', role: 'source' as StepCardRole },
      ],
    }));
  }, [cards]);

  const updateRelatedCard = useCallback(
    (index: number, cardId?: string, role?: StepCardRole) => {
      setDraft((prev) => {
        const updated = [...prev.relatedCards];
        if (cardId !== undefined) updated[index] = { ...updated[index], cardId };
        if (role !== undefined) updated[index] = { ...updated[index], role };
        return { ...prev, relatedCards: updated };
      });
    },
    [],
  );

  const removeRelatedCard = useCallback((index: number) => {
    setDraft((prev) => ({
      ...prev,
      relatedCards: prev.relatedCards.filter((_, i) => i !== index),
    }));
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
        <select
          className={styles.editSelect}
          value={draft.cardId}
          onChange={(e) => updateCardId(e.target.value)}
        >
          {cards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.name}
            </option>
          ))}
        </select>
        <textarea
          className={styles.editTextarea}
          value={draft.description}
          onChange={(e) => updateDescription(e.target.value)}
          placeholder="説明・メモ"
          rows={2}
        />
        <div className={styles.relatedCardsCompact}>
          {draft.relatedCards.map((related, index) => (
            <div key={index} className={styles.relatedCardRowCompact}>
              <select
                className={styles.editRoleSelect}
                value={related.role}
                onChange={(e) => updateRelatedCard(index, undefined, e.target.value as StepCardRole)}
              >
                <option value="source">起点</option>
                <option value="target">対象</option>
                <option value="material">素材</option>
                <option value="result">結果</option>
              </select>
              <select
                className={styles.editCardSelect}
                value={related.cardId}
                onChange={(e) => updateRelatedCard(index, e.target.value)}
              >
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
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
          {cards.length > 0 ? (
            <button type="button" className={styles.editAddButton} onClick={addRelatedCard}>
              + 関連カード
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
});
