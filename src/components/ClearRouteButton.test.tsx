import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useComboStore } from '../features/editor/store/comboStore';
import { resetStore } from '../test/helpers';
import { ClearRouteButton } from './ClearRouteButton';

describe('ClearRouteButton', () => {
  beforeEach(() => {
    resetStore();
  });

  it('クリアボタンを表示する', () => {
    render(<ClearRouteButton />);
    expect(screen.getByTitle('ルートをクリア')).toBeTruthy();
  });

  it('確認後に現在のルートをクリアする', async () => {
    await useComboStore.getState().addCardToCatalog({
      name: 'Card',
      type: '効果モンスター',
      imageUrl: '',
    });
    useComboStore.getState().addStepToEnd({
      type: 'action',
      actions: ['normalSummon'],
      cardId: 'card_1',
      relatedCards: [],
    });
    expect(useComboStore.getState().cards).toHaveLength(1);
    expect(useComboStore.getState().currentDeck?.route.steps).toHaveLength(1);

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ClearRouteButton />);
    fireEvent.click(screen.getByTitle('ルートをクリア'));

    await waitFor(() => {
      expect(useComboStore.getState().cards).toHaveLength(1);
      expect(useComboStore.getState().currentDeck?.route.steps).toHaveLength(0);
      expect(useComboStore.getState().currentDeck?.name).toBe('Test Deck');
    });
  });

  it('キャンセルした場合はクリアされない', () => {
    useComboStore.getState().addStepToEnd({
      type: 'action',
      actions: ['normalSummon'],
      cardId: 'card_1',
      relatedCards: [],
    });

    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ClearRouteButton />);
    fireEvent.click(screen.getByTitle('ルートをクリア'));

    expect(useComboStore.getState().currentDeck?.route.steps).toHaveLength(1);
  });
});
