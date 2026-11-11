import { describe, expect, it } from 'vitest';
import type { ComboDocument } from './types';

describe('types', () => {
  it('型定義がエクスポートされている', () => {
    const doc: ComboDocument = {
      schemaVersion: 0,
      deck: {
        id: 'deck_1',
        name: 'test',
        source: { type: 'neuron', deckCode: '' },
        cards: [],
      },
      cardCatalog: [],
      routes: [],
    };
    expect(doc.schemaVersion).toBe(0);
  });
});
