// Pure client-side SPA: no server, no SSR, no tracking — everything runs in the
// visitor's browser. That keeps lnproof.space self-hostable as static files and
// avoids leaking any pasted proof to a backend.
export const ssr = false;
export const prerender = false;
