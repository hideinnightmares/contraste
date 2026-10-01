/**
 * Verifica el contraste WCAG 2.2 de los pares de color que usa la interfaz, en
 * modo claro, modo oscuro y en la banda invertida. Lee los valores directamente
 * de src/app/globals.css, así que si alguien cambia un color, este control lo ve.
 *
 *   npm run check:contrast
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

const css = readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No se encontró el bloque ${selector}`);
  const body = css.slice(start, css.indexOf('}', start));
  const vars: Record<string, string> = {};
  for (const m of body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)) vars[m[1]] = m[2].toLowerCase();
  return vars;
}

const light = block(':root');
const dark = { ...light, ...block(":root[data-theme='dark']") };
const invert = { ...light, ...block('.invert') };
const band = { ...light, ...block('.highlight-band') };

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** [texto, fondo, mínimo, para qué] — 4.5 texto normal, 3 componentes de interfaz. */
const pairs: [string, string, number, string][] = [
  ['ink', 'paper', 7, 'Texto principal (AAA)'],
  ['ink-2', 'paper', 4.5, 'Texto secundario'],
  ['ink-2', 'mist', 4.5, 'Texto secundario sobre panel'],
  ['ink-3', 'paper', 4.5, 'Metadatos'],
  ['ink-3', 'mist', 4.5, 'Metadatos sobre panel'],
  ['accent', 'paper', 4.5, 'Secciones y enlaces'],
  ['accent', 'mist', 4.5, 'Enlaces sobre panel'],
  ['on-accent', 'accent', 4.5, 'Botón con acento'],
  ['paper', 'ink', 4.5, 'Botón principal'],
  ['ink', 'accent-wash', 4.5, 'Coincidencias resaltadas en búsqueda'],
  ['verified', 'paper', 4.5, 'Estado verificado'],
  ['verified', 'mist', 4.5, 'Estado verificado sobre panel'],
  ['verified', 'verified-wash', 4.5, 'Confirmación de suscripción'],
  ['disputed', 'paper', 4.5, 'Estado en disputa / errores'],
  ['disputed', 'mist', 4.5, 'Errores sobre panel'],
  ['disputed', 'disputed-wash', 4.5, 'Nota de contradicción'],
  ['demo', 'demo-wash', 4.5, 'Marca DEMO'],
  ['demo', 'mist', 4.5, 'Aviso DEMO sobre panel'],
  ['on-highlight', 'highlight', 4.5, 'Etiqueta de sección sobre resaltador'],
  ['link', 'paper', 4.5, 'Enlaces en texto corrido'],
  ['ad-ink', 'ad-surface', 4.5, 'Etiqueta "Publicidad"'],
  ['ink-3', 'ad-surface', 4.5, 'Texto del marcador publicitario'],
  ['ink-3', 'paper', 3, 'Bordes de campos de formulario (componente)'],
];

/** Pares que solo existen en superficies oscuras: texto amarillo sobre negro. */
const darkOnly: [string, string, number, string][] = [['highlight', 'paper', 4.5, 'Horarios y avisos en amarillo sobre negro']];

let failures = 0;
const palettes: [string, Record<string, string>, [string, string, number, string][]][] = [
  ['Modo claro', light, []],
  ['Modo oscuro', dark, darkOnly],
  ['Banda invertida', invert, darkOnly],
  ['Banda amarilla', band, []],
];
for (const [name, palette, extra] of palettes) {
  console.log(`\n${name}`);
  for (const [fg, bg, min, label] of [...pairs, ...extra]) {
    const a = palette[fg];
    const b = palette[bg];
    if (!a || !b) {
      console.log(`  ?  ${label}: falta --${!a ? fg : bg}`);
      failures++;
      continue;
    }
    const r = ratio(a, b);
    const ok = r >= min;
    if (!ok) failures++;
    console.log(`  ${ok ? 'ok' : 'NO'} ${r.toFixed(2).padStart(5)}:1 (mín. ${min}) ${label}  [--${fg} ${a} / --${bg} ${b}]`);
  }
}

// Titulares blancos sobre foto: peor caso, foto blanca bajo el degradé en su punto más claro con texto (~0.62 de opacidad).
const scrimAlpha = 0.62;
const blended = '#' + [5, 10, 20].map((c) => Math.round(c * scrimAlpha + 255 * (1 - scrimAlpha)).toString(16).padStart(2, '0')).join('');
const overlay = ratio('#ffffff', blended);
console.log(`\nTexto sobre foto (peor caso): ${overlay.toFixed(2)}:1 (mín. 4.5, con sombra de texto adicional)`);
if (overlay < 4.5) failures++;

console.log(failures === 0 ? '\nTodos los pares cumplen.' : `\n${failures} par(es) no cumplen.`);
process.exitCode = failures === 0 ? 0 : 1;
