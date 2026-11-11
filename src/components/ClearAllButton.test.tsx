import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useComboStore } from '../features/editor/store/comboStore';
import { resetStore } from '../test/helpers';
import { ClearAllButton } from './ClearAllButton';

describe('ClearAllButton', () => {
  beforeEach(() => {
    resetStore();
  });

  it('ボタンが表示される', () => {
    render(<ClearAllButton />);
    expect(screen.getByRole('button', { name: 'すべてクリア' })).toBeTruthy();
  });

  it('確認後にすべてクリアされる', async () => {
    await useComboStore.getState().addCardToCatalog({
      name: 'Card',
      type: '効果モンスター',
      imageUrl: '',
    });
    useComboStore.getState().addRoute('Route');
    expect(useComboStore.getState().cards).toHaveLength(1);
    expect(useComboStore.getState().currentDeck?.routes).toHaveLength(2);

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ClearAllButton />);
    fireEvent.click(screen.getByRole('button', { name: 'すべてクリア' }));

    await waitFor(() => {
      expect(useComboStore.getState().cards).toHaveLength(0);
      // クリア後も空のキャンバスを防ぐため初期ルートが1つ残る
      expect(useComboStore.getState().currentDeck?.routes).toHaveLength(1);
      expect(useComboStore.getState().currentDeck?.name).toBe('新規デッキ');
      expect(useComboStore.getState().currentDeck?.routes[0]?.name).toBe('新規デッキ');
      expect(useComboStore.getState().currentDeck?.currentRouteId).not.toBeNull();
    });
  });

  it('キャンセルした場合はクリアされない', async () => {
    await useComboStore.getState().addCardToCatalog({
      name: 'Card',
      type: '効果モンスター',
      imageUrl: '',
    });
    expect(useComboStore.getState().cards).toHaveLength(1);

    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ClearAllButton />);
    fireEvent.click(screen.getByRole('button', { name: 'すべてクリア' }));

    expect(useComboStore.getState().cards).toHaveLength(1);
  });
});
