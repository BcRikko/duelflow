import { useReactFlow, useViewport } from '@xyflow/react';
import styles from './ZoomControls.module.css';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

export function ZoomControls() {
  const { zoomTo } = useReactFlow();
  const { zoom } = useViewport();

  const zoomPercent = Math.round(zoom * 100);

  const handleZoomOut = () => {
    zoomTo(Math.max(MIN_ZOOM, zoom - ZOOM_STEP));
  };

  const handleZoomIn = () => {
    zoomTo(Math.min(MAX_ZOOM, zoom + ZOOM_STEP));
  };

  return (
    <div className={styles.panel}>
      <button type="button" className={styles.button} onClick={handleZoomOut} aria-label="縮小">
        −
      </button>
      <span className={styles.percent}>{zoomPercent}%</span>
      <button type="button" className={styles.button} onClick={handleZoomIn} aria-label="拡大">
        ＋
      </button>
    </div>
  );
}
