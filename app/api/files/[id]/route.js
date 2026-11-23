import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUser } from '@/lib/auth';

export async function GET(req, { params }) {
  if (!(await getUser())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const doc = await db.document.findUnique({ where: { id: Number(params.id) }, include: { blob: true } });
  if (!doc?.blob) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const inline = /^(image\/|application\/pdf)/.test(doc.mimeType || '');
  return new NextResponse(doc.blob.data, {
    headers: {
      'content-type': inline ? doc.mimeType : 'application/octet-stream',
      'content-disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(doc.fileName || 'file')}`,
      'x-content-type-options': 'nosniff',
      'cache-control': 'private, max-age=300',
    },
  });
}
