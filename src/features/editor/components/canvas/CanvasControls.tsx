import { MiniMap } from '@xyflow/react';
import { FlowControls } from './FlowControls';
import styles from './CanvasControls.module.css';

export function CanvasControls() {
  return (
    <>
      <FlowControls />
      <MiniMap
        nodeStrokeWidth={3}
        zoomable
        pannable
        className={styles.miniMap}
      />
    </>
  );
}
