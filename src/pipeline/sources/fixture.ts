import type { SourceDefinition, SourceItem } from '../types';
import { itemFromParts, type SourceConnector } from './connector';
import { demoFeed, type FixtureEntry } from '../fixtures/demo-feed';

/**
 * Conector de prueba: devuelve ítems fijos de `fixtures/demo-feed.ts` para la
 * fuente indicada. Sirve para correr el pipeline completo sin red, en la demo y
 * en los tests. Los ítems son ficticios y así están marcados.
 */
export class FixtureConnector implements SourceConnector {
  constructor(
    readonly source: SourceDefinition,
    private readonly entries: FixtureEntry[] = demoFeed,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async fetchItems({ since }: { since: Date }): Promise<SourceItem[]> {
    const now = this.now();
    return this.entries
      .filter((e) => e.sourceId === this.source.id)
      .map((e) => ({ ...e, publishedAt: new Date(now.getTime() - e.minutesAgo * 60_000).toISOString() }))
      .filter((e) => new Date(e.publishedAt) >= since)
      .map((e) => itemFromParts(this.source, e, now));
  }
}
