import { Panel, useNodes } from '@xyflow/react';
import {
  AlignHorizontalCenterIcon,
  AlignVerticalCenterIcon,
  DistributeHorizontalIcon,
  DistributeVerticalIcon,
} from '../../../../components/icons';
import { useComboStore } from '../../store/comboStore';
import { getSelectedStepIds } from '../../store/types';
import {
  alignCenterX,
  alignCenterY,
  distributeHorizontally,
  distributeVertically,
} from './nodeAlignment';
import styles from './SelectionToolbar.module.css';

function useSelectedNodes() {
  const selection = useComboStore((state) => state.selection);
  const nodes = useNodes();
  const selectedIds = new Set(getSelectedStepIds(selection));
  return nodes.filter((node) => selectedIds.has(node.id));
}

function toAlignableNodes(nodes: ReturnType<typeof useNodes>) {
  return nodes.map((node) => ({
    id: node.id,
    position: node.position,
    width: node.measured?.width ?? node.width ?? 240,
    height: node.measured?.height ?? node.height ?? 80,
  }));
}

export function SelectionToolbar() {
  const selectedNodes = useSelectedNodes();
  const updateStepPositions = useComboStore((state) => state.updateStepPositions);

  if (selectedNodes.length < 2) return null;

  const alignable = toAlignableNodes(selectedNodes);

  const applyPositions = (positions: Map<string, { x: number; y: number }>) => {
    if (positions.size === 0) return;
    const updates = Array.from(positions.entries()).map(([stepId, position]) => ({
      stepId,
      position,
    }));
    updateStepPositions(updates);
  };

  const canDistribute = selectedNodes.length >= 3;

  return (
    <Panel position="top-center" className={styles.toolbar}>
      <button
        type="button"
        className={styles.button}
        title="上下中央揃え"
        aria-label="上下中央揃え"
        onClick={() => applyPositions(alignCenterY(alignable))}
      >
        <AlignVerticalCenterIcon className={styles.icon} />
      </button>
      <button
        type="button"
        className={styles.button}
        title="左右中央揃え"
        aria-label="左右中央揃え"
        onClick={() => applyPositions(alignCenterX(alignable))}
      >
        <AlignHorizontalCenterIcon className={styles.icon} />
      </button>
      <button
        type="button"
        className={styles.button}
        title="左右に均等割り付け"
        aria-label="左右に均等割り付け"
        disabled={!canDistribute}
        onClick={() => applyPositions(distributeHorizontally(alignable))}
      >
        <DistributeHorizontalIcon className={styles.icon} />
      </button>
      <button
        type="button"
        className={styles.button}
        title="上下に均等割り付け"
        aria-label="上下に均等割り付け"
        disabled={!canDistribute}
        onClick={() => applyPositions(distributeVertically(alignable))}
      >
        <DistributeVerticalIcon className={styles.icon} />
      </button>
    </Panel>
  );
}
