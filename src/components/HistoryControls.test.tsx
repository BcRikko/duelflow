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
    expect(screen.getByText('↩ 元に戻す')).not.toBeNull();
    expect(screen.getByText('↪ やり直し')).not.toBeNull();
  });

  it('変更履歴がない場合はボタンが無効', () => {
    render(<HistoryControls />);
    expect((screen.getByText('↩ 元に戻す') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText('↪ やり直し') as HTMLButtonElement).disabled).toBe(true);
  });

  it('Undo ボタンで直前の状態に戻る', () => {
    useComboStore.getState().addRoute();
    render(<HistoryControls />);
    fireEvent.click(screen.getByText('↩ 元に戻す'));
    expect(useComboStore.getState().document.routes).toHaveLength(0);
  });

  it('Redo ボタンでやり直す', () => {
    useComboStore.getState().addRoute();
    performUndo();
    render(<HistoryControls />);
    fireEvent.click(screen.getByText('↪ やり直し'));
    expect(useComboStore.getState().document.routes).toHaveLength(1);
  });

  it('Ctrl+Z で元に戻す', () => {
    useComboStore.getState().addRoute();
    render(<HistoryControls />);
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(useComboStore.getState().document.routes).toHaveLength(0);
  });

  it('Ctrl+Y でやり直す', () => {
    useComboStore.getState().addRoute();
    performUndo();
    render(<HistoryControls />);
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
    expect(useComboStore.getState().document.routes).toHaveLength(1);
  });
});
