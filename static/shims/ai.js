// The AI assistant needs a secret API key on a server, so it is off in the static build.
export const AI_MODEL = null;
export const aiEnabled = () => false;
const off = async () => { throw new Error('المساعد الذكي غير متاح في النسخة بدون سيرفر'); };
export const chat = off;
export const suggestHs = off;
export const extractDocument = off;
