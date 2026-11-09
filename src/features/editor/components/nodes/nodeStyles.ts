import styles from './Node.module.css';

export function getTypeClass(cardType: string): string {
  if (cardType === 'monster') return styles.monster;
  if (cardType === 'spell') return styles.spell;
  if (cardType === 'trap') return styles.trap;
  return styles.unknownType;
}
