import { useState } from 'react';
import { isSafeImageUrl } from '../../../shared/url';
import { useComboStore } from '../../editor/store/comboStore';
import dialogStyles from '../../../components/Dialog.module.css';
import styles from './CardForm.module.css';

type CardFormProps = {
  onClose: () => void;
};

export function CardForm({ onClose }: CardFormProps) {
  const addCardToCatalog = useComboStore((state) => state.addCardToCatalog);
  const selectCardForAdd = useComboStore((state) => state.selectCardForAdd);

  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    const trimmedUrl = imageUrl.trim();
    if (!isSafeImageUrl(trimmedUrl)) {
      // eslint-disable-next-line no-alert
      alert('画像URLは空欄、またはhttp/httpsから始まるURLを指定してください');
      return;
    }

    setIsSubmitting(true);
    const id = await addCardToCatalog({
      name: name.trim(),
      type: type.trim() || 'モンスター',
      imageUrl: trimmedUrl,
    });

    selectCardForAdd(id);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className={dialogStyles.overlay}>
      <div className={`${dialogStyles.dialog} ${dialogStyles.dialogSmall}`}>
        <h3>カードを追加</h3>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            カード名
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="カード名"
              autoFocus
            />
          </label>
          <label className={styles.field}>
            種別
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="例：効果モンスター、魔法、罠"
            />
            <div className={styles.typePresets}>
              <button type="button" onClick={() => setType('効果モンスター')}>
                効果モンスター
              </button>
              <button type="button" onClick={() => setType('魔法')}>
                魔法
              </button>
              <button type="button" onClick={() => setType('罠')}>
                罠
              </button>
            </div>
          </label>
          <label className={styles.field}>
            画像URL
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </label>
          <div className={dialogStyles.buttons}>
            <button
              type="button"
              onClick={onClose}
              className={`${dialogStyles.button} ${dialogStyles.buttonSecondary}`}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className={`${dialogStyles.button} ${dialogStyles.buttonPrimary}`}
              disabled={isSubmitting}
            >
              追加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
