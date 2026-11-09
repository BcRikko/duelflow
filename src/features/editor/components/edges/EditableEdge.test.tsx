import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReactFlowProvider } from '@xyflow/react';
import { useComboStore } from '../../store/comboStore';
import { resetStore } from '../../../../test/helpers';
import { EditableEdge } from './EditableEdge';

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual<typeof import('@xyflow/react')>('@xyflow/react');
  return {
    ...actual,
    EdgeLabelRenderer: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});

const baseProps = {
  id: 'edge_1',
  sourceX: 0,
  sourceY: 0,
  targetX: 100,
  targetY: 100,
  sourcePosition: 'bottom' as const,
  targetPosition: 'top' as const,
};

describe('EditableEdge', () => {
  beforeEach(() => {
    resetStore();
    useComboStore.getState().addRoute();
    useComboStore.getState().document.routes[0].connections.push({
      id: 'edge_1',
      source: 'step_1',
      target: 'step_2',
    });
  });

  it('選択状態で削除ボタンを表示する', () => {
    render(
      <ReactFlowProvider>
        <EditableEdge {...baseProps} selected />
      </ReactFlowProvider>,
    );
    expect(screen.getByTitle('接続線を削除')).not.toBeNull();
  });

  it('削除ボタンで接続線を削除する', () => {
    render(
      <ReactFlowProvider>
        <EditableEdge {...baseProps} selected />
      </ReactFlowProvider>,
    );
    fireEvent.click(screen.getByTitle('接続線を削除'));
    expect(useComboStore.getState().document.routes[0].connections).toHaveLength(0);
  });

  it('非選択時は削除ボタンを表示しない', () => {
    render(
      <ReactFlowProvider>
        <EditableEdge {...baseProps} />
      </ReactFlowProvider>,
    );
    expect(screen.queryByTitle('接続線を削除')).toBeNull();
  });

  it('ラベルが表示される', () => {
    render(
      <ReactFlowProvider>
        <EditableEdge {...baseProps} label="分岐1" />
      </ReactFlowProvider>,
    );
    expect(screen.getByText('分岐1')).not.toBeNull();
  });
});
