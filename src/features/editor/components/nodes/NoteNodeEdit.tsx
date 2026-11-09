import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useComboStore } from '../../store/comboStore';
import { NodeDeleteButton } from './NodeDeleteButton';
import { NodeHandles } from './NodeHandles';
import styles from './Node.module.css';
import type { NoteNodeData } from './types';

type Props = {
  id: string;
  data: NoteNodeData;
  selected?: boolean;
  onSaved: () => void;
  onDelete: (e: React.MouseEvent) => void;
};

export const NoteNodeEdit = memo(function NoteNodeEdit({
  id,
  data,
  selected,
  onSaved,
  onDelete,
}: Props) {
  const updateStep = useComboStore((state) => state.updateStep);
  const setNodeEditing = useComboStore((state) => state.setNodeEditing);
  const nodeRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(data.description);

  const save = useCallback(() => {
    updateStep(id, { description: draft });
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

  const handleClick = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);
  const handleWheel = useCallback((e: React.WheelEvent) => e.stopPropagation(), []);

  return (
    <div
      ref={nodeRef}
      className={`${styles.node} ${styles.note} ${selected ? styles.selected : ''} ${styles.editing}`}
      onClick={handleClick}
      onWheel={handleWheel}
    >
      <NodeHandles />
      <div className={styles.editForm}>
        <textarea
          className={styles.editTextarea}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="メモ内容"
          rows={3}
          autoFocus
        />
      </div>
      <NodeDeleteButton onClick={onDelete} />
    </div>
  );
});
