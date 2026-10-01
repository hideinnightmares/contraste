import { Activity, CircleCheck, CircleDashed, TriangleAlert } from 'lucide-react';
import type { VerificationStatus } from '@/domain/types';
import { sourcesPhrase, verificationLabel } from '@/domain/labels';
import styles from './SourceMeter.module.css';

const icons = {
  verified: CircleCheck,
  partial: CircleDashed,
  developing: Activity,
  disputed: TriangleAlert,
  unverified: CircleDashed,
} as const;

export function verificationPhrase(status: VerificationStatus, sourceCount: number): string {
  const n = sourcesPhrase(sourceCount);
  switch (status) {
    case 'verified':
      return `Verificada con ${n}`;
    case 'partial':
      return `Verificación parcial, ${n}`;
    case 'developing':
      return `En desarrollo, ${n}`;
    case 'disputed':
      return `${n}, con diferencias entre ellas`;
    case 'unverified':
      return `Sin verificar, ${n}`;
  }
}

/**
 * Medidor de fuentes: un segmento por fuente consultada. Los segmentos llenos son
 * fuentes independientes; si hay desacuerdo, el último se marca rayado. El texto
 * dice lo mismo que el dibujo, así el estado no depende del color ni de la forma.
 */
export function SourceMeter({
  status,
  sourceCount,
  independent,
  size = 'small',
}: {
  status: VerificationStatus;
  sourceCount: number;
  independent: number;
  size?: 'small' | 'large';
}) {
  const Icon = icons[status];
  const segments = Math.min(Math.max(sourceCount, 1), 6);
  return (
    <span className={`${styles.meter} ${styles[size]}`} data-status={status} title={verificationLabel[status].long}>
      <span className={styles.bars} aria-hidden="true">
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className={styles.bar}
            data-kind={status === 'disputed' && i === segments - 1 ? 'disputed' : i < independent ? 'independent' : 'other'}
          />
        ))}
      </span>
      <Icon className={styles.icon} size={size === 'large' ? 18 : 14} strokeWidth={2} aria-hidden="true" />
      <span className={styles.text}>{verificationPhrase(status, sourceCount)}</span>
    </span>
  );
}
