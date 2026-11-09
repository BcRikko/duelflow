import { Handle, Position } from '@xyflow/react';
import styles from './Node.module.css';

export function NodeHandles() {
  return (
    <>
      <Handle type="target" position={Position.Top} className={styles.handle} />
      <Handle type="source" position={Position.Bottom} className={styles.handle} />
    </>
  );
}
