'use client';

import { useEffect, useState } from 'react';
import { Check, Link2, Mail, Share2 } from 'lucide-react';
import styles from './ShareBar.module.css';

/**
 * Compartir sin scripts de terceros: enlaces simples a cada red (ninguna carga
 * nada hasta que la persona hace clic), copiar enlace y, en teléfonos, el menú
 * nativo de compartir del sistema.
 */
export function ShareBar({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    // Detección de capacidad del navegador; solo existe del lado del cliente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2400);
    return () => window.clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt('Copiá el enlace:', url);
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title, url });
    } catch {
      // La persona canceló o el sistema no pudo compartir: no hace falta avisar.
    }
  };

  const e = encodeURIComponent;
  const links = [
    { name: 'WhatsApp', href: `https://wa.me/?text=${e(`${title} ${url}`)}` },
    { name: 'X', href: `https://x.com/intent/tweet?text=${e(title)}&url=${e(url)}` },
    { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${e(url)}` },
    { name: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${e(url)}` },
  ];

  return (
    <div className={styles.bar} role="group" aria-label="Compartir esta nota">
      {canNativeShare && (
        <button type="button" className={styles.button} onClick={nativeShare}>
          <Share2 size={16} strokeWidth={2} aria-hidden="true" />
          Compartir
        </button>
      )}
      <button type="button" className={styles.button} onClick={copy} data-copied={copied}>
        {copied ? <Check size={16} strokeWidth={2.25} aria-hidden="true" /> : <Link2 size={16} strokeWidth={2} aria-hidden="true" />}
        <span aria-live="polite">{copied ? 'Enlace copiado' : 'Copiar enlace'}</span>
      </button>
      {links.map((l) => (
        <a key={l.name} className={styles.link} href={l.href} target="_blank" rel="noopener noreferrer">
          {l.name}
          <span className="visually-hidden"> (abre en una pestaña nueva)</span>
        </a>
      ))}
      <a className={styles.link} href={`mailto:?subject=${e(title)}&body=${e(url)}`}>
        <Mail size={16} strokeWidth={2} aria-hidden="true" />
        Email
      </a>
    </div>
  );
}
