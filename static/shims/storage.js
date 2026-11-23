// Browser version of lib/storage: file bytes go into the local database (FileBlob).
export const MAX_UPLOAD_MB = 8;
export async function saveUpload(file) {
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`الملف أكبر من ${MAX_UPLOAD_MB}MB`);
  const data = new Uint8Array(await file.arrayBuffer());
  return { fileName: (file.name || 'file').slice(0, 200), filePath: 'db', mimeType: file.type || 'application/octet-stream', fileSize: file.size, blob: { create: { data } } };
}
