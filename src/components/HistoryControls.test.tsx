import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useComboStore, performUndo } from '../features/editor/store/comboStore';
import { resetStore } from '../test/helpers';
import { HistoryControls } from './HistoryControls';

describe('HistoryControls', () => {
  beforeEach(() => {
    resetStore();
  });

  it('Undo/Redo ボタンを表示する', () => {
    render(<HistoryControls />);
    expect(screen.getByTitle('元に戻す (Ctrl+Z / Cmd+Z)')).not.toBeNull();
    expect(screen.getByTitle('やり直し (Ctrl+Y / Cmd+Shift+Z)')).not.toBeNull();
  });

  it('変更履歴がない場合はボタンが無効', () => {
    render(<HistoryControls />);
    expect((screen.getByTitle('元に戻す (Ctrl+Z / Cmd+Z)') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTitle('やり直し (Ctrl+Y / Cmd+Shift+Z)') as HTMLButtonElement).disabled).toBe(true);
  });

  it('Undo ボタンで直前の状態に戻る', () => {
    useComboStore.getState().updateRoute({ name: 'Changed' });
    render(<HistoryControls />);
    fireEvent.click(screen.getByTitle('元に戻す (Ctrl+Z / Cmd+Z)'));
    expect(useComboStore.getState().currentDeck?.route.name).toBe('Test Deck');
  });

  it('Redo ボタンでやり直す', () => {
    useComboStore.getState().updateRoute({ name: 'Changed' });
    performUndo();
    render(<HistoryControls />);
    fireEvent.click(screen.getByTitle('やり直し (Ctrl+Y / Cmd+Shift+Z)'));
    expect(useComboStore.getState().currentDeck?.route.name).toBe('Changed');
  });

  it('Ctrl+Z で元に戻す', () => {
    useComboStore.getState().updateRoute({ name: 'Changed' });
    render(<HistoryControls />);
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(useComboStore.getState().currentDeck?.route.name).toBe('Test Deck');
  });

  it('Ctrl+Y でやり直す', () => {
    useComboStore.getState().updateRoute({ name: 'Changed' });
    performUndo();
    render(<HistoryControls />);
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
    expect(useComboStore.getState().currentDeck?.route.name).toBe('Changed');
  });
});
