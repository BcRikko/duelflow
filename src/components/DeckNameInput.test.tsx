import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useComboStore } from '../features/editor/store/comboStore';
import { resetStore } from '../test/helpers';
import { DeckNameInput } from './DeckNameInput';

describe('DeckNameInput', () => {
  beforeEach(() => {
    resetStore();
  });

  it('デッキ名を表示する', () => {
    render(<DeckNameInput />);
    expect(screen.getByPlaceholderText('デッキ名')).not.toBeNull();
  });

  it('デッキ名を変更するとストアが更新される', () => {
    render(<DeckNameInput />);
    fireEvent.change(screen.getByPlaceholderText('デッキ名'), {
      target: { value: '新しいデッキ' },
    });
    expect(useComboStore.getState().document.deck.name).toBe('新しいデッキ');
  });
});
