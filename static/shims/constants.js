// Same constants as the server build, minus the AI section (it needs a server-side API key).
import { ACCESS as BASE } from '../../lib/constants.js';
export * from '../../lib/constants.js';
export const ACCESS = { ...BASE, ai: [] };
