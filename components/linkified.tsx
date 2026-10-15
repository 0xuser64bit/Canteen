import { Fragment } from "react";

const URL_PATTERN = /\bhttps?:\/\/[^\s<>"']+/g;

/** Plain text with bare URLs turned into links. React escapes everything else. */
export function Linkified({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    // Sentence punctuation right after a URL belongs to the sentence.
    const url = match[0].replace(/[.,!?;:)\]]+$/, "");
    const start = match.index;
    parts.push(text.slice(last, start));
    parts.push(
      <a
        key={start}
        href={url}
        target="_blank"
        rel="nofollow noopener noreferrer ugc"
        className="font-medium break-all underline decoration-current/40 hover:decoration-current"
      >
        {url}
      </a>,
    );
    last = start + url.length;
  }
  parts.push(text.slice(last));
  return parts.map((part, i) => <Fragment key={i}>{part}</Fragment>);
}
