import { describe, expect, it } from 'vitest';
import type { ActionNodeData, NoteNodeData } from './types';

describe('types', () => {
  it('ActionNodeData 型が使用できる', () => {
    const data: ActionNodeData = {
      cardName: 'カード',
      actions: ['draw'],
      cardId: 'c1',
      cardType: 'monster',
      description: '',
      relatedCards: [{ cardId: 'c2', role: 'material' }],
    };
    expect(data.cardName).toBe('カード');
  });

  it('NoteNodeData 型が使用できる', () => {
    const data: NoteNodeData = { description: 'メモ' };
    expect(data.description).toBe('メモ');
  });
});
