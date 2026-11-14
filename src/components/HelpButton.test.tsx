import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetStore } from '../test/helpers';
import { HelpButton } from './HelpButton';

describe('HelpButton', () => {
  beforeEach(() => {
    resetStore();
  });

  it('使い方ボタンを表示する', () => {
    render(<HelpButton />);
    expect(screen.getByTitle('使い方 (Shift + ?)')).not.toBeNull();
  });

  it('ボタンクリックで使い方ダイアログを開く', () => {
    render(<HelpButton />);
    fireEvent.click(screen.getByTitle('使い方 (Shift + ?)'));
    expect(screen.getByRole('heading', { name: 'DuelFlow' })).not.toBeNull();
  });

  it('Shift + ? で使い方ダイアログをトグルする', () => {
    render(<HelpButton />);
    fireEvent.keyDown(window, { key: '?', shiftKey: true });
    expect(screen.getByRole('heading', { name: 'DuelFlow' })).not.toBeNull();

    fireEvent.keyDown(window, { key: '?', shiftKey: true });
    expect(screen.queryByRole('heading', { name: 'DuelFlow' })).toBeNull();
  });

  it('入力中は Shift + ? を無視する', () => {
    render(
      <>
        <input type="text" data-testid="input" />
        <HelpButton />
      </>,
    );
    const input = screen.getByTestId('input');
    fireEvent.keyDown(input, { key: '?', shiftKey: true });
    expect(screen.queryByRole('heading', { name: 'DuelFlow' })).toBeNull();
  });

  it('Escape でダイアログを閉じる', () => {
    render(<HelpButton />);
    fireEvent.click(screen.getByTitle('使い方 (Shift + ?)'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('heading', { name: 'DuelFlow' })).toBeNull();
  });

  it('閉じるボタンでダイアログを閉じる', () => {
    render(<HelpButton />);
    fireEvent.click(screen.getByTitle('使い方 (Shift + ?)'));
    fireEvent.click(screen.getByText('閉じる'));
    expect(screen.queryByRole('heading', { name: 'DuelFlow' })).toBeNull();
  });
});
