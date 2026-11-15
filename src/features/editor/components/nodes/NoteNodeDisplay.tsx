import { memo } from 'react';
import { NodeDeleteButton } from './NodeDeleteButton';
import { NodeHandles } from './NodeHandles';
import styles from './Node.module.css';
import type { NoteNodeData } from './types';

type Props = {
  data: NoteNodeData;
  selected?: boolean;
  onEdit: () => void;
  onDelete: (e: React.MouseEvent) => void;
};

export const NoteNodeDisplay = memo(function NoteNodeDisplay({
  data,
  selected,
  onEdit,
  onDelete,
}: Props) {
  const hasDescription = data.description.trim().length > 0;
  return (
    <div
      className={`${styles.node} ${styles.note} ${selected ? styles.selected : ''}`}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={hasDescription ? `メモ: ${data.description}` : 'メモ'}
    >
      <NodeHandles />
      <div className={styles.noteContent}>
        {!hasDescription && <span className={styles.noteLabel}>メモ</span>}
        <p className={styles.noteText}>{data.description}</p>
      </div>
      <NodeDeleteButton onClick={onDelete} />
    </div>
  );
});
