import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('ボタンクリックで使い方ダイアログを開く', async () => {
    render(<HelpButton />);
    fireEvent.click(screen.getByTitle('使い方 (Shift + ?)'));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'DuelFlow' })).not.toBeNull();
    }, { timeout: 3000 });
  });

  it('Shift + ? で使い方ダイアログをトグルする', async () => {
    render(<HelpButton />);
    fireEvent.keyDown(window, { key: '?', shiftKey: true });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'DuelFlow' })).not.toBeNull();
    }, { timeout: 3000 });

    fireEvent.keyDown(window, { key: '?', shiftKey: true });
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'DuelFlow' })).toBeNull();
    }, { timeout: 3000 });
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

  it('Escape でダイアログを閉じる', async () => {
    render(<HelpButton />);
    fireEvent.click(screen.getByTitle('使い方 (Shift + ?)'));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'DuelFlow' })).not.toBeNull();
    });
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'DuelFlow' })).toBeNull();
    }, { timeout: 3000 });
  });

  it('閉じるボタンでダイアログを閉じる', async () => {
    render(<HelpButton />);
    fireEvent.click(screen.getByTitle('使い方 (Shift + ?)'));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'DuelFlow' })).not.toBeNull();
    }, { timeout: 3000 });
    fireEvent.click(screen.getByText('閉じる'));
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'DuelFlow' })).toBeNull();
    }, { timeout: 3000 });
  });
});
