/**
 * Secciones del diario.
 *
 * Para agregar una sección basta con sumar un objeto a esta lista: la navegación,
 * las páginas de sección, el sitemap, el buscador y el clasificador automático del
 * pipeline la toman de acá. Para quitarla, se elimina el objeto (las notas que la
 * usen fallan la validación del repositorio, así nada queda huérfano en silencio).
 */
export type SectionLayout =
  /** Una nota grande con foto y una columna de titulares. */
  | 'lead-and-list'
  /** Foto a todo el ancho con el título encima. Para secciones visuales. */
  | 'feature'
  /** Tres notas en columnas de distinto peso. */
  | 'columns'
  /** Solo titulares, sin fotos. Para secciones de lectura rápida. */
  | 'headlines';

export interface CategoryConfig {
  slug: string;
  name: string;
  description: string;
  /** Palabras clave que usa el clasificador basado en reglas del pipeline. */
  keywords: string[];
  layout: SectionLayout;
  showOnHome: boolean;
}

export const categories: CategoryConfig[] = [
  {
    slug: 'politica',
    name: 'Política',
    description: 'Gobierno, Congreso, elecciones y decisiones públicas, con las fuentes de cada dato.',
    keywords: ['gobierno', 'congreso', 'ley', 'proyecto de ley', 'elecciones', 'votación', 'legislatura', 'municipio', 'intendencia', 'ministerio', 'senado', 'diputados'],
    layout: 'lead-and-list',
    showOnHome: true,
  },
  {
    slug: 'economia',
    name: 'Economía',
    description: 'Precios, empleo, consumo y finanzas públicas explicados con datos y contexto.',
    keywords: ['inflación', 'precios', 'dólar', 'tasas', 'salarios', 'consumo', 'cosecha', 'exportaciones', 'impuestos', 'banco central', 'cuotas'],
    layout: 'lead-and-list',
    showOnHome: true,
  },
  {
    slug: 'mundo',
    name: 'Mundo',
    description: 'Lo que pasa fuera del país y por qué importa acá.',
    keywords: ['cumbre', 'internacional', 'aranceles', 'acuerdo', 'naciones', 'europa', 'asia', 'áfrica', 'comercio exterior', 'rutas marítimas'],
    layout: 'columns',
    showOnHome: true,
  },
  {
    slug: 'tecnologia',
    name: 'Tecnología',
    description: 'Inteligencia artificial, conectividad, plataformas y seguridad digital.',
    keywords: ['inteligencia artificial', 'modelo de lenguaje', 'datos', '5g', 'aplicación', 'estafa', 'ciberseguridad', 'software', 'conectividad', 'plataforma'],
    layout: 'columns',
    showOnHome: true,
  },
  {
    slug: 'ciencia',
    name: 'Ciencia',
    description: 'Investigación, ambiente y descubrimientos, con el estado real de cada hallazgo.',
    keywords: ['investigadores', 'especie', 'telescopio', 'estudio', 'clima', 'la niña', 'universidad', 'laboratorio', 'biodiversidad'],
    layout: 'headlines',
    showOnHome: true,
  },
  {
    slug: 'cultura',
    name: 'Cultura',
    description: 'Cine, música, artes y libros.',
    keywords: ['cine', 'estreno', 'muestra', 'museo', 'festival', 'música', 'libro', 'teatro', 'fotografía'],
    layout: 'feature',
    showOnHome: true,
  },
  {
    slug: 'deportes',
    name: 'Deportes',
    description: 'Resultados, torneos y el deporte que se juega en los barrios.',
    keywords: ['partido', 'torneo', 'final', 'gol', 'maratón', 'básquet', 'fútbol', 'campeonato', 'club'],
    layout: 'columns',
    showOnHome: true,
  },
  {
    slug: 'sociedad',
    name: 'Sociedad',
    description: 'Ciudades, educación, salud, transporte y la vida cotidiana.',
    keywords: ['escuelas', 'transporte', 'colectivo', 'calor', 'salud', 'barrio', 'vecinos', 'educación', 'ciudad'],
    layout: 'lead-and-list',
    showOnHome: true,
  },
  {
    slug: 'negocios',
    name: 'Negocios',
    description: 'Empresas, emprendimientos y los cambios en cómo se produce y se vende.',
    keywords: ['pymes', 'empresa', 'comercio electrónico', 'emprendimiento', 'ventas', 'mercado', 'exportadoras', 'inversión'],
    layout: 'headlines',
    showOnHome: true,
  },
  {
    slug: 'tendencias',
    name: 'Tendencias',
    description: 'Hábitos, consumo cultural y formas nuevas de vivir la ciudad.',
    keywords: ['bicicleta', 'huerta', 'vinilo', 'hábitos', 'tendencia', 'moda', 'consumo'],
    layout: 'feature',
    showOnHome: true,
  },
];

const bySlug = new Map(categories.map((c) => [c.slug, c]));

export function getCategory(slug: string): CategoryConfig | undefined {
  return bySlug.get(slug);
}

export function requireCategory(slug: string): CategoryConfig {
  const category = bySlug.get(slug);
  if (!category) throw new Error(`Sección desconocida: "${slug}". Revisá src/config/categories.ts.`);
  return category;
}
