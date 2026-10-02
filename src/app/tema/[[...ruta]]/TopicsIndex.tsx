import Link from 'next/link';
import { Breadcrumbs } from '@/components/article/Breadcrumbs';
import { PageHeader } from '@/components/listing/PageHeader';
import { TopicChips } from '@/components/listing/TopicChips';
import { MIN_NOTES_FOR_TAG_PAGE } from '@/lib/seo';
import styles from '../../listing.module.css';

/** `/tema`: los temas con página propia. Sin ninguno todavía, lo dice y ofrece el buscador. */
export function TopicsIndex({ topics }: { topics: { slug: string; name: string; count: number }[] }) {
  return (
    <div className={`container ${styles.page}`}>
      <Breadcrumbs items={[{ name: 'Inicio', path: '/' }, { name: 'Temas', path: '/tema' }]} />
      <PageHeader title="Temas" description={`Los temas con ${MIN_NOTES_FOR_TAG_PAGE} notas o más. Los demás se encuentran con el buscador.`} />
      {topics.length > 0 ? (
        <TopicChips topics={topics} />
      ) : (
        <p className={styles.empty}>
          Todavía no hay temas con {MIN_NOTES_FOR_TAG_PAGE} notas o más. Mientras tanto, podés <Link href="/buscar">buscar por tema</Link> o
          recorrer las <Link href="/ultimas">últimas noticias</Link>.
        </p>
      )}
    </div>
  );
}
