import type { Article } from '@/domain/types';
import { InMemoryArticleRepository } from './in-memory-repository';
import { RepositoryError } from './repository';
import { readSnapshot, SNAPSHOT_PATH, toArticle } from './snapshot';

/**
 * Notas publicadas en la base de datos, leídas de la foto que `scripts/sync-content.ts`
 * descarga antes de cada armado (`CONTENT_SOURCE=database`).
 *
 * Las notas de demostración (`isDemo`) solo se muestran si el sitio está en modo
 * demostración: con contenido real, una nota ficticia nunca llega a la portada.
 */
export class SnapshotArticleRepository extends InMemoryArticleRepository {
  protected readonly label = 'La base de datos';

  constructor(
    clock: () => Date = () => new Date(),
    private readonly options: { demoMode: boolean; file?: string },
  ) {
    super(clock);
  }

  protected async corpus(): Promise<Article[]> {
    const file = this.options.file ?? SNAPSHOT_PATH;
    const snapshot = readSnapshot(file);
    if (!snapshot) {
      throw new RepositoryError(
        `No existe la foto de la base (${file}). La descarga \`npm run content:sync\`, que corre solo antes de \`npm run build\`.`,
      );
    }
    return snapshot.rows.map(toArticle).filter((a) => this.options.demoMode || !a.isDemo);
  }
}
