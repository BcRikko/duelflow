import { ClearAllButton } from './ClearAllButton';
import { DeckNameInput } from './DeckNameInput';
import { HistoryControls } from './HistoryControls';
import { ImportExportControls } from './ImportExportControls';
import { RouteControls } from './RouteControls';
import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <DeckNameInput />
      <HistoryControls />
      <RouteControls />
      <ClearAllButton />
      <ImportExportControls />
    </header>
  );
}
