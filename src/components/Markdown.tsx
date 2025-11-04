import { useMemo } from "react";
import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";

interface MarkdownProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

// Initialize markdown-it once
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true, // Convert \n to <br>
});

export function Markdown({ content, className, style }: MarkdownProps) {
  // Memoize the rendered HTML to avoid re-rendering on every render
  const html = useMemo(() => {
    const rendered = md.render(content);
    return DOMPurify.sanitize(rendered);
  }, [content]);

  return (
    <div
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
