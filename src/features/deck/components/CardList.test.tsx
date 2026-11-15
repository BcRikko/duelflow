import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useComboStore } from '../../editor/store/comboStore';
import { resetStore } from '../../../test/helpers';
import { CardList } from './CardList';

const NOTE_TOOL_ID = '__note__';

async function addCard(name: string, type: string) {
  const id = await useComboStore.getState().addCardToCatalog({ name, type });
  return id;
}

function setCurrentDeckCards(cardIds: string[]) {
  const currentDeck = useComboStore.getState().currentDeck;
  if (!currentDeck) return;
  useComboStore.setState({
    currentDeck: {
      ...currentDeck,
      cards: cardIds.map((cardId) => ({ cardId, quantity: 1, section: 'main' as const })),
    },
  });
}

describe('CardList', () => {
  beforeEach(() => {
    resetStore();
  });

  it('メモアイテムを常に表示する', () => {
    render(<CardList />);
    expect(screen.getByTitle('メモ')).not.toBeNull();
  });

  it('メモをクリックして選択状態にする', () => {
    render(<CardList />);
    fireEvent.click(screen.getByTitle('メモ'));
    expect(useComboStore.getState().selectedCardIdForAdd).toBe(NOTE_TOOL_ID);
  });

  it('メモのドラッグ開始時にnoteデータを設定する', () => {
    render(<CardList />);
    const note = screen.getByTitle('メモ');
    const dataTransfer = { setData: vi.fn(), effectAllowed: '' };
    fireEvent.dragStart(note, { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith('application/duelflow-note', '1');
  });

  it('登録済みカードを表示する', async () => {
    const id = await addCard('カードA', 'モンスター');
    setCurrentDeckCards([id]);
    render(<CardList />);
    expect(screen.getByText('カードA')).not.toBeNull();
  });

  it('検索でカードを絞り込む', async () => {
    const idA = await addCard('カードA', 'モンスター');
    const idB = await addCard('魔法B', '魔法');
    setCurrentDeckCards([idA, idB]);
    render(<CardList />);

    fireEvent.change(screen.getByPlaceholderText('カード名で検索'), {
      target: { value: '魔法' },
    });

    expect(screen.queryByText('カードA')).toBeNull();
    expect(screen.getByText('魔法B')).not.toBeNull();
  });

  it('現在のデッキに含まれないカードは表示しない', async () => {
    await addCard('カードA', 'モンスター');
    setCurrentDeckCards([]);
    render(<CardList />);
    expect(screen.getByText('このデッキにカードが登録されていません')).not.toBeNull();
  });

  it('カードをクリックして選択状態にする', async () => {
    const id = await addCard('カードA', 'モンスター');
    setCurrentDeckCards([id]);
    render(<CardList />);
    fireEvent.click(screen.getByText('カードA'));
    expect(useComboStore.getState().selectedCardIdForAdd).toBe(id);
  });

  it('カードがない場合は空のメッセージを表示する', () => {
    render(<CardList />);
    expect(screen.getByText('このデッキにカードが登録されていません')).not.toBeNull();
  });

  it('追加ボタンでカードフォームを開く', () => {
    render(<CardList />);
    fireEvent.click(screen.getByText('+ 追加'));
    expect(screen.getByText('カードを追加')).not.toBeNull();
  });

  it('ドラッグ開始時にカードIDをデータ転送に設定する', async () => {
    const id = await addCard('カードA', 'モンスター');
    setCurrentDeckCards([id]);
    render(<CardList />);
    const card = screen.getByText('カードA').closest('button');
    const dataTransfer = { setData: vi.fn(), effectAllowed: '' };
    fireEvent.dragStart(card!, { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith('application/duelflow-card', expect.any(String));
  });
});
