import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetStore } from '../test/helpers';
import App from './App';

describe('App', () => {
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

  it('アプリ全体がレンダリングされる', () => {
    render(<App />);
    expect(screen.getByPlaceholderText('デッキ名')).not.toBeNull();
    expect(screen.getByText('カード一覧')).not.toBeNull();
    expect(screen.getByText('ルートがありません')).not.toBeNull();
  });
});
