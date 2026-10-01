'use client';

import { useId } from 'react';
import { site } from '@/config/site';

const OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: site.timeZone,
};

function format(date: Date) {
  const s = new Intl.DateTimeFormat(site.locale, OPTIONS).format(date);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Fecha del día en Buenos Aires. Las páginas se generan estáticamente y pueden
 * tener horas de antigüedad: un script en línea corrige el texto antes del primer
 * pintado, así la fecha nunca queda vieja después de medianoche.
 */
export function TodayDate({ className }: { className?: string }) {
  const id = useId();
  const now = new Date();
  const script = `(function(){var n=document.getElementById(${JSON.stringify(id)});if(!n)return;var d=new Date();var s=new Intl.DateTimeFormat(${JSON.stringify(site.locale)},${JSON.stringify(OPTIONS)}).format(d);n.textContent=s.charAt(0).toUpperCase()+s.slice(1);n.setAttribute('datetime',d.toISOString().slice(0,10))})()`;
  return (
    <>
      <time id={id} className={className} dateTime={now.toISOString().slice(0, 10)} suppressHydrationWarning>
        {format(now)}
      </time>
      <script
        type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: script }}
      />
    </>
  );
}
