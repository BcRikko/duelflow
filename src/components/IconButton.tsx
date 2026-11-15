import styles from './Header.module.css';

type IconButtonProps = {
  icon: React.ReactNode;
  label: string;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
  type?: 'button' | 'submit';
};

export function IconButton({
  icon,
  label,
  title,
  onClick,
  disabled,
  variant = 'default',
  type = 'button',
}: IconButtonProps) {
  const className =
    variant === 'danger'
      ? `${styles.iconButton} ${styles.danger}`
      : styles.iconButton;

  return (
    <button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      {icon}
      <span className={styles.label}>{label}</span>
    </button>
  );
}
