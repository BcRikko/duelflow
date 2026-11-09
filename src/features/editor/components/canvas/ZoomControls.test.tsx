import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZoomControls } from './ZoomControls';

const zoomToMock = vi.fn();
const useViewportMock = vi.fn();
const useReactFlowMock = vi.fn();

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual<typeof import('@xyflow/react')>('@xyflow/react');
  return {
    ...actual,
    useViewport: () => useViewportMock(),
    useReactFlow: () => useReactFlowMock(),
  };
});

function setup(zoom: number) {
  useViewportMock.mockReturnValue({ zoom });
  useReactFlowMock.mockReturnValue({ zoomTo: zoomToMock });
}

describe('ZoomControls', () => {
  beforeEach(() => {
    zoomToMock.mockClear();
  });

  it('現在のズーム率を表示する', () => {
    setup(1);
    render(<ZoomControls />);
    expect(screen.getByText('100%')).not.toBeNull();
  });

  it('+ ボタンで 10% 拡大する', () => {
    setup(1);
    render(<ZoomControls />);
    fireEvent.click(screen.getByLabelText('拡大'));
    expect(zoomToMock).toHaveBeenCalledWith(1.1);
  });

  it('- ボタンで 10% 縮小する', () => {
    setup(1);
    render(<ZoomControls />);
    fireEvent.click(screen.getByLabelText('縮小'));
    expect(zoomToMock).toHaveBeenCalledWith(0.9);
  });

  it('最大ズームを超えない', () => {
    setup(1.95);
    render(<ZoomControls />);
    fireEvent.click(screen.getByLabelText('拡大'));
    expect(zoomToMock).toHaveBeenCalledWith(2);
  });

  it('最小ズームを下回らない', () => {
    setup(0.55);
    render(<ZoomControls />);
    fireEvent.click(screen.getByLabelText('縮小'));
    expect(zoomToMock).toHaveBeenCalledWith(0.5);
  });
});
