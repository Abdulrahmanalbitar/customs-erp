import 'server-only';
import path from 'path';

const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];

// Hosted platforms cap request bodies (Vercel: 4.5MB), so the default limit is 4MB.
export const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 4);

/**
 * Validate an uploaded File and return Document fields plus a nested blob create.
 * Bytes are stored in the database (FileBlob) so nothing depends on the server's disk.
 */
export async function saveUpload(file) {
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`الملف أكبر من ${MAX_UPLOAD_MB}MB`);
  const mime = ALLOWED.includes(file.type) ? file.type : 'application/octet-stream';
  const name = (file.name || `file${path.extname(file.name || '')}`).slice(0, 200);
  const data = Buffer.from(await file.arrayBuffer());
  return { fileName: name, filePath: 'db', mimeType: mime, fileSize: file.size, blob: { create: { data } } };
}
