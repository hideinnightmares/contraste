import { getRepository } from '@/data';
import { newsSitemap } from '@/lib/feeds';

export const dynamic = 'force-static';

export async function GET() {
  const articles = await getRepository().listAllPublished();
  return new Response(newsSitemap(articles, new Date()), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
