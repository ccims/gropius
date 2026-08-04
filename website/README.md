# Gropius website

The documentation site at [ccims.github.io/gropius-docs](https://ccims.github.io/gropius-docs),
built with [VitePress](https://vitepress.dev). The guide lives in `docs/docs`; everything else is
generated from the sources of the three submodules and is not checked in:

| Section | Generated from | With |
| --- | --- | --- |
| `/api/` | the Kotlin backend | Dokka, then [`@graphglue/dokka-vitepress`](https://github.com/graphglue/dokka-vitepress) |
| `/graphql/public/`, `/graphql/internal/` | the schema each API serves on `/sdl` | [GraphQL-Markdown](https://graphql-markdown.dev) with the VitePress formatter in `scripts/` |
| `/rest/` | the login-service OpenAPI document | [`vitepress-openapi`](https://github.com/enzonotario/vitepress-openapi) |
| `/login-service/` | the login-service TypeScript sources | TypeDoc with [`typedoc-vitepress-theme`](https://typedoc-plugin-markdown.org/plugins/vitepress) |

## Prerequisites

- Node.js 22 or newer
- A JDK 21, for the Gradle runs that produce the Dokka output and the GraphQL schemas

Everything the backend build needs, including `dokka-graphql-description-plugin` - which makes Dokka
fall back to the contents of `@GraphQLDescription` where a declaration has no KDoc - and graph-glue,
resolves from Maven Central. Nothing has to be installed by hand.

## Getting started

```sh
cd gropius/website

npm install
npm run dev      # generate what is missing, then serve on localhost:5173
```

`npm run dev` generates the Kotlin and TypeScript references if they are absent, then starts the dev
server. It deliberately does *not* run the two stages that have to boot a server. Run those once by
hand and they are reused from then on:

```sh
npm run graphql  # boots api-public and api-internal to read their schemas, then renders them
npm run rest     # boots the login-service against sqlite to read its OpenAPI document
```

Editing the guide only needs `npm run dev`; nothing has to be regenerated.

## Commands

Each of these is `node scripts/docs.mjs <command>` behind the scenes.

| Command | What it does |
| --- | --- |
| `npm run dev` | Fills in missing references, then starts the dev server |
| `npm run build` | Regenerates everything and builds the static site into `.vitepress/dist` |
| `npm run generate` | Runs all four generators without building the site |
| `npm run site` | Builds the static site from what is already generated |
| `npm run kotlin` | `./gradlew :dokkaGenerate` in the backend, transformed into `docs/api` |
| `npm run graphql` | Dumps both schemas into `schemas/`, renders them into `docs/graphql` |
| `npm run rest` | Dumps the OpenAPI document into `schemas/login.json` |
| `npm run typedoc` | TypeDoc over the login-service sources into `docs/login-service` |
| `npm run preview` | Serves the last build |
| `npm run clean` | Deletes every generated file |

Each stage compares its output against its sources and skips the work when it is already up to
date. The two stages that boot a server never re-run implicitly - once `schemas/` is populated it is
reused. `--force` overrides both, and `--skip`/`--only` narrow what runs:

```sh
npm run graphql -- --force
npm run generate -- --force
npm run generate -- --skip=kotlin,rest
```

## Layout

```
website/
├── docs/                     VitePress srcDir
│   ├── index.md              landing page
│   ├── docs/                 the guide
│   ├── rest/                 REST pages - dynamic routes over the OpenAPI document
│   ├── api/                  generated - the Kotlin reference
│   ├── graphql/              generated - both GraphQL schemas
│   ├── login-service/        generated - the TypeScript reference
│   └── public/               static assets
├── .vitepress/
│   ├── config.ts             site configuration
│   ├── theme/                theme extension and brand styles
│   │   └── components/      replace their VitePress originals, see below
│   │       ├── DeferredSidebar.vue
│   │       └── DeferredFlyout.vue
│   ├── dokka/                generated - Dokka stylesheet, icons, fonts, sidebar
│   └── generated/            generated - sidebars and the OpenAPI document
├── schemas/                  generated - the schemas dumped from the running services
└── scripts/
    ├── docs.mjs              the script behind every npm script above
    └── graphql-vitepress-formatter.mjs   renders GraphQL-Markdown output as VitePress markdown
```

## Notes on the setup

- **VitePress 1.x, not 2.x.** Both `vitepress-openapi` and `vitepress-plugin-mermaid` require
  VitePress 1, and the guide relies on mermaid for its C4 and sequence diagrams.
- **`graphql` is pinned through `overrides`.** GraphQL-Markdown and the graphql-tools loader check
  schema objects with `instanceof`, which fails silently across two copies of `graphql`.
- **Each GraphQL schema renders in its own process.** GraphQL-Markdown keeps its printer in static
  state and its `init` is a no-op once that state is set, so a second schema rendered in the same
  process would inherit the first one's base path and every link would point into the wrong section.
- **The build needs a large heap.** The generated references come to roughly 5,500 pages and
  VitePress holds the whole build in memory; `scripts/docs.mjs` passes `--max-old-space-size` for
  you unless `NODE_OPTIONS` already sets one. `npm run dev` compiles pages on demand and is
  unaffected - only a full `build` is heavy.
- **Five things keep the output the size it should be.** Almost 5,500 of these pages are generated,
  so anything VitePress writes into *every* page is multiplied by 5,500. Left alone the Kotlin page
  that was 33 KB under Docusaurus came to 242 KB, and the site to 6.3 GB against the 1 GB GitHub
  Pages accepts.

  What was being written into every page:

  1. `metaChunk: true` moves the map of every page into one cacheable chunk. 4.6 GB of the 6.3 GB.
  2. `theme/components/DeferredSidebar.vue`, aliased over VitePress' `VPSidebar`, renders the
     sidebar entries on the client. Docusaurus rendered a collapsed category as an empty stub and
     filled it in on the client; VitePress renders all of it, which was 91% of that Kotlin page.
     The `<aside>` and `<nav>` around the entries stay server-rendered, so nothing shifts, and the
     sidebar config is already shipped once in the chunk `metaChunk` produces.
  3. `theme/components/DeferredFlyout.vue` does the same for the nav bar's dropdown menus, which
     are hidden until they are hovered. 11 MB, and invisible - the menu cannot be opened before Vue
     has mounted.
  4. `dropEagerPreloads` in `config.ts` removes the `<link rel="modulepreload">` tags for chunks a
     page does not need to render. 20 MB, and 1.4 MB less that every visitor downloads per page.

  And next to every page:

  5. `dedupeLeanChunks` in `config.ts` collapses the `.lean.js` chunks that are not actually lean.
     29 MB. See the comment there - the short version is that the Kotlin pages were shipping their
     content three times.

  Together: 6.3 GB → 951 MB → 278 MB → 258 MB → **225 MB**, against Docusaurus' 287 MB for 927
  fewer pages. Pages average 18 KB.

  The one trade-off: the sidebar entries and the dropdown menus need JavaScript. Page content is
  unaffected - it stays fully server-rendered, the generated pages cross-link each other, and
  `sitemap.xml` lists all of them, so nothing depends on either to be reachable or indexable.

  Each reference gets its generated tree whole, keyed by its base path. An earlier version split
  each one into a sidebar per package to keep the per-page copies small; once the entries stopped
  being copied per page that bought nothing - the whole set of trees is 332 KB, shipped once - so it
  is gone and the config is that much simpler.

- **What is left, if the site ever has to get smaller again.** Measured on the current build:

  | | Size | |
  | --- | --- | --- |
  | `assets/*.md.js` | 53 MB | every page's content again, as JS, for client-side navigation |
  | the rest of `VPNavBar` | 23 MB | 4.3 KB per page - the bar itself, not the menus |
  | `assets/*.lean.js` for `/graphql/` | 9 MB | below the threshold `dedupeLeanChunks` collapses at |

  The nav bar could be deferred whole, like the sidebar, for the remaining 23 MB - but unlike the
  sidebar it is the first thing on the page, so it would flash. The `.md.js` chunks are what
  client-side navigation is made of; dropping them means `mpa: true`, which would also take the
  sidebar and the search with it.

  Narrowing the backend's `documentedVisibilities` to public and protected is *not* much of a lever,
  measured: it takes the Kotlin reference from 3,436 to 3,044 pages and about 6% off the site.
  Private declarations are only about a tenth of the pages, and nearly all of them are members,
  which never got their own page in the first place. Worth doing if the private internals are not
  wanted in a published reference, but not as a way to save space.

## Deployment

Pushing to `main` runs [`.github/workflows/deploy-website.yml`](../.github/workflows/deploy-website.yml),
which performs the same steps as `npm run build` and publishes `.vitepress/dist` to
[ccims/gropius-docs](https://github.com/ccims/gropius-docs). Pull requests build the site without
deploying it.
