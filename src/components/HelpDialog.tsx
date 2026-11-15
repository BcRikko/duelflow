import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import readme from '../../README.md?raw';
import { Dialog } from './Dialog';
import dialogStyles from './Dialog.module.css';
import styles from './HelpDialog.module.css';

function isAllowedMarkdownUrl(url: string): boolean {
  return url === '' || /^https?:\/\//i.test(url) || url.startsWith('#');
}

function markdownUrlTransform(url: string): string | undefined {
  return isAllowedMarkdownUrl(url) ? url : undefined;
}

function MarkdownLink({ href, children }: { href?: string; children?: React.ReactNode }) {
  if (!href) {
    return <>{children}</>;
  }

  const isExternal = /^https?:\/\//i.test(href);
  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }

  return <a href={href}>{children}</a>;
}

const markdownComponents: Components = {
  a: MarkdownLink,
};

type HelpDialogProps = {
  onClose: () => void;
};

export function HelpDialog({ onClose }: HelpDialogProps) {
  return (
    <Dialog
      onClose={onClose}
      footer={
        <button
          type="button"
          className={`${dialogStyles.button} ${dialogStyles.buttonSecondary}`}
          onClick={onClose}
        >
          閉じる
        </button>
      }
    >
      <div className={styles.content}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          urlTransform={markdownUrlTransform}
          components={markdownComponents}
        >
          {readme}
        </ReactMarkdown>
      </div>
    </Dialog>
  );
}
