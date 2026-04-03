import { getPublishedCardBySlug } from '@/lib/public-card';
import { sanitizeFileName } from '@/lib/utils';
import { buildVCardFromCard } from '@/lib/vcard';

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const card = await getPublishedCardBySlug(slug);

  if (!card) {
    return new Response('Not found', { status: 404 });
  }

  const body = buildVCardFromCard(card);
  const filename = `${sanitizeFileName(slug)}.vcf`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, max-age=60',
    },
  });
}
