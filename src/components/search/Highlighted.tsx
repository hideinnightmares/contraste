import type { Highlight } from '@/domain/search';

/** Renderiza un texto con sus coincidencias marcadas, sin HTML inyectado. */
export function Highlighted({ value, className }: { value: Highlight; className?: string }) {
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  value.ranges.forEach(([start, end], i) => {
    if (start > cursor) parts.push(value.text.slice(cursor, start));
    parts.push(
      <mark key={i} className={className}>
        {value.text.slice(start, end)}
      </mark>,
    );
    cursor = end;
  });
  if (cursor < value.text.length) parts.push(value.text.slice(cursor));
  return <>{parts}</>;
}
