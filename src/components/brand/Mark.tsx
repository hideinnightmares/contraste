/**
 * Isotipo de Contraste: un círculo partido, mitad tinta y mitad resaltador.
 * Es la idea del medio (dos fuentes frente a frente) y también el ícono del
 * selector de tema.
 */
export function Mark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M12 1.5a10.5 10.5 0 0 1 0 21Z" fill="var(--highlight, #ffd60a)" />
      <path d="M12 1.5a10.5 10.5 0 0 0 0 21Z" fill="currentColor" />
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
