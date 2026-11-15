import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

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
