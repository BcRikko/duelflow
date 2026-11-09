import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReactFlowProvider } from '@xyflow/react';
import { NodeHandles } from './NodeHandles';

describe('NodeHandles', () => {
  it('レンダリングされる', () => {
    const { container } = render(
      <ReactFlowProvider>
        <NodeHandles />
      </ReactFlowProvider>,
    );
    expect(container.querySelectorAll('.react-flow__handle')).toHaveLength(2);
  });
});
