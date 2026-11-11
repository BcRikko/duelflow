import { memo } from 'react';
import { getActionLabels } from '../../../../shared/actionDefinitions';
import type { StepCardRole } from '../../../combo/model/types';
import { useCardImageUrl } from '../../../../shared/useCardImageUrl';
import { useComboStore } from '../../store/comboStore';
import { NodeDeleteButton } from './NodeDeleteButton';
import { NodeHandles } from './NodeHandles';
import { getTypeClass } from './nodeStyles';
import styles from './Node.module.css';
import type { ActionNodeData } from './types';

const roleLabels: Record<StepCardRole, string> = {
  source: '起点',
  target: '対象',
  material: '素材',
  result: '結果',
};

type Props = {
  data: ActionNodeData;
  selected?: boolean;
  onEdit: () => void;
  onDelete: (e: React.MouseEvent) => void;
};

function ActionNodeImage({ data }: { data: ActionNodeData }) {
  const localImageUrl = useCardImageUrl(data.cardId, data.cardName);
  const src = localImageUrl || data.imageUrl;

  if (src) {
    return <img src={src} alt={data.cardName} className={styles.image} />;
  }

  return <div className={styles.placeholder}>{data.cardName.charAt(0)}</div>;
}

export const ActionNodeDisplay = memo(function ActionNodeDisplay({
  data,
  selected,
  onEdit,
  onDelete,
}: Props) {
  const cards = useComboStore((state) => state.cards);

  return (
    <div
      className={`${styles.node} ${styles.action} ${getTypeClass(data.cardType)} ${selected ? styles.selected : ''}`}
      onClick={onEdit}
    >
      <NodeHandles />
      <div className={styles.content}>
        <div className={styles.mainInfo}>
          <ActionNodeImage data={data} />
          <div className={styles.info}>
            <div className={styles.actionLabel}>{getActionLabels(data.actions ?? [])}</div>
            <div className={styles.cardName}>{data.cardName}</div>
            {data.description ? <div className={styles.description}>{data.description}</div> : null}
          </div>
        </div>
        {data.relatedCards.length > 0 ? (
          <div className={styles.relatedCardsList}>
            {data.relatedCards.map((related, index) => {
              const card = cards.find((c) => c.id === related.cardId);
              return (
                <span key={index} className={styles.relatedCardItem}>
                  <span className={styles.relatedCardRole}>{roleLabels[related.role]}</span>
                  {card?.name ?? related.cardId}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
      <NodeDeleteButton onClick={onDelete} />
    </div>
  );
});
