import { MiniMap } from '@xyflow/react';
import { ZoomControls } from './ZoomControls';
import styles from './CanvasControls.module.css';

export function CanvasControls() {
  return (
    <div className={styles.container}>
      <MiniMap nodeStrokeWidth={3} zoomable pannable style={{ position: 'relative' }} />
      <ZoomControls />
    </div>
  );
}
