import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminFromRequest, isSameOriginRequest } from '@/lib/server/admin-auth';
import { isDatabaseConfigured } from '@/lib/server/mysql';
import {
  addPropertyImage,
  getAccommodationProperty,
} from '@/lib/server/properties';
import {
  deleteStoredPropertyImage,
  newPropertyImagePath,
  processPropertyImage,
  storePropertyImage,
} from '@/lib/server/property-images';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_REQUEST_BYTES = 5 * 1024 * 1024;
const metadataSchema = z.object({ altText: z.string().trim().max(180).optional() }).strict();

function validId(value: string): number | undefined {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 && id <= 255 ? id : undefined;
}

function logImageError(message: string, error: unknown): void {
  const code = error instanceof Error && 'code' in error ? String(error.code) : 'UnknownError';
  console.error(message, { code });
}

export async function POST(
  request: Request,
  context: { params: { id: string } },
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'This request could not be verified.' }, { status: 403 });
  }
  if (Number(request.headers.get('content-length') ?? '0') > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: 'Choose an image smaller than 4 MB.' }, { status: 413 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Property image management is temporarily unavailable.' }, { status: 503 });
  }

  let storagePath: string | undefined;
  try {
    if (!await getAdminFromRequest(request)) {
      return NextResponse.json({ error: 'Please sign in to manage property images.' }, { status: 401 });
    }
    const unitId = validId(context.params.id);
    if (!unitId) return NextResponse.json({ error: 'Property not found.' }, { status: 404 });
    const property = await getAccommodationProperty(unitId);
    if (!property) return NextResponse.json({ error: 'Property not found.' }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get('file');
    const metadata = metadataSchema.safeParse({ altText: formData.get('altText') ?? '' });
    if (!(file instanceof File) || !metadata.success) {
      return NextResponse.json({ error: 'Choose a supported image and try again.' }, { status: 400 });
    }

    const processed = await processPropertyImage(file);
    storagePath = newPropertyImagePath(unitId);
    await storePropertyImage(storagePath, processed.buffer);
    const imageId = await addPropertyImage(
      unitId,
      storagePath,
      metadata.data.altText || property.name,
    );
    return NextResponse.json({
      image: {
        id: imageId,
        url: `/api/properties/images/${imageId}`,
        altText: metadata.data.altText || property.name,
        isFeatured: property.images.length === 0,
        sortOrder: property.images.length,
        width: processed.width,
        height: processed.height,
      },
    }, { status: 201 });
  } catch (error) {
    if (storagePath) {
      try {
        await deleteStoredPropertyImage(storagePath);
      } catch (cleanupError) {
        logImageError('Orphaned property image cleanup failed.', cleanupError);
      }
    }
    if (error instanceof Error && (
      error.message.startsWith('Choose a JPG')
      || error.message.startsWith('The uploaded file')
      || error.message.startsWith('The image contents')
      || error.message.startsWith('The image file')
      || error.message.startsWith('The optimized image')
    )) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    logImageError('Property image upload failed.', error);
    return NextResponse.json({ error: 'The image could not be uploaded. Check image storage configuration and try again.' }, { status: 503 });
  }
}
