import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import { memo } from 'react';
import { useComboStore } from '../../store/comboStore';
import styles from './Edge.module.css';

export const EditableEdge = memo(function EditableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  selected,
  style,
}: EdgeProps) {
  const deleteConnection = useComboStore((state) => state.deleteConnection);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConnection(id);
  };

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} />
      <EdgeLabelRenderer>
        <div
          className={`${styles.edgeLabelContainer} ${selected ? styles.selected : ''}`}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          {label && <div className={styles.edgeLabel}>{label}</div>}
          {selected && (
            <button
              type="button"
              className={`${styles.edgeDeleteButton} nodrag nopan`}
              onClick={handleDelete}
              onMouseDown={(e) => e.stopPropagation()}
              title="接続線を削除"
              aria-label="接続線を削除"
            >
              ×
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
