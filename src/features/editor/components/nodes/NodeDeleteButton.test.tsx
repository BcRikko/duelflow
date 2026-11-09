import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReactFlowProvider } from '@xyflow/react';
import { NodeDeleteButton } from './NodeDeleteButton';

describe('NodeDeleteButton', () => {
  it('クリックで onClick が呼ばれる', () => {
    const onClick = vi.fn();
    render(
      <ReactFlowProvider>
        <NodeDeleteButton onClick={onClick} />
      </ReactFlowProvider>,
    );
    fireEvent.click(screen.getByTitle('削除'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
