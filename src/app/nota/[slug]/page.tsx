import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ViewTransition } from 'react';
import { getCategory } from '@/config/categories';
import { absoluteUrl } from '@/config/site';
import { getRepository } from '@/data';
import { formatFull } from '@/domain/dates';
import { contentTypeLabel } from '@/domain/labels';
import { relatedTo } from '@/domain/related';
import { toSummary } from '@/domain/summary';
import { readingMinutes } from '@/domain/text';
import { articleJsonLd, articleMetadata, articlePath, sectionPath, serializeJsonLd } from '@/lib/seo';
import { Breadcrumbs } from '@/components/article/Breadcrumbs';
import { ArticleBody } from '@/components/article/ArticleBody';
import { VerificationPanel } from '@/components/article/VerificationPanel';
import { ShareBar } from '@/components/article/ShareBar';
import { PrevNext, TagList, UpdatesLog } from '@/components/article/ArticleExtras';
import { StoryImage } from '@/components/story/StoryImage';
import { StoryCard } from '@/components/story/StoryCard';
import { SourceMeter } from '@/components/story/SourceMeter';
import { DemoNotice, DemoTag } from '@/components/demo/DemoStrip';
import { AdSlot } from '@/components/ads/AdSlot';
import { Recommended } from '@/components/home/Recommended';
import { SectionHeading } from '@/components/home/SectionHeading';
import styles from './page.module.css';

// Solo existen las notas generadas al armar el sitio; el resto es 404.
export const dynamicParams = false;

export async function generateStaticParams() {
  const articles = await getRepository().listAllPublished();
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps<'/nota/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const article = await getRepository().getBySlug(slug);
  if (!article) return { title: 'Nota no encontrada', robots: { index: false } };
  return articleMetadata(article);
}

export default async function ArticlePage({ params }: PageProps<'/nota/[slug]'>) {
  const { slug } = await params;
  const repo = getRepository();
  const article = await repo.getBySlug(slug);
  if (!article) notFound();

  const now = new Date();
  const category = getCategory(article.category);
  const [all, adjacent, tags] = await Promise.all([repo.listAllPublished(), repo.getAdjacent(slug), repo.listTags()]);
  const tagCounts = new Map(tags.map((t) => [t.slug, t.count]));
  const summaries = all.map(toSummary);
  const related = relatedTo(article, summaries, 3);
  const exclude = new Set([article.id, ...related.map((r) => r.id), adjacent.previous?.id, adjacent.next?.id]);
  const recommended = summaries
    .filter((a) => !exclude.has(a.id) && a.type !== 'breve' && a.category !== article.category && a.image)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 4);

  const typeLabel = contentTypeLabel[article.type];
  const updated = article.updatedAt !== article.publishedAt;
  const url = absoluteUrl(articlePath(article.slug));

  return (
    <ViewTransition enter="page-fade" exit="page-fade" default="none">
      <article className={styles.article} data-type={article.type}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleJsonLd(article)) }} />
        <div className={styles.progress} aria-hidden="true" />

        <header className="container">
          <div className={styles.header}>
            <Breadcrumbs
              items={[
                { name: 'Inicio', path: '/' },
                ...(category ? [{ name: category.name, path: sectionPath(category.slug) }] : []),
                { name: article.title, path: articlePath(article.slug) },
              ]}
            />
            <p className={styles.kicker}>
              {category && (
                <Link href={sectionPath(category.slug)} className={styles.section}>
                  {category.name}
                </Link>
              )}
              {typeLabel && <span className={styles.type}>{typeLabel}</span>}
              {article.live && (
                <span className={styles.live}>
                  <span className={styles.pulse} aria-hidden="true" />
                  En desarrollo
                </span>
              )}
              {article.isDemo && <DemoTag />}
            </p>
            <h1 className={styles.title}>{article.title}</h1>
            <p className={styles.dek}>{article.dek}</p>

            <div className={styles.meta}>
              <div className={styles.byline}>
                <p className={styles.author}>{article.byline.name}</p>
                <p className={styles.authorNote}>
                  Redacción asistida por sistemas automáticos y revisada por la edición.{' '}
                  <Link href="/metodologia">Cómo trabajamos</Link>
                </p>
              </div>
              <dl className={styles.dates}>
                <div>
                  <dt>Publicada</dt>
                  <dd>
                    <time dateTime={article.publishedAt}>{formatFull(article.publishedAt)}</time>
                  </dd>
                </div>
                {updated && (
                  <div>
                    <dt>Actualizada</dt>
                    <dd>
                      <time dateTime={article.updatedAt}>{formatFull(article.updatedAt)}</time>
                    </dd>
                  </div>
                )}
                <div>
                  <dt>Lectura</dt>
                  <dd>{readingMinutes(article.body)} min</dd>
                </div>
              </dl>
              <a href="#fuentes" className={styles.sourcesLink}>
                <SourceMeter
                  status={article.verification.status}
                  sourceCount={article.sources.length}
                  independent={article.verification.independentSources}
                />
                <span className="visually-hidden">: ver las fuentes consultadas</span>
              </a>
            </div>
          </div>
        </header>

        {article.image && (
          <figure className={`container ${styles.hero}`}>
            <StoryImage
              image={article.image}
              articleId={article.id}
              ratio="16 / 9"
              sizes="(min-width: 86rem) 86rem, 100vw"
              preload
              className={`${styles.heroImage} photo-color`}
            />
            <figcaption className={styles.caption}>
              {article.image.caption && <span>{article.image.caption} </span>}
              <span className={styles.credit}>
                Foto: {article.image.credit.author}.{' '}
                {article.image.credit.licenseUrl ? (
                  <a href={article.image.credit.licenseUrl} target="_blank" rel="noopener noreferrer license">
                    {article.image.credit.license}
                  </a>
                ) : (
                  article.image.credit.license
                )}
                ,{' '}
                <a href={article.image.credit.sourceUrl} target="_blank" rel="noopener noreferrer">
                  Wikimedia Commons
                </a>
                .
              </span>
            </figcaption>
          </figure>
        )}

        <div className={`container ${styles.layout}`}>
          <div className={styles.main}>
            {article.isDemo && <DemoNotice />}
            <ArticleBody blocks={article.body} />
            <div className={styles.after}>
              <TagList tags={article.tags} counts={tagCounts} />
              <ShareBar url={url} title={article.title} />
              <VerificationPanel article={article} />
              <UpdatesLog updates={article.updates} publishedAt={article.publishedAt} />
              <PrevNext previous={adjacent.previous} next={adjacent.next} />
            </div>
          </div>
          <div className={styles.rail}>
            <AdSlot position="article-sidebar" variant="sidebar" />
          </div>
        </div>

        {related.length > 0 && (
          <section className={`container ${styles.related}`} aria-labelledby="relacionadas">
            <SectionHeading id="relacionadas" title="Relacionadas" />
            <ul role="list" className={styles.relatedList}>
              {related.map((r) => (
                <li key={r.id}>
                  <StoryCard article={r} variant={r.image ? 'standard' : 'text'} size="s" now={now} showDek={!r.image} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="container">
          <Recommended items={recommended} now={now} title="También te puede interesar" id="recomendadas" />
        </div>
      </article>
    </ViewTransition>
  );
}
