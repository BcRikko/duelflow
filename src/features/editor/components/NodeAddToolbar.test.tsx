import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useComboStore } from '../store/comboStore';
import { resetStore } from '../../../test/helpers';
import { NodeAddToolbar } from './NodeAddToolbar';

describe('NodeAddToolbar', () => {
  beforeEach(() => {
    resetStore();
    vi.stubGlobal('alert', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('メモノード追加ボタンを表示する', () => {
    render(<NodeAddToolbar />);
    expect(screen.getByText('+ メモノード追加')).not.toBeNull();
  });

  it('ルート未選択時はアラートを表示する', () => {
    useComboStore.setState({ currentDeck: null });
    render(<NodeAddToolbar />);
    fireEvent.click(screen.getByText('+ メモノード追加'));
    expect(window.alert).toHaveBeenCalledWith(
      'ルートが選択されていません。ヘッダーからルートを選択してください。',
    );
  });

  it('ルート選択時はメモステップを追加する', () => {
    useComboStore.getState().addRoute();
    render(<NodeAddToolbar />);
    fireEvent.click(screen.getByText('+ メモノード追加'));
    const { currentDeck } = useComboStore.getState();
    const route = currentDeck?.routes.find((r) => r.id === currentDeck.currentRouteId);
    expect(route?.steps).toHaveLength(1);
    expect(route?.steps[0].type).toBe('note');
    expect(route?.connections).toHaveLength(0);
  });
});
