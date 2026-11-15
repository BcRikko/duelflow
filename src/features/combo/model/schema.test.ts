import { describe, expect, it } from 'vitest';
import { validateComboDocument, validateDeckRecord } from './schema';

function createValidDocument() {
  return {
    schemaVersion: 0,
    deck: {
      id: 'deck_1',
      name: 'テストデッキ',
      source: { type: 'neuron' as const, deckCode: '' },
      cards: [{ cardId: 'card_1', quantity: 1, section: 'main' as const }],
    },
    cardCatalog: [{ id: 'card_1', name: 'テストカード', type: 'monster' }],
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
    const doc = { schemaVersion: 0 };
    expect(() => validateComboDocument(doc)).toThrow();
  });

  it('重複したカードIDを検出する', () => {
    const doc = createValidDocument();
    doc.cardCatalog.push({ id: 'card_1', name: '重複', type: 'monster' });
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
    doc.routes[0].steps[0].relatedCards.push({ cardId: 'card_missing', role: 'cost' });
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

  it('無効な schemaVersion を拒否する', () => {
    const doc = createValidDocument();
    (doc as { schemaVersion: unknown }).schemaVersion = '1';
    expect(() => validateComboDocument(doc)).toThrow();
  });
});

function createValidDeckRecord() {
  return {
    schemaVersion: 0,
    deckId: 'deck_1',
    name: 'テストデッキ',
    source: { type: 'neuron' as const, deckCode: '' },
    cards: [{ cardId: 'card_1', quantity: 1, section: 'main' as const }],
    route: {
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
  };
}

describe('validateDeckRecord', () => {
  it('有効なレコードを検証する', () => {
    const record = createValidDeckRecord();
    expect(() => validateDeckRecord(record)).not.toThrow();
  });

  it('旧 role 値を新しい値に移行する', () => {
    const record = createValidDeckRecord();
    record.route.steps[0].relatedCards.push({ cardId: 'card_1', role: 'source' as const });
    const result = validateDeckRecord(record);
    expect(result.route.steps[0].relatedCards[0]?.role).toBe('cost');
  });

  it('存在しないアクションカードを検出する', () => {
    const record = createValidDeckRecord();
    record.route.steps[0].cardId = 'card_missing';
    expect(() => validateDeckRecord(record)).toThrow('カタログに存在しないカード');
  });

  it('存在しない関連カードを検出する', () => {
    const record = createValidDeckRecord();
    record.route.steps[0].relatedCards.push({ cardId: 'card_missing', role: 'cost' });
    expect(() => validateDeckRecord(record)).toThrow('関連カード');
  });

  it('過度に深いネストを拒否する', () => {
    const record = createValidDeckRecord();
    let nested: Record<string, unknown> = { extra: 'value' };
    for (let i = 0; i < 200; i++) {
      const next: Record<string, unknown> = { child: nested };
      nested = next;
    }
    const recordWithExtra = { ...record, extra: nested };
    expect(() => validateDeckRecord(recordWithExtra)).toThrow('深すぎ');
  });
});
