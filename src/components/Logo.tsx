import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
      {...props}
    >
      <path
        d="M24 2L6 14v20l18 12 18-12V14L24 2z"
        fill="#863bff"
        stroke="#fff"
        strokeWidth="2"
      />
      <path
        d="M24 12l-9 6v12l9 6 9-6V18l-9-6z"
        fill="#fff"
      />
      <path
        d="M20 22l4-3 4 3-4 8-4-8z"
        fill="#863bff"
      />
    </svg>
  );
}
