// Enough of next/server for the app's API route handlers to run in the browser.
export class NextResponse extends Response {
  static json(body, init = {}) {
    return new Response(JSON.stringify(body), { ...init, headers: { 'content-type': 'application/json', ...(init.headers || {}) } });
  }
}
