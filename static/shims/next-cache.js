// Data is local, so "revalidating" just tells mounted pages to reload.
export function revalidatePath() { window.dispatchEvent(new Event('db:changed')); }
export function revalidateTag() { window.dispatchEvent(new Event('db:changed')); }
export function unstable_noStore() {}
