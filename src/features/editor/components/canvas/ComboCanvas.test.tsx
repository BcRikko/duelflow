import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useComboStore } from '../../store/comboStore';
import { resetStore } from '../../../../test/helpers';
import { ComboCanvas } from './ComboCanvas';

describe('ComboCanvas', () => {
  beforeEach(() => {
    resetStore();
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(cb, 0));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('ルートがない場合は空のメッセージを表示する', () => {
    const state = useComboStore.getState();
    const currentDeck = state.currentDeck;
    if (!currentDeck) throw new Error('currentDeck is null');
    useComboStore.setState({
      currentDeck: { ...currentDeck, routes: [] },
    });
    render(<ComboCanvas />);
    expect(screen.getByText('ルートがありません')).not.toBeNull();
  });

  it('ルートがある場合はクラッシュせずにレンダリングする', () => {
    const state = useComboStore.getState();
    state.addRoute();
    const currentDeck = state.currentDeck;
    if (!currentDeck) throw new Error('currentDeck is null');
    const route = currentDeck.routes.find((r) => r.id === currentDeck.currentRouteId) ?? currentDeck.routes[0];
    useComboStore.setState({
      currentDeck: {
        ...currentDeck,
        routes: currentDeck.routes.map((r) =>
          r.id === route.id
            ? {
                ...r,
                steps: [
                  {
                    id: 'step_1',
                    type: 'note',
                    description: 'メモ',
                    position: { x: 0, y: 0 },
                  },
                ],
              }
            : r,
        ),
      },
    });
    expect(() => render(<ComboCanvas />)).not.toThrow();
  });
});
