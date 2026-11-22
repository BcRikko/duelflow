import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

function isAllowedMarkdownUrl(url: string): boolean {
  if (url === '') return true;
  if (/^https?:\/\//i.test(url)) return true;
  if (url.startsWith('#')) return true;
  // 同じオリジン内の相対パスを許可する（javascript: などのスキーム付きURLはブロック）
  return !/^[a-z][a-z0-9+.-]*:/i.test(url);
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

type Props = {
  children: string;
};

export default function MarkdownContent({ children }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      urlTransform={markdownUrlTransform}
      components={markdownComponents}
    >
      {children}
    </ReactMarkdown>
  );
}
