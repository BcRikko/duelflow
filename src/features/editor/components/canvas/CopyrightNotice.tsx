import styles from './CopyrightNotice.module.css';

export function CopyrightNotice() {
  return (
    <div className={styles.notice}>
      <p>B.C.Rikko 2026 All rights reserved.</p>
      <p>遊戯王の画像・カード名等はKONAMIの著作物です。</p>
    </div>
  );
}
