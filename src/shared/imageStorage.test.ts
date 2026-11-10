import { describe, expect, it } from 'vitest';
import {
  clearAllCardImages,
  deleteCardImage,
  detectImageMimeType,
  getCardImage,
  getCardImageByName,
  saveCardImage,
} from './imageStorage';

function createJpegContent(): Uint8Array {
  // JPEG マジックナンバー + ダミーデータ
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
}

function createPngContent(): Uint8Array {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

function createJpegFile(name: string): File {
  return new File([createJpegContent()], name);
}

describe('detectImageMimeType', () => {
  it('JPEG を検出する', () => {
    expect(detectImageMimeType(createJpegContent().buffer)).toBe('image/jpeg');
  });

  it('PNG を検出する', () => {
    expect(detectImageMimeType(createPngContent().buffer)).toBe('image/png');
  });

  it('不明な形式は application/octet-stream を返す', () => {
    const buffer = new Uint8Array([0x00, 0x01, 0x02]).buffer;
    expect(detectImageMimeType(buffer)).toBe('application/octet-stream');
  });
});

describe('imageStorage', () => {
  it('カードIDで画像を保存・取得できる', async () => {
    const file = createJpegFile('card.jpg');
    await saveCardImage('card_1', 'ブラック・マジシャン', file);

    const blob = await getCardImage('card_1');
    expect(blob).not.toBeNull();
    expect(blob?.type).toBe('image/jpeg');
  });

  it('拡張子がなくても JPEG として保存できる', async () => {
    const file = createJpegFile('card.ダウンロード');
    await saveCardImage('card_no_ext', 'カード', file);

    const blob = await getCardImage('card_no_ext');
    expect(blob).not.toBeNull();
    expect(blob?.type).toBe('image/jpeg');
  });

  it('カード名で画像を取得できる', async () => {
    const file = createJpegFile('card.jpg');
    await saveCardImage('card_by_name', 'ブラック・マジシャン', file);

    const blob = await getCardImageByName('ブラック・マジシャン');
    expect(blob).not.toBeNull();
    expect(blob?.type).toBe('image/jpeg');
  });

  it('カード名のUnicode正規化が異なっても画像を取得できる', async () => {
    const file = createJpegFile('card.jpg');
    const nfcName = 'ブラック・マジシャン';
    const nfdName = nfcName.normalize('NFD');
    await saveCardImage('card_nfc', nfcName, file);

    const blob = await getCardImageByName(nfdName);
    expect(blob).not.toBeNull();
  });

  it('存在しないカード画像は null を返す', async () => {
    const blob = await getCardImage('card_missing');
    expect(blob).toBeNull();
  });

  it('カード画像を削除できる', async () => {
    const file = createJpegFile('card.jpg');
    await saveCardImage('card_delete', 'カード', file);
    await deleteCardImage('card_delete');

    const blob = await getCardImage('card_delete');
    expect(blob).toBeNull();
  });

  it('すべてのカード画像を削除できる', async () => {
    const file = createJpegFile('card.jpg');
    await saveCardImage('card_clear_1', 'カードA', file);
    await saveCardImage('card_clear_2', 'カードB', file);
    await clearAllCardImages();

    expect(await getCardImage('card_clear_1')).toBeNull();
    expect(await getCardImage('card_clear_2')).toBeNull();
  });
});
