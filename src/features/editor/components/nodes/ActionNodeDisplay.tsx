import { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getActionLabels } from '../../../../shared/actionDefinitions';
import { stepCardRoleLabels } from '../../../combo/model/schema';
import type { StepCardRole } from '../../../combo/model/types';
import { useCardImageUrl } from '../../../../shared/useCardImageUrl';
import { useComboStore } from '../../store/comboStore';
import { NodeDeleteButton } from './NodeDeleteButton';
import { NodeHandles } from './NodeHandles';
import { getTypeClass } from './nodeStyles';
import styles from './Node.module.css';
import type { ActionNodeData } from './types';

const roleLabels: Record<StepCardRole, string> = stepCardRoleLabels;

const TOOLTIP_HIDE_DELAY = 250;

type TooltipPosition = {
  top: number;
  left: number;
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

type ParsedCardDescription = {
  attribute?: string;
  level?: string;
  species: string[];
  atk?: string;
  def?: string;
  effect: string;
};

function formatEffectText(effect: string): string {
  return effect
    .replace(/\s+/g, ' ')
    .replace(/([\u2460-\u2473][：:]|●)/g, '\n$1')
    .replace(/。(?!\s|$)/g, '。\n')
    .replace(/\n+/g, '\n')
    .trim();
}

function parseStructuredDescription(description: string): ParsedCardDescription {
  const separatorIndex = description.indexOf('\n\n');
  const specPart = separatorIndex === -1 ? '' : description.slice(0, separatorIndex).trim();
  const effect = separatorIndex === -1 ? description.trim() : description.slice(separatorIndex + 2).trim();

  const result: ParsedCardDescription = { species: [], effect };
  const tokens = specPart.split(' / ').map((token) => token.trim()).filter(Boolean);

  for (const token of tokens) {
    const isOpenBracket = token.startsWith('[') || token.startsWith('【');
    const isCloseBracket = token.endsWith(']') || token.endsWith('】');
    if (isOpenBracket && isCloseBracket) {
      const inner = token.slice(1, -1).trim();
      result.species = inner.split(/\/|／/).map((item) => item.trim()).filter(Boolean);
      continue;
    }

    const levelMatch = token.match(/^(Level|Rank|レベル|ランク)\s*(\d+)$/i);
    if (levelMatch) {
      result.level = `${levelMatch[1]} ${levelMatch[2]}`;
      continue;
    }

    const atkMatch = token.match(/^(ATK|攻撃力)\s*(\S+)$/i);
    if (atkMatch) {
      result.atk = atkMatch[2];
      continue;
    }

    const defMatch = token.match(/^(DEF|守備力)\s*(\S+)$/i);
    if (defMatch) {
      result.def = defMatch[2];
      continue;
    }

    result.attribute = token;
  }

  return result;
}

function SpecTable({ parsed }: { parsed: ParsedCardDescription }) {
  const hasAny =
    parsed.attribute || parsed.level || parsed.species.length > 0 || parsed.atk || parsed.def;
  if (!hasAny) return null;

  return (
    <table className={styles.tooltipSpecsTable}>
      <tbody>
        {parsed.attribute ? (
          <tr>
            <th>属性</th>
            <td>{parsed.attribute}</td>
          </tr>
        ) : null}
        {parsed.level ? (
          <tr>
            <th>レベル/ランク</th>
            <td>{parsed.level}</td>
          </tr>
        ) : null}
        {parsed.species.length > 0 ? (
          <tr>
            <th>種族/タイプ</th>
            <td>{parsed.species.join(' / ')}</td>
          </tr>
        ) : null}
        {parsed.atk || parsed.def ? (
          <tr>
            <th>攻撃力/守備力</th>
            <td>{[parsed.atk, parsed.def].filter(Boolean).join(' / ')}</td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}

function CardDescriptionTooltip({
  name,
  description,
  position,
  onMouseEnter,
  onMouseLeave,
}: {
  name: string;
  description: string;
  position: TooltipPosition;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const parsed = parseStructuredDescription(description);

  return createPortal(
    <div
      className={styles.cardTooltipPortal}
      style={{ top: position.top, left: position.left }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={styles.cardTooltipContent}>
        <div className={styles.tooltipHeader}>{name}</div>
        <SpecTable parsed={parsed} />
        {parsed.effect ? <div className={styles.tooltipDivider} /> : null}
        {parsed.effect ? (
          <div className={styles.tooltipEffect}>{formatEffectText(parsed.effect)}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export const ActionNodeDisplay = memo(function ActionNodeDisplay({
  data,
  selected,
  onEdit,
  onDelete,
}: Props) {
  const cards = useComboStore((state) => state.cards);
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const scheduleHide = () => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setIsTooltipVisible(false);
      setTooltipPosition(null);
    }, TOOLTIP_HIDE_DELAY);
  };

  const showTooltip = () => {
    clearHideTimer();
    if (!data.cardDescription || !nodeRef.current) return;
    const rect = nodeRef.current.getBoundingClientRect();
    setTooltipPosition({
      top: rect.top,
      left: rect.right + 8,
    });
    setIsTooltipVisible(true);
  };

  useEffect(() => {
    return () => clearHideTimer();
  }, []);

  return (
    <div
      ref={nodeRef}
      className={`${styles.node} ${styles.action} ${getTypeClass(data.cardType)} ${selected ? styles.selected : ''}`}
      onClick={onEdit}
      onMouseEnter={showTooltip}
      onMouseLeave={scheduleHide}
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
      {isTooltipVisible && tooltipPosition ? (
        <CardDescriptionTooltip
          name={data.cardName}
          description={data.cardDescription ?? ''}
          position={tooltipPosition}
          onMouseEnter={clearHideTimer}
          onMouseLeave={scheduleHide}
        />
      ) : null}
    </div>
  );
});
