import type { DeckEntry, Route } from '../features/combo/model/types';

const DB_NAME = 'duelflow';
const DB_VERSION = 4;
const CARD_STORE = 'cards';
const DECK_STORE = 'decks';
const NAME_INDEX = 'name';

export type CardRecord = {
  cardId: string;
  name: string;
  type: string;
  description?: string;
  imageType: string;
  imageBlob: Blob | null;
};

export type DeckRecord = {
  deckId: string;
  name: string;
  source: {
    type: 'neuron';
    deckCode: string;
  };
  cards: DeckEntry[]; 
  route: Route;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      for (const name of Array.from(db.objectStoreNames)) {
        db.deleteObjectStore(name);
      }

      const cardStore = db.createObjectStore(CARD_STORE, { keyPath: 'cardId' });
      cardStore.createIndex(NAME_INDEX, 'name', { unique: false });

      db.createObjectStore(DECK_STORE, { keyPath: 'deckId' });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withDatabase<T>(fn: (db: IDBDatabase) => Promise<T>): Promise<T> {
  const db = await openDatabase();
  try {
    return await fn(db);
  } finally {
    db.close();
  }
}

function readFileHeader(file: File, size: number): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file.slice(0, size));
  });
}

function detectImageMimeType(header: ArrayBuffer): string {
  const bytes = new Uint8Array(header);
  if (bytes.length < 3) {
    return 'application/octet-stream';
  }

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png';
  }

  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return 'image/gif';
  }

  if (bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return 'image/bmp';
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  return 'application/octet-stream';
}

async function detectImageType(file: File): Promise<string> {
  const header = await readFileHeader(file, 12);
  return detectImageMimeType(header);
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

function getImageExtension(type: string): string {
  switch (type) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    case 'image/bmp':
      return 'bmp';
    default:
      return 'bin';
  }
}

function normalizeName(name: string): string {
  return name.normalize('NFC').trim();
}

export async function saveCard(
  cardId: string,
  name: string,
  type: string,
  options?: { file?: File; description?: string },
): Promise<void> {
  const existing = await getCard(cardId);

  let imageType = existing?.imageType ?? '';
  let imageBlob: Blob | null = existing?.imageBlob ?? null;

  if (options?.file) {
    imageType = await detectImageType(options.file);
    if (imageType === 'application/octet-stream') {
      imageType = options.file.type || 'application/octet-stream';
    }
    if (imageType !== 'application/octet-stream') {
      const buffer = await readFileAsArrayBuffer(options.file);
      const ext = getImageExtension(imageType);
      imageBlob = new File([buffer], `${cardId}.${ext}`, { type: imageType });
    }
  }

  const record: CardRecord = {
    cardId,
    name: normalizeName(name),
    type,
    description: options?.description ?? existing?.description ?? '',
    imageType,
    imageBlob,
  };

  return withDatabase(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(CARD_STORE, 'readwrite');
        const store = transaction.objectStore(CARD_STORE);
        const request = store.put(record);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
  );
}

export async function getCard(cardId: string): Promise<CardRecord | null> {
  return withDatabase(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(CARD_STORE, 'readonly');
        const store = transaction.objectStore(CARD_STORE);
        const request = store.get(cardId);

        request.onsuccess = () => {
          resolve((request.result as CardRecord | undefined) ?? null);
        };
        request.onerror = () => reject(request.error);
      }),
  );
}

export async function getCardByName(name: string): Promise<CardRecord | null> {
  const key = normalizeName(name);
  return withDatabase(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(CARD_STORE, 'readonly');
        const store = transaction.objectStore(CARD_STORE);
        const index = store.index(NAME_INDEX);
        const request = index.get(key);

        request.onsuccess = () => {
          resolve((request.result as CardRecord | undefined) ?? null);
        };
        request.onerror = () => reject(request.error);
      }),
  );
}

export async function getAllCards(): Promise<CardRecord[]> {
  return withDatabase(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(CARD_STORE, 'readonly');
        const store = transaction.objectStore(CARD_STORE);
        const request = store.getAll();

        request.onsuccess = () => {
          resolve((request.result as CardRecord[]) ?? []);
        };
        request.onerror = () => reject(request.error);
      }),
  );
}

export async function deleteCard(cardId: string): Promise<void> {
  return withDatabase(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(CARD_STORE, 'readwrite');
        const store = transaction.objectStore(CARD_STORE);
        const request = store.delete(cardId);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
  );
}

export async function clearCards(): Promise<void> {
  return withDatabase(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(CARD_STORE, 'readwrite');
        const store = transaction.objectStore(CARD_STORE);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
  );
}

export async function saveDeck(deck: DeckRecord): Promise<void> {
  return withDatabase(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(DECK_STORE, 'readwrite');
        const store = transaction.objectStore(DECK_STORE);
        const request = store.put(deck);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
  );
}

export async function getDeck(deckId: string): Promise<DeckRecord | null> {
  return withDatabase(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(DECK_STORE, 'readonly');
        const store = transaction.objectStore(DECK_STORE);
        const request = store.get(deckId);

        request.onsuccess = () => {
          resolve((request.result as DeckRecord | undefined) ?? null);
        };
        request.onerror = () => reject(request.error);
      }),
  );
}

export async function getAllDecks(): Promise<DeckRecord[]> {
  return withDatabase(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(DECK_STORE, 'readonly');
        const store = transaction.objectStore(DECK_STORE);
        const request = store.getAll();

        request.onsuccess = () => {
          resolve((request.result as DeckRecord[]) ?? []);
        };
        request.onerror = () => reject(request.error);
      }),
  );
}

export async function deleteDeck(deckId: string): Promise<void> {
  return withDatabase(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(DECK_STORE, 'readwrite');
        const store = transaction.objectStore(DECK_STORE);
        const request = store.delete(deckId);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
  );
}

export async function clearDecks(): Promise<void> {
  return withDatabase(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(DECK_STORE, 'readwrite');
        const store = transaction.objectStore(DECK_STORE);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
  );
}

export async function clearAll(): Promise<void> {
  return withDatabase(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction([CARD_STORE, DECK_STORE], 'readwrite');
        transaction.objectStore(CARD_STORE).clear();
        transaction.objectStore(DECK_STORE).clear();

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      }),
  );
}
