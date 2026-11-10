import { useEffect, useState } from 'react';
import { getCardImage, getCardImageByName, revokeCardImageUrl } from './imageStorage';

export function useCardImageUrl(
  cardId: string | undefined,
  cardName?: string,
): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!cardId) {
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    async function loadImage() {
      let blob = await getCardImage(cardId);
      if (!blob && cardName) {
        blob = await getCardImageByName(cardName);
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
        revokeCardImageUrl(objectUrl);
      }
    };
  }, [cardId, cardName]);

  return url;
}
