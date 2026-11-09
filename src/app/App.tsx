import { Header } from '../components/Header';
import { CardList } from '../features/deck/components/CardList';
import { ComboCanvas } from '../features/editor/components/canvas/ComboCanvas';
import styles from './App.module.css';

function App() {
  return (
    <div className={styles.app}>
      <Header />
      <main className={styles.main}>
        <aside className={styles.sidebar}>
          <CardList />
        </aside>
        <section className={styles.canvas}>
          <ComboCanvas />
        </section>
      </main>
    </div>
  );
}

export default App;
