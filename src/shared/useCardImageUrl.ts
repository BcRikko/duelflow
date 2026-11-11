import { useEffect, useState } from 'react';
import { getCard, getCardByName } from './cardDatabase';

export function useCardImageUrl(
  cardId: string | undefined,
  cardName?: string,
): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!cardId) {
      return;
    }

    const id = cardId;
    let objectUrl: string | null = null;
    let cancelled = false;

    async function loadImage() {
      const record = await getCard(id);
      let blob = record?.imageBlob ?? null;
      if (!blob && cardName) {
        const byName = await getCardByName(cardName);
        blob = byName?.imageBlob ?? null;
      }
      if (cancelled || !blob || blob.size === 0) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }

    loadImage().catch(() => {
      // IndexedDB 読み込みエラー時は画像なしとして扱う
    });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [cardId, cardName]);

  return url;
}
