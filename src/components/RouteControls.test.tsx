import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useComboStore } from '../features/editor/store/comboStore';
import { resetStore } from '../test/helpers';
import { RouteControls } from './RouteControls';

describe('RouteControls', () => {
  beforeEach(() => {
    resetStore();
    vi.stubGlobal('confirm', () => true);
    vi.stubGlobal('prompt', () => 'New Route');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('ルートを選択できる', () => {
    const id = useComboStore.getState().addRoute('Route1');
    render(<RouteControls />);
    expect(screen.getByDisplayValue('Route1')).not.toBeNull();
    expect(useComboStore.getState().currentDeck?.currentRouteId).toBe(id);
  });

  it('ルート追加ボタンでルートを追加する', () => {
    render(<RouteControls />);
    fireEvent.click(screen.getByText('+ ルート追加'));
    expect(useComboStore.getState().currentDeck?.routes).toHaveLength(2);
  });

  it('ルートが2つ以上ある場合削除ボタンを表示する', () => {
    useComboStore.getState().addRoute('Route1');
    useComboStore.getState().addRoute('Route2');
    render(<RouteControls />);
    expect(screen.getByText('削除')).not.toBeNull();
  });

  it('削除ボタンで現在のルートを削除する', () => {
    useComboStore.getState().addRoute('Route1');
    useComboStore.getState().addRoute('Route2');
    render(<RouteControls />);
    fireEvent.click(screen.getByText('削除'));
    expect(useComboStore.getState().currentDeck?.routes).toHaveLength(2);
  });

  it('ルートが1つの場合削除ボタンを表示しない', () => {
    render(<RouteControls />);
    expect(screen.queryByText('削除')).toBeNull();
  });
});
