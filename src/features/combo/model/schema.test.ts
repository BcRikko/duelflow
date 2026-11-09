import { describe, expect, it } from 'vitest';
import { validateComboDocument } from './schema';

function createValidDocument() {
  return {
    schemaVersion: 1,
    deck: {
      id: 'deck_1',
      name: 'テストデッキ',
      source: { type: 'neuron' as const, deckCode: '' },
      cards: [{ cardId: 'card_1', quantity: 1, section: 'main' as const }],
    },
    cardCatalog: [
      { id: 'card_1', name: 'テストカード', imageUrl: '', type: 'monster' },
    ],
    routes: [
      {
        id: 'route_1',
        name: 'テストルート',
        description: '',
        startingCardIds: ['card_1'],
        steps: [
          {
            id: 'step_1',
            type: 'action' as const,
            actions: ['normalSummon'],
            cardId: 'card_1',
            relatedCards: [],
            description: '',
            position: { x: 0, y: 0 },
          },
        ],
        connections: [],
        result: { cardIds: ['card_1'], description: '' },
      },
    ],
  };
}

describe('validateComboDocument', () => {
  it('有効なドキュメントを検証する', () => {
    const doc = createValidDocument();
    expect(() => validateComboDocument(doc)).not.toThrow();
  });

  it('必須フィールドが欠けているとエラーになる', () => {
    const doc = { schemaVersion: 2 };
    expect(() => validateComboDocument(doc)).toThrow();
  });

  it('重複したカードIDを検出する', () => {
    const doc = createValidDocument();
    doc.cardCatalog.push({ id: 'card_1', name: '重複', imageUrl: '', type: 'monster' });
    expect(() => validateComboDocument(doc)).toThrow('重複したID');
  });

  it('重複したルートIDを検出する', () => {
    const doc = createValidDocument();
    doc.routes.push({ ...doc.routes[0] });
    expect(() => validateComboDocument(doc)).toThrow('重複したID');
  });

  it('存在しない初動カードを検出する', () => {
    const doc = createValidDocument();
    doc.routes[0].startingCardIds.push('card_missing');
    expect(() => validateComboDocument(doc)).toThrow('初動カード');
  });

  it('存在しない接続元ノードを検出する', () => {
    const doc = createValidDocument();
    doc.routes[0].connections.push({ id: 'conn_1', source: 'missing', target: 'step_1' });
    expect(() => validateComboDocument(doc)).toThrow('接続元ノード');
  });

  it('存在しない接続先ノードを検出する', () => {
    const doc = createValidDocument();
    doc.routes[0].connections.push({ id: 'conn_1', source: 'step_1', target: 'missing' });
    expect(() => validateComboDocument(doc)).toThrow('接続先ノード');
  });

  it('存在しないアクションカードを検出する', () => {
    const doc = createValidDocument();
    doc.routes[0].steps[0].cardId = 'card_missing';
    expect(() => validateComboDocument(doc)).toThrow('カタログに存在しないカード');
  });

  it('存在しない関連カードを検出する', () => {
    const doc = createValidDocument();
    doc.routes[0].steps[0].relatedCards.push({ cardId: 'card_missing', role: 'source' });
    expect(() => validateComboDocument(doc)).toThrow('関連カード');
  });

  it('存在しない最終盤面カードを検出する', () => {
    const doc = createValidDocument();
    doc.routes[0].result.cardIds.push('card_missing');
    expect(() => validateComboDocument(doc)).toThrow('最終盤面');
  });

  it('メモノードも有効として検証する', () => {
    const doc = createValidDocument();
    doc.routes[0].steps.push({
      id: 'step_2',
      type: 'note',
      description: 'メモ',
      position: { x: 0, y: 0 },
    });
    expect(() => validateComboDocument(doc)).not.toThrow();
  });
});
