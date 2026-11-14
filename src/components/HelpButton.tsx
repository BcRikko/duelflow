import { useEffect, useState } from 'react';
import { HelpIcon } from './icons';
import { HelpDialog } from './HelpDialog';
import styles from './Header.module.css';

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    /^(INPUT|TEXTAREA|SELECT|OPTION)$/.test(target.tagName)
  );
}

export function HelpButton() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.shiftKey || event.key !== '?') return;
      if (isTypingTarget(event.target)) return;

      event.preventDefault();
      setIsOpen((prev) => !prev);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        className={styles.iconButton}
        onClick={() => setIsOpen(true)}
        title="使い方 (Shift + ?)"
        aria-label="使い方"
      >
        <HelpIcon />
        <span className={styles.label}>使い方</span>
      </button>
      {isOpen ? <HelpDialog onClose={() => setIsOpen(false)} /> : null}
    </>
  );
}
