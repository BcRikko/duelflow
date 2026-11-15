import type { Page } from '@playwright/test';

export const TEST_CARD_ID = 'vrt_card_1';
export const TEST_DECK_ID = 'vrt_deck_1';
export const TEST_STEP_ID = 'vrt_step_1';

export async function clearTestData(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('duelflow');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
    localStorage.removeItem('duelflow-ui-v0');
  });
}

export async function seedTestData(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('duelflow');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });

  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('duelflow', 4);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('cards')) {
          const store = database.createObjectStore('cards', { keyPath: 'cardId' });
          store.createIndex('name', 'name', { unique: false });
        }
        if (!database.objectStoreNames.contains('decks')) {
          database.createObjectStore('decks', { keyPath: 'deckId' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const transaction = db.transaction(['cards', 'decks'], 'readwrite');
    const cardStore = transaction.objectStore('cards');
    const deckStore = transaction.objectStore('decks');

    cardStore.put({
      cardId: 'vrt_card_1',
      name: 'VRT テストカード',
      type: '効果モンスター',
      description: '闇 / レベル 4\n\n①：このカードが特殊召喚に成功した場合に発動できる。',
      imageType: 'none',
      imageBlob: null,
    });

    deckStore.put({
      deckId: 'vrt_deck_1',
      name: 'VRT テストデッキ',
      source: { type: 'neuron', deckCode: 'vrt_code' },
      cards: [{ cardId: 'vrt_card_1', quantity: 1, section: 'main' }],
      route: {
        id: 'vrt_route_1',
        name: 'VRT ルート',
        description: '',
        startingCardIds: ['vrt_card_1'],
        steps: [
          {
            id: 'vrt_step_1',
            type: 'action',
            actions: ['summonNormal'],
            cardId: 'vrt_card_1',
            relatedCards: [],
            description: 'テストアクション',
            position: { x: 100, y: 100 },
          },
        ],
        connections: [],
        result: {
          cardIds: ['vrt_card_1'],
          description: '',
        },
      },
    });

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    db.close();

    localStorage.setItem(
      'duelflow-ui-v0',
      JSON.stringify({ selectedDeckId: 'vrt_deck_1', selection: null }),
    );
  });
}
