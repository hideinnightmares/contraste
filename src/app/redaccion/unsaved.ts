'use client';

import { useEffect } from 'react';

const MESSAGE = 'Hay cambios sin guardar. Si salís ahora, se pierden.';

/** Si el editor tiene cambios sin guardar (lo actualiza `useUnsavedChangesGuard`). */
let pending = false;

/** ¿Se puede dejar la nota? Si hay cambios sin guardar, lo pregunta. */
export function confirmLeave(): boolean {
  return !pending || window.confirm(MESSAGE);
}

/**
 * Mientras haya cambios sin guardar, pide confirmación antes de cerrar o recargar la pestaña y
 * antes de seguir un enlace de la página: los de Next.js navegan sin recargar, así que el aviso
 * propio del navegador no alcanza. Los enlaces que abren otra pestaña no preguntan.
 */
export function useUnsavedChangesGuard(dirty: boolean) {
  useEffect(() => {
    pending = dirty;
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    // En captura y sobre el documento: corre antes que el manejador del enlace de Next.js.
    const onClick = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!link || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (link.getAttribute('target') === '_blank' || link.getAttribute('href')?.startsWith('#')) return;
      if (window.confirm(MESSAGE)) {
        // Ya lo confirmó: si el enlace recarga la página, que el navegador no vuelva a preguntar.
        window.removeEventListener('beforeunload', onBeforeUnload);
      } else {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      pending = false;
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty]);
}
