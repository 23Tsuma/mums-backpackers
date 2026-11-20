import { NextResponse } from 'next/server';
import { getStoredPropertyImage } from '@/lib/server/properties';
import { readPropertyImage } from '@/lib/server/property-images';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: { imageId: string } },
) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(context.params.imageId)) {
    return new Response('Not found.', { status: 404 });
  }

  try {
    const image = await getStoredPropertyImage(context.params.imageId);
    if (!image) return new Response('Not found.', { status: 404 });
    const buffer = await readPropertyImage(image.storagePath);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : 'UnknownError';
    console.error('Property image could not be loaded.', { code });
    return new Response('Image temporarily unavailable.', { status: 503 });
  }
}
