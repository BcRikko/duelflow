import { useReactFlow } from '@xyflow/react';
import { FitViewIcon, ZoomInIcon, ZoomOutIcon } from '../../../../components/icons';
import styles from './FlowControls.module.css';

export function FlowControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className={styles.controls}>
      <button
        type="button"
        className={styles.button}
        title="拡大"
        aria-label="拡大"
        onClick={() => zoomIn()}
      >
        <ZoomInIcon className={styles.icon} />
      </button>
      <button
        type="button"
        className={styles.button}
        title="縮小"
        aria-label="縮小"
        onClick={() => zoomOut()}
      >
        <ZoomOutIcon className={styles.icon} />
      </button>
      <button
        type="button"
        className={styles.button}
        title="全体を表示"
        aria-label="全体を表示"
        onClick={() => fitView()}
      >
        <FitViewIcon className={styles.icon} />
      </button>
    </div>
  );
}
