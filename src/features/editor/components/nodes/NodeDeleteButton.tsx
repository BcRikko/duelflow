import styles from './Node.module.css';

type Props = {
  onClick: (e: React.MouseEvent) => void;
};

export function NodeDeleteButton({ onClick }: Props) {
  return (
    <button
      type="button"
      className={styles.deleteButton}
      onClick={onClick}
      onMouseDown={(e) => e.stopPropagation()}
      title="削除"
    >
      ×
    </button>
  );
}
