import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('アイコンとラベルを表示する', () => {
    render(
      <IconButton
        icon={<span data-testid="icon">*</span>}
        label="テスト"
        title="テストボタン"
      />,
    );
    expect(screen.getByTestId('icon')).not.toBeNull();
    expect(screen.getByText('テスト')).not.toBeNull();
  });

  it('クリックで onClick が呼ばれる', () => {
    const handleClick = vi.fn();
    render(
      <IconButton
        icon={<span>*</span>}
        label="テスト"
        title="テストボタン"
        onClick={handleClick}
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disabled の場合はクリックできない', () => {
    const handleClick = vi.fn();
    render(
      <IconButton
        icon={<span>*</span>}
        label="テスト"
        title="テストボタン"
        onClick={handleClick}
        disabled
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });
});
