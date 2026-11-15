import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from './Dialog';

describe('Dialog', () => {
  it('ダイアログが role="dialog" aria-modal="true" でレンダリングされる', () => {
    render(
      <Dialog onClose={() => {}}>
        <p>内容</p>
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.textContent).toContain('内容');
  });

  it('開いた際にダイアログ自体にフォーカスが移動する', () => {
    render(
      <Dialog onClose={() => {}}>
        <button type="button">ボタン</button>
      </Dialog>,
    );
    expect(document.activeElement).toBe(screen.getByRole('dialog'));
  });

  it('Escape キーで onClose が呼ばれる', () => {
    const handleClose = vi.fn();
    render(
      <Dialog onClose={handleClose}>
        <p>内容</p>
      </Dialog>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('Tab キーでフォーカスがダイアログ内を循環する', () => {
    render(
      <Dialog onClose={() => {}}>
        <button type="button">first</button>
        <button type="button">last</button>
      </Dialog>,
    );

    const first = screen.getByRole('button', { name: 'first' });
    const last = screen.getByRole('button', { name: 'last' });

    first.focus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);

    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
  });

  it('オーバーレイクリックで onClose が呼ばれる', () => {
    const handleClose = vi.fn();
    const { container } = render(
      <Dialog onClose={handleClose}>
        <p>内容</p>
      </Dialog>,
    );
    const overlay = container.querySelector('[role="presentation"]');
    fireEvent.click(overlay!);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
