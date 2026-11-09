import { describe, expect, it, vi } from 'vitest';

describe('main', () => {
  it('createRoot が呼ばれて App がレンダリングされる', async () => {
    const renderSpy = vi.fn();
    const rootSpy = vi.fn(() => ({ render: renderSpy }));
    vi.doMock('react-dom/client', () => ({
      createRoot: rootSpy,
    }));

    const rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);

    await import('./main');

    expect(rootSpy).toHaveBeenCalledWith(rootElement);
    expect(renderSpy).toHaveBeenCalled();

    vi.doUnmock('react-dom/client');
    document.body.removeChild(rootElement);
  });
});
