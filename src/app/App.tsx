import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { CardList } from '../features/deck/components/CardList';
import { ComboCanvas } from '../features/editor/components/canvas/ComboCanvas';
import { useComboStore } from '../features/editor/store/comboStore';
import styles from './App.module.css';

function App() {
  const initialize = useComboStore((state) => state.initialize);
  const initialized = useComboStore((state) => state.initialized);
  const currentDeckId = useComboStore((state) => state.currentDeck?.deckId ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    initialize().catch((err) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [initialize]);

  if (error) {
    return (
      <div className={styles.loading} role="alert">
        初期化エラー: {error}
      </div>
    );
  }

  if (!initialized) {
    return <div className={styles.loading}>読み込み中...</div>;
  }

  return (
    <div className={styles.app}>
      <Header />
      <main className={styles.main}>
        <aside className={styles.sidebar}>
          <CardList key={currentDeckId ?? 'none'} />
        </aside>
        <section className={styles.canvas}>
          <ComboCanvas />
        </section>
      </main>
    </div>
  );
}

export default App;
