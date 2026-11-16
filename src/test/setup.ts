import { IDBFactory } from 'fake-indexeddb';

// jsdom には IndexedDB がないためテスト用の polyfill を常に当てる
// @ts-expect-error fake-indexeddb の型と global の型が完全には一致しない
globalThis.indexedDB = new IDBFactory();

// localStorage / IndexedDB をテストごとにクリア
beforeEach(async () => {
  localStorage.clear();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('duelflow');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
});
