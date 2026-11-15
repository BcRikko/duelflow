import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCard } from '../shared/cardDatabase';
import { CardImage } from './CardImage';

vi.mock('../shared/cardDatabase', () => ({
  getCard: vi.fn(),
  getCardByName: vi.fn(),
}));

beforeEach(() => {
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:local-image'),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CardImage', () => {
  it('IndexedDB に画像がない場合はプレースホルダーを表示する', async () => {
    (getCard as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    render(
      <CardImage
        cardId="card_1"
        cardName="ブラック・マジシャン"
        className="image"
        placeholderClassName="placeholder"
      />,
    );
    expect(await screen.findByText('ブ')).not.toBeNull();
  });

  it('IndexedDB に画像があれば画像を表示する', async () => {
    const blob = new Blob(['image'], { type: 'image/png' });
    (getCard as ReturnType<typeof vi.fn>).mockResolvedValue({
      cardId: 'card_1',
      name: 'ブラック・マジシャン',
      type: 'モンスター',
      imageType: 'image/png',
      imageBlob: blob,
    });

    render(
      <CardImage
        cardId="card_1"
        cardName="ブラック・マジシャン"
        className="image"
        placeholderClassName="placeholder"
      />,
    );
    expect(await screen.findByAltText('ブラック・マジシャン')).not.toBeNull();
  });
});
