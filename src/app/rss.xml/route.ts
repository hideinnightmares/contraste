import { getRepository } from '@/data';
import { rssFeed } from '@/lib/feeds';

export const dynamic = 'force-static';

export async function GET() {
  const articles = await getRepository().listAllPublished();
  return new Response(rssFeed(articles), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
