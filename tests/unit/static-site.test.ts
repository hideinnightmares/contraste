import { afterEach, describe, expect, it, vi } from 'vitest';
import { demoArticles } from '@/content/demo';
import { IMAGE_WIDTHS } from '@/config/images';
import { formatTimelineTime } from '@/domain/dates';
import { buildIndex, search, toSearchDocument, type SearchDocument } from '@/domain/search';
import imageLoader from '@/lib/image-loader';
import { pageCount, pageFromSegments, pageSegments } from '@/lib/paging';
import { MIN_NOTES_FOR_TAG_PAGE, pagedPath, tagHref } from '@/lib/seo';

const NOW = new Date('2026-10-01T13:00:00Z');

describe('paginación en la dirección', () => {
  it('lee la página de los segmentos y rechaza lo que no es una página válida', () => {
    expect(pageFromSegments(undefined)).toBe(1);
    expect(pageFromSegments([])).toBe(1);
    expect(pageFromSegments(['pagina', '2'])).toBe(2);
    expect(pageFromSegments(['pagina', '1'])).toBeNull(); // la 1 es la dirección base
    expect(pageFromSegments(['pagina', '02'])).toBeNull();
    expect(pageFromSegments(['pagina', 'dos'])).toBeNull();
    expect(pageFromSegments(['otra', '2'])).toBeNull();
    expect(pageFromSegments(['pagina', '2', 'extra'])).toBeNull();
  });

  it('genera siempre la página 1 y una entrada por página siguiente', () => {
    expect(pageCount(0, 10)).toBe(1);
    expect(pageCount(21, 10)).toBe(3);
    expect(pageSegments(pageCount(0, 10))).toEqual([[]]);
    expect(pageSegments(3)).toEqual([[], ['pagina', '2'], ['pagina', '3']]);
    expect(pagedPath('/seccion/economia', 1)).toBe('/seccion/economia');
    expect(pagedPath('/seccion/economia', 3)).toBe('/seccion/economia/pagina/3');
  });
});

describe('cargador de fotos', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('en producción apunta a la versión pregenerada del ancho más cercano por arriba', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(imageLoader({ src: '/images/demo/rana.jpg', width: 384 })).toBe('/_img/images/demo/rana-384.webp');
    expect(imageLoader({ src: '/images/demo/rana.jpg', width: 700 })).toBe('/_img/images/demo/rana-960.webp');
    expect(imageLoader({ src: '/images/demo/rana.jpg', width: 3840 })).toBe(`/_img/images/demo/rana-${IMAGE_WIDTHS.at(-1)}.webp`);
  });

  it('deja intactas las fotos externas y usa la original en desarrollo', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(imageLoader({ src: 'https://example.com/foto.jpg', width: 640 })).toBe('https://example.com/foto.jpg');
    vi.stubEnv('NODE_ENV', 'development');
    expect(imageLoader({ src: '/images/demo/rana.jpg', width: 640 })).toBe('/images/demo/rana.jpg?w=640');
  });
});

describe('temas', () => {
  it('solo los temas con suficientes notas tienen página propia; el resto va a la búsqueda filtrada', () => {
    expect(tagHref('clima', MIN_NOTES_FOR_TAG_PAGE)).toBe('/tema/clima');
    expect(tagHref('selva paranaense', MIN_NOTES_FOR_TAG_PAGE - 1)).toBe('/buscar?tema=selva%20paranaense');
  });
});

describe('fechas en la línea de tiempo', () => {
  it('muestra solo la hora si es de hoy y la fecha si es de otro día', () => {
    expect(formatTimelineTime('2026-10-01T12:40:00Z', NOW)).toBe('09:40');
    expect(formatTimelineTime('2026-09-30T12:40:00Z', NOW)).toBe('Ayer, 09:40');
  });
});

describe('índice de búsqueda publicado', () => {
  it('después de pasar por JSON busca igual que con las notas completas', () => {
    const documents = demoArticles(NOW).map(toSearchDocument);
    const roundTrip = JSON.parse(JSON.stringify(documents)) as SearchDocument[];
    const direct = search(buildIndex(documents), { q: 'densidad edilicia' });
    const published = search(buildIndex(roundTrip), { q: 'densidad edilicia' });
    expect(published.total).toBeGreaterThan(0);
    expect(published.hits.map((h) => h.article.slug)).toEqual(direct.hits.map((h) => h.article.slug));
  });

  it('no publica el cuerpo en bloques ni las fuentes: solo el resumen y el texto plano', () => {
    const [doc] = demoArticles(NOW).map(toSearchDocument);
    expect(Object.keys(doc).sort()).toEqual(['body', 'summary']);
    expect(typeof doc.body).toBe('string');
    expect(doc.summary).not.toHaveProperty('sources');
  });
});
