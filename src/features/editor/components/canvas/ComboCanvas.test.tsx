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
    render(<ComboCanvas />);
    expect(screen.getByText('ルートがありません')).not.toBeNull();
  });

  it('ルートがある場合はクラッシュせずにレンダリングする', () => {
    useComboStore.getState().addRoute();
    useComboStore.getState().document.routes[0].steps.push({
      id: 'step_1',
      type: 'note',
      description: 'メモ',
      position: { x: 0, y: 0 },
    });
    expect(() => render(<ComboCanvas />)).not.toThrow();
  });
});
