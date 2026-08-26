// Everything on flarepeek.com is a static file. This Worker exists to fill in
// one thing the asset layer can't: which version of itself is serving you.
//
// That single number is what makes the site a demo of the extension rather than
// a page describing one. Deploy several versions, split traffic between them,
// or pin one with FlarePeek — the id below is how you see it worked.

// `Env` is generated from wrangler.jsonc by `wrangler types` into
// worker-configuration.d.ts, so the bindings stay in sync with the config
// rather than being described twice.

// Version ids are UUIDs. Eight characters is enough to tell two versions apart
// at a glance and matches how the extension abbreviates them; the full id goes
// in `title` so it can still be copied.
const SHORT_ID_LENGTH = 8;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await env.ASSETS.fetch(request);

    // `run_worker_first` only routes the HTML pages here, but an asset miss
    // falls through to this Worker too and returns 404.html — and one day
    // something else might. Rewriting a stylesheet would corrupt it.
    if (!response.headers.get('content-type')?.startsWith('text/html')) {
      return response;
    }

    const { id, tag } = env.CF_VERSION_METADATA;

    return (
      new HTMLRewriter()
        .on('[data-fp-version]', {
          element(element) {
            element.setInnerContent(id.slice(0, SHORT_ID_LENGTH));
            element.setAttribute('title', id);
          },
        })
        // Tags are optional on a version. An empty one would render as a stray
        // separator, so drop the element entirely instead.
        .on('[data-fp-version-tag]', {
          element(element) {
            if (tag) element.setInnerContent(tag);
            else element.remove();
          },
        })
        .transform(response)
    );
  },
} satisfies ExportedHandler<Env>;
