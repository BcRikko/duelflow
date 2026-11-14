import { fireEvent, render, screen } from '@testing-library/react';
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

  it('デッキがない場合は追加を促すアナウンスを表示する', () => {
    useComboStore.setState({ currentDeck: null });
    render(<ComboCanvas />);
    expect(screen.getByText('まずは「デッキを追加」しましょう')).not.toBeNull();
    expect(
      screen.getByText(
        'サイドバーにカード一覧が表示されるので、ドラッグ＆ドロップで展開ルートがつくれます。',
      ),
    ).not.toBeNull();
    expect(screen.getByRole('button', { name: 'デッキを追加' })).not.toBeNull();
  });

  it('デッキがある場合はクラッシュせずにレンダリングする', () => {
    const currentDeck = useComboStore.getState().currentDeck;
    if (!currentDeck) throw new Error('currentDeck is null');
    useComboStore.setState({
      currentDeck: {
        ...currentDeck,
        route: {
          ...currentDeck.route,
          steps: [
            {
              id: 'step_1',
              type: 'note',
              description: 'メモ',
              position: { x: 0, y: 0 },
            },
          ],
        },
      },
    });
    expect(() => render(<ComboCanvas />)).not.toThrow();
  });

  it('メモのドロップでnoteステップを追加する', () => {
    render(<ComboCanvas />);
    const container = document.querySelector('.react-flow') ?? document.body;
    const dataTransfer = { getData: vi.fn(() => '1'), dropEffect: '' };
    fireEvent.dragOver(container, { dataTransfer });
    fireEvent.drop(container, {
      dataTransfer,
      clientX: 100,
      clientY: 100,
    });
    const { currentDeck } = useComboStore.getState();
    expect(currentDeck?.route.steps).toHaveLength(1);
    expect(currentDeck?.route.steps[0].type).toBe('note');
  });
});
