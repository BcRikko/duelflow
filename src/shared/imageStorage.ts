const DB_NAME = 'duelflow';
const STORE_NAME = 'cardImages';
const NAME_INDEX = 'name';
const DB_VERSION = 3;

type ImageRecord = {
  cardId: string;
  name: string;
  type: string;
  blob: Blob;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'cardId' });
      store.createIndex(NAME_INDEX, 'name', { unique: false });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readFileHeader(file: File, size: number): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file.slice(0, size));
  });
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export function detectImageMimeType(header: ArrayBuffer): string {
  const bytes = new Uint8Array(header);
  if (bytes.length < 3) {
    return 'application/octet-stream';
  }

  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png';
  }

  // GIF
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return 'image/gif';
  }

  // BMP
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return 'image/bmp';
  }

  // WebP: RIFF....WEBP
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

function normalizeName(name: string): string {
  return name.normalize('NFC').trim();
}

function recordToBlob(record: ImageRecord | undefined): Blob | null {
  if (!record || record.blob.size === 0) {
    return null;
  }
  return new Blob([record.blob], { type: record.type });
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

export async function saveCardImage(
  cardId: string,
  name: string,
  file: File,
): Promise<void> {
  const type = await detectImageType(file);
  if (type === 'application/octet-stream') {
    return;
  }

  const buffer = await readFileAsArrayBuffer(file);
  const ext = getImageExtension(type);
  const blob = new File([buffer], `${cardId}.${ext}`, { type });

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const record: ImageRecord = {
      cardId,
      name: normalizeName(name),
      type,
      blob,
    };
    const request = store.put(record);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getCardImage(cardId: string): Promise<Blob | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(cardId);

    request.onsuccess = () => {
      const result = request.result as ImageRecord | undefined;
      resolve(recordToBlob(result));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getCardImageByName(name: string): Promise<Blob | null> {
  const db = await openDatabase();
  const key = normalizeName(name);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index(NAME_INDEX);
    const request = index.get(key);

    request.onsuccess = () => {
      const result = request.result as ImageRecord | undefined;
      resolve(recordToBlob(result));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteCardImage(cardId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(cardId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllCardImages(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export function revokeCardImageUrl(url: string): void {
  URL.revokeObjectURL(url);
}
