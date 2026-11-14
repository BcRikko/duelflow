import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeckControl } from './DeckControl';
import { useComboStore } from '../features/editor/store/comboStore';
import { resetStore } from '../test/helpers';

describe('DeckControl', () => {
  beforeEach(() => {
    resetStore();
    vi.stubGlobal('prompt', vi.fn());
    vi.stubGlobal('confirm', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const getDeckButton = () =>
    screen.getByRole('button', { name: /Test Deck|デッキなし/ });

  const renderAndOpen = () => {
    render(<DeckControl />);
    fireEvent.click(getDeckButton());
  };

  it('デッキがない場合は「デッキを追加」ボタンを表示する', () => {
    useComboStore.setState({ decks: [], currentDeck: null });
    render(<DeckControl />);
    expect(screen.getByRole('button', { name: 'デッキを追加' })).not.toBeNull();
  });

  it('パネルを開いてデッキ一覧を表示する', () => {
    renderAndOpen();
    expect(screen.getByRole('button', { name: 'デッキを追加' })).not.toBeNull();
    expect(screen.getByTitle('Test Deck')).not.toBeNull();
  });

  it('デッキを選択すると selectDeck が呼ばれる', async () => {
    const selectDeck = vi.spyOn(useComboStore.getState(), 'selectDeck');
    renderAndOpen();
    fireEvent.click(screen.getByTitle('Test Deck'));
    await waitFor(() => {
      expect(selectDeck).toHaveBeenCalledWith(expect.any(String));
    });
  });

  it('デッキを削除すると deleteDeck が呼ばれる', async () => {
    vi.mocked(window.confirm).mockReturnValue(true);
    const deleteDeck = vi.spyOn(useComboStore.getState(), 'deleteDeck');
    const { decks } = useComboStore.getState();
    renderAndOpen();
    fireEvent.click(screen.getByRole('button', { name: '削除' }));
    expect(window.confirm).toHaveBeenCalledWith(
      `デッキ「${decks[0].name}」を削除しますか？この操作は元に戻せません。`,
    );
    await waitFor(() => {
      expect(deleteDeck).toHaveBeenCalledWith(decks[0].deckId);
    });
  });

  it('編集ボタンでデッキ名を変更する', () => {
    vi.mocked(window.prompt).mockReturnValue('Renamed Deck');
    const renameDeck = vi.spyOn(useComboStore.getState(), 'renameDeck');
    const { decks } = useComboStore.getState();
    renderAndOpen();
    fireEvent.click(screen.getByRole('button', { name: '編集' }));
    expect(window.prompt).toHaveBeenCalledWith(
      'デッキ名を入力してください',
      decks[0].name,
    );
    expect(renameDeck).toHaveBeenCalledWith(decks[0].deckId, 'Renamed Deck');
  });

  it('「デッキを追加」ボタンでデッキ追加ダイアログを開く', () => {
    renderAndOpen();
    fireEvent.click(screen.getByRole('button', { name: 'デッキを追加' }));
    expect(screen.getByRole('heading', { name: 'デッキを追加' })).not.toBeNull();
  });

  it('パネル外クリックでパネルを閉じる', () => {
    renderAndOpen();
    expect(screen.getByRole('button', { name: 'デッキを追加' })).not.toBeNull();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('button', { name: 'デッキを追加' })).toBeNull();
  });

  it('Escape キーでパネルを閉じる', () => {
    renderAndOpen();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'デッキを追加' })).toBeNull();
  });
});
