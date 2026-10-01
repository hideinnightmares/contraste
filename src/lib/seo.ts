import type { Metadata } from 'next';
import { absoluteUrl, site } from '@/config/site';
import { editorial } from '@/config/editorial';
import { getCategory } from '@/config/categories';
import type { Article, ContentType } from '@/domain/types';
import { truncate } from '@/domain/text';

/**
 * Metadatos y datos estructurados.
 *
 * Política de indexación: el contenido DEMO es ficticio y no debe aparecer en
 * buscadores. Toda nota marcada `isDemo` sale con `noindex` y queda fuera de los
 * sitemaps, aunque el resto del marcado (canonical, Open Graph, NewsArticle) se
 * genera igual para poder revisarlo.
 */

export const articlePath = (slug: string) => `/nota/${slug}`;
export const sectionPath = (slug: string) => `/seccion/${slug}`;
export const tagPath = (slug: string) => `/tema/${slug}`;

/**
 * Un tema tiene página propia desde esta cantidad de notas. Con menos aporta poco
 * (no se indexa) y gasta archivos del sitio estático: se enlaza a la búsqueda
 * filtrada por ese tema, que muestra las mismas notas. Ver docs/DESPLIEGUE.md.
 */
export const MIN_NOTES_FOR_TAG_PAGE = 3;

export const tagHref = (slug: string, count: number) =>
  count >= MIN_NOTES_FOR_TAG_PAGE ? tagPath(slug) : `/buscar?tema=${encodeURIComponent(slug)}`;

/** Página n de un listado: la primera es la dirección base; las siguientes, `/pagina/n`. */
export const pagedPath = (base: string, page: number) => (page > 1 ? `${base}/pagina/${page}` : base);

export function robotsFor(isDemo: boolean): Metadata['robots'] {
  return isDemo
    ? { index: false, follow: true, googleBot: { index: false, follow: true } }
    : { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } };
}

export function articleMetadata(article: Article): Metadata {
  const title = truncate(article.seo.title ?? article.title, editorial.seo.maxTitleLength);
  const description = truncate(article.seo.description ?? article.dek, editorial.seo.maxDescriptionLength);
  const url = articlePath(article.slug);
  const section = getCategory(article.category)?.name;
  const images = article.image
    ? [{ url: article.image.src, width: article.image.width, height: article.image.height, alt: article.image.alt }]
    : undefined;
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: robotsFor(article.isDemo),
    openGraph: {
      type: 'article',
      url,
      title,
      description,
      siteName: site.name,
      locale: 'es_AR',
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      section,
      tags: article.tags,
      images,
    },
    twitter: {
      card: images ? 'summary_large_image' : 'summary',
      title,
      description,
      images: images?.map((i) => i.url),
    },
    other: section ? { 'article:section': section } : undefined,
  };
}

const schemaType: Record<ContentType, string> = {
  noticia: 'NewsArticle',
  breve: 'NewsArticle',
  analisis: 'AnalysisNewsArticle',
  explicador: 'BackgroundNewsArticle',
};

export function organizationJsonLd() {
  return {
    '@type': 'NewsMediaOrganization',
    '@id': absoluteUrl('/#organizacion'),
    name: site.name,
    url: absoluteUrl('/'),
    logo: { '@type': 'ImageObject', url: absoluteUrl('/brand/logo-512.png'), width: 512, height: 512 },
    ...(site.organization.legalName ? { legalName: site.organization.legalName } : {}),
    ...(site.organization.contactEmail ? { email: site.organization.contactEmail } : {}),
    publishingPrinciples: absoluteUrl('/metodologia'),
    correctionsPolicy: absoluteUrl('/metodologia#correcciones'),
    verificationFactCheckingPolicy: absoluteUrl('/metodologia#verificacion'),
  };
}

export function articleJsonLd(article: Article) {
  const url = absoluteUrl(articlePath(article.slug));
  return {
    '@context': 'https://schema.org',
    '@type': schemaType[article.type],
    '@id': `${url}#nota`,
    mainEntityOfPage: url,
    url,
    headline: truncate(article.title, 110),
    description: article.dek,
    image: article.image ? [absoluteUrl(article.image.src)] : undefined,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    inLanguage: site.locale,
    articleSection: getCategory(article.category)?.name,
    keywords: article.tags.join(', '),
    isAccessibleForFree: true,
    author: {
      '@type': 'Organization',
      name: article.byline.name,
      url: absoluteUrl('/metodologia'),
    },
    publisher: organizationJsonLd(),
    citation: article.sources
      .filter((s) => s.url)
      .map((s) => ({ '@type': 'CreativeWork', name: s.name, url: s.url })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      organizationJsonLd(),
      {
        '@type': 'WebSite',
        '@id': absoluteUrl('/#sitio'),
        url: absoluteUrl('/'),
        name: site.name,
        description: site.description,
        inLanguage: site.locale,
        publisher: { '@id': absoluteUrl('/#organizacion') },
      },
    ],
  };
}

/** Serializa JSON-LD escapando `<` para que el contenido no pueda cerrar el `<script>`. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
