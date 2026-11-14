import { ClearRouteButton } from './ClearRouteButton';
import { DeckControl } from './DeckControl';
import { HelpButton } from './HelpButton';
import { HistoryControls } from './HistoryControls';
import { ImportExportControls } from './ImportExportControls';
import { Logo } from './Logo';
import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.leftGroup}>
        <Logo className={styles.logo} />
        <span className={styles.title}>DuelFlow</span>
      </div>
      <div className={styles.centerGroup}>
        <DeckControl />
      </div>
      <div className={styles.rightGroup}>
        <HistoryControls />
        <ClearRouteButton />
        <ImportExportControls />
        <HelpButton />
      </div>
    </header>
  );
}
