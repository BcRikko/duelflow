export type CardTypeCategory = 'monster' | 'spell' | 'trap' | 'unknown';

export function detectCardTypeCategory(type: string): CardTypeCategory {
  const normalized = type.toLowerCase().trim();

  if (normalized.includes('モンスター') || normalized.includes('怪獣')) {
    return 'monster';
  }
  if (normalized.includes('魔法') || normalized.includes('スペル') || normalized.includes('spell')) {
    return 'spell';
  }
  if (normalized.includes('罠') || normalized.includes('トラップ') || normalized.includes('trap')) {
    return 'trap';
  }

  return 'unknown';
}

export function getCardTypeLabel(category: CardTypeCategory): string {
  switch (category) {
    case 'monster':
      return 'モンスター';
    case 'spell':
      return '魔法';
    case 'trap':
      return '罠';
    default:
      return 'その他';
  }
}
