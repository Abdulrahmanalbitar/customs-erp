// Shared navigation hooks between the router and the Next.js shims.
export const bridge = { navigate: (to) => { window.location.hash = '#' + to; } };

export class RedirectSignal extends Error {
  constructor(to) { super('NEXT_REDIRECT ' + to); this.to = to; this.isRedirect = true; }
}
export class NotFoundSignal extends Error {
  constructor() { super('NEXT_NOT_FOUND'); this.isNotFound = true; }
}

/** Turn an app path like "/invoices?status=DUE" into a hash link. */
export const toHash = (href) => (typeof href === 'string' && href.startsWith('/') ? '#' + href : href);
