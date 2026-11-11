import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAll,
  deleteCard,
  deleteDeck,
  getAllCards,
  getAllDecks,
  getCard,
  getCardByName,
  getDeck,
  saveCard,
  saveDeck,
} from './cardDatabase';

function createJpegFile(name: string): File {
  const content = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  return new File([content], name);
}

describe('cardDatabase', () => {
  beforeEach(async () => {
    await clearAll();
  });

  it('カードを保存・取得する', async () => {
    await saveCard('card_1', 'ブラック・マジシャン', '魔法使い族');
    const record = await getCard('card_1');
    expect(record).not.toBeNull();
    expect(record?.name).toBe('ブラック・マジシャン');
    expect(record?.type).toBe('魔法使い族');
  });

  it('画像付きカードを保存する', async () => {
    const file = createJpegFile('image.jpg');
    await saveCard('card_1', 'カードA', 'モンスター', file);
    const record = await getCard('card_1');
    expect(record?.imageBlob).not.toBeNull();
    expect(record?.imageType).toBe('image/jpeg');
  });

  it('カード名で検索する', async () => {
    await saveCard('card_1', 'カードA', 'モンスター');
    const record = await getCardByName('カードA');
    expect(record?.cardId).toBe('card_1');
  });

  it('カードを削除する', async () => {
    await saveCard('card_1', 'カードA', 'モンスター');
    await deleteCard('card_1');
    expect(await getCard('card_1')).toBeNull();
  });

  it('デッキを保存・取得する', async () => {
    const deck = {
      deckId: 'deck_1',
      name: 'Test Deck',
      source: { type: 'neuron' as const, deckCode: '' },
      cards: [],
      routes: [],
      currentRouteId: null,
    };
    await saveDeck(deck);
    const saved = await getDeck('deck_1');
    expect(saved?.name).toBe('Test Deck');
  });

  it('すべてのカードとデッキをクリアする', async () => {
    await saveCard('card_1', 'カードA', 'モンスター');
    await saveDeck({
      deckId: 'deck_1',
      name: 'Test',
      source: { type: 'neuron', deckCode: '' },
      cards: [],
      routes: [],
      currentRouteId: null,
    });
    await clearAll();
    expect(await getAllCards()).toHaveLength(0);
    expect(await getAllDecks()).toHaveLength(0);
  });

  it('存在しないデッキを削除してもエラーにならない', async () => {
    await expect(deleteDeck('missing')).resolves.toBeUndefined();
  });
});
