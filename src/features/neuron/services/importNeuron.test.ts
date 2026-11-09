import { describe, expect, it } from 'vitest';
import { convertNeuronToComboDocument, parseNeuronDeck } from './importNeuron';

function createNeuronData() {
  return {
    deck: {
      id: 'neuron_deck_1',
      name: 'ニューロンデッキ',
      main: [
        { id: 'card_1', name: 'カードA', quantity: 2, imageUrl: 'http://example.com/a.jpg' },
      ],
      ex: [{ id: 'card_2', name: 'カードB', quantity: 1, imageUrl: '' }],
      side: [{ id: 'card_3', name: 'カードC', quantity: 3, imageUrl: '' }],
    },
  };
}

describe('parseNeuronDeck', () => {
  it('有効なニューロンデッキデータを解析する', () => {
    const data = createNeuronData();
    const parsed = parseNeuronDeck(data);
    expect(parsed.deck.name).toBe('ニューロンデッキ');
    expect(parsed.deck.main).toHaveLength(1);
  });

  it('無効なデータを解析するとエラーになる', () => {
    expect(() => parseNeuronDeck({})).toThrow();
    expect(() => parseNeuronDeck(null)).toThrow();
    expect(() => parseNeuronDeck('not json object')).toThrow();
  });

  it('quantity が 0 以下のカードは無効', () => {
    const data = createNeuronData();
    data.deck.main[0].quantity = 0;
    expect(() => parseNeuronDeck(data)).toThrow();
  });
});

describe('convertNeuronToComboDocument', () => {
  it('ComboDocument 形式に変換する', () => {
    const data = createNeuronData();
    const doc = convertNeuronToComboDocument(data);
    expect(doc.schemaVersion).toBe(2);
    expect(doc.deck.name).toBe('ニューロンデッキ');
    expect(doc.deck.source.type).toBe('neuron');
    expect(doc.cardCatalog).toHaveLength(3);
  });

  it('同じカードIDはカタログに1つだけ登録する', () => {
    const data = createNeuronData();
    data.deck.main.push({ ...data.deck.main[0] });
    const doc = convertNeuronToComboDocument(data);
    expect(doc.cardCatalog.filter((c) => c.id === 'card_1')).toHaveLength(1);
  });

  it('セクションを正しく分類する', () => {
    const data = createNeuronData();
    const doc = convertNeuronToComboDocument(data);
    expect(doc.deck.cards[0].section).toBe('main');
    expect(doc.deck.cards[1].section).toBe('extra');
    expect(doc.deck.cards[2].section).toBe('side');
  });

  it('deck.id が空の場合は新規IDを生成する', () => {
    const data = createNeuronData();
    data.deck.id = '';
    const doc = convertNeuronToComboDocument(data);
    expect(doc.deck.id.startsWith('deck_')).toBe(true);
  });
});
