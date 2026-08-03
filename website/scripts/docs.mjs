#!/usr/bin/env node
/**
 * One entry point for everything the documentation site needs.
 *
 *   node scripts/docs.mjs kotlin     run Dokka over the backend and turn its output into pages
 *   node scripts/docs.mjs graphql    dump both GraphQL schemas and render them
 *   node scripts/docs.mjs rest       dump the login-service OpenAPI spec
 *   node scripts/docs.mjs typedoc    run TypeDoc over the login-service sources
 *   node scripts/docs.mjs generate   all four
 *   node scripts/docs.mjs dev        generate whatever is missing, then start the dev server
 *   node scripts/docs.mjs build      generate everything, then build the static site
 *   node scripts/docs.mjs site       build the static site from what is already generated
 *   node scripts/docs.mjs clean      delete every generated file
 *
 * Each stage is skipped when its output is already newer than its inputs, so the usual
 * `npm run dev` costs nothing after the first run. Two of the stages have to boot a server to get
 * at a schema, which is slow enough that they are never re-run implicitly: once
 * `schemas/api-public.gql` and friends exist they are reused until `--force` says otherwise.
 *
 * Flags:
 *   --force                regenerate everything, ignoring the staleness checks
 *   --skip=a,b             skip the named stages (kotlin, graphql, rest, typedoc)
 *   --only=a,b             run only the named stages
 */
import { spawn } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const websiteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoDir = path.resolve(websiteDir, '..')

const backendDir = path.join(repoDir, 'gropius-backend')
const loginServiceDir = path.join(repoDir, 'gropius-login-service', 'backend')

const srcDir = path.join(websiteDir, 'docs')
const schemasDir = path.join(websiteDir, 'schemas')
const generatedDir = path.join(websiteDir, '.vitepress', 'generated')

const DOKKA_HTML = path.join(backendDir, 'build', 'dokka', 'html')
const DOKKA_OUT = path.join(srcDir, 'api')
const DOKKA_ASSETS = path.join(websiteDir, '.vitepress', 'dokka')
const DOKKA_CSS = path.join(DOKKA_ASSETS, 'dokka.css')

const TYPEDOC_OUT = path.join(srcDir, 'login-service')
const OPENAPI_SPEC = path.join(generatedDir, 'login-openapi.json')

/** Every Dokka module, in the order they should appear. */
const BACKEND_MODULES = ['core', 'api-common', 'api-public', 'api-internal', 'sync', 'sync-github', 'sync-jira']

/**
 * A public key is required for `api-public` to start at all. This one is a throwaway that only
 * has to parse - the server is booted to read its schema off `/sdl` and is killed again.
 */
const DUMMY_JWT_PUBLIC_KEY =
    'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUFzYk9TSnJWM3VCN1IxcE4xYUQvOQpzc3pIVzV2RGRHMHBPS2JxdWlaclFCRmRrbTZuYUQzU1F2TWVnWHQ0ZGF0YnVzRHZiWDdJRS9DdS9uUEhXN2Z3Cnc5TGRKQ0Z5M0tSQ0NGQUJTd1QwUkxHaUNUejBCRkhCZFlzWjF2K2E1NU9lb3J0Q2NBRkRJbFdCQzJzL2FtaWYKQ242bHhkS3JQWHROSlBtTmdhVWI1S240K1l6OVJnTmkvWk5yeUZtNlRrd1FnMTNhNXJNM0NPYkt1WGdPdDdDYgpDWUpYYnJTL1k3VXRwUmwrd1lpQ012SnJneGgrTXJWKzdOSW9UZ2wvZm9JSU9PZUR5dXJhS09mYW1peDBHbWNyCi9tK2dGTGdtUVVMbmQ3M1hncmdGZ1NNbUU3UVhlczlnQkx5bE55dUxUUVVBb1RTZW1mQUJJemp4MWgxZC9tNVoKUXdJREFRQUIKLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg=='

const GRAPHQL_APIS = [
    {
        id: 'public',
        module: 'api-public',
        port: 8080,
        title: 'Public API',
        extraArgs: [`--gropius.api.public.jwtPublicKey=${DUMMY_JWT_PUBLIC_KEY}`]
    },
    {
        id: 'internal',
        module: 'api-internal',
        port: 8081,
        title: 'Internal API',
        extraArgs: []
    }
]

const LOGIN_SERVICE_PORT = 3001

// ---------------------------------------------------------------------------------------------
// process helpers
// ---------------------------------------------------------------------------------------------

const gradlew = () => (process.platform === 'win32' ? 'gradlew.bat' : './gradlew')

function run(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: 'inherit',
            shell: process.platform === 'win32',
            ...options
        })
        child.on('error', reject)
        child.on('exit', (code) => {
            if (code === 0) resolve()
            else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`))
        })
    })
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Boots a server, waits for `url` to answer, hands the response body to the caller and shuts the
 * server down again.
 *
 * The child gets its own process group: Gradle's `bootRun` and Nest's `start` both fork a second
 * process, and killing only the one we spawned would leave that fork holding the port.
 */
async function withServer({ label, command, args, cwd, env, url, timeoutMs = 300_000 }, use) {
    console.log(`${label}: starting`)
    const child = spawn(command, args, {
        cwd,
        env: { ...process.env, ...env },
        stdio: ['ignore', 'ignore', 'inherit'],
        detached: process.platform !== 'win32',
        shell: process.platform === 'win32'
    })

    let exited = null
    child.on('exit', (code) => {
        exited = code
    })

    const stop = () => {
        if (exited !== null) return
        try {
            if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'])
            else process.kill(-child.pid, 'SIGTERM')
        } catch {
            // already gone
        }
    }

    try {
        const deadline = Date.now() + timeoutMs
        for (;;) {
            if (exited !== null) throw new Error(`${label}: server exited with code ${exited} before answering`)
            if (Date.now() > deadline) throw new Error(`${label}: timed out waiting for ${url}`)
            try {
                const response = await fetch(url)
                if (response.ok) {
                    console.log(`${label}: ready`)
                    return await use(response)
                }
            } catch {
                // not up yet
            }
            await sleep(2000)
        }
    } finally {
        console.log(`${label}: stopping`)
        stop()
    }
}

// ---------------------------------------------------------------------------------------------
// staleness
// ---------------------------------------------------------------------------------------------

/** Newest mtime below `dir`, or 0 when the directory does not exist. */
async function newestMtime(dir, filter = () => true) {
    if (!existsSync(dir)) return 0
    let newest = 0
    for (const entry of await readdir(dir, { withFileTypes: true, recursive: true })) {
        if (!entry.isFile() || !filter(entry.name)) continue
        const stats = statSync(path.join(entry.parentPath ?? entry.path, entry.name))
        if (stats.mtimeMs > newest) newest = stats.mtimeMs
    }
    return newest
}

async function newestSourceMtime(dirs) {
    const times = await Promise.all(dirs.map((dir) => newestMtime(dir)))
    return Math.max(0, ...times)
}

// ---------------------------------------------------------------------------------------------
// sidebars
// ---------------------------------------------------------------------------------------------

/** `types/objects/issue-comment.md` -> `Issue Comment`, used when a page has no `title`. */
const titleFromSlug = (slug) =>
    slug
        .split('-')
        .filter(Boolean)
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(' ')

async function pageTitle(file, fallback) {
    const content = await readFile(file, 'utf8')
    const frontmatter = /^---\n([\s\S]*?)\n---/.exec(content)
    const title = frontmatter && /^title:\s*(.+)$/m.exec(frontmatter[1])?.[1]
    if (title) return title.trim().replace(/^["']|["']$/g, '')
    return titleFromSlug(fallback)
}

/**
 * Turns a directory of generated GraphQL pages into a VitePress sidebar, mirroring the directory
 * structure. `index.md` becomes the group's own link rather than an entry inside it.
 */
async function graphqlSidebar(dir, linkPrefix) {
    if (!existsSync(dir)) return []
    const entries = await readdir(dir, { withFileTypes: true })

    const groups = []
    const pages = []

    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        if (entry.isDirectory()) {
            const items = await graphqlSidebar(path.join(dir, entry.name), `${linkPrefix}${entry.name}/`)
            if (items.length > 0) {
                groups.push({ text: titleFromSlug(entry.name), collapsed: true, items })
            }
        } else if (entry.name.endsWith('.md') && entry.name !== 'index.md') {
            const slug = entry.name.replace(/\.md$/, '')
            pages.push({
                text: await pageTitle(path.join(dir, entry.name), slug),
                link: `${linkPrefix}${slug}`
            })
        }
    }

    return [...groups, ...pages]
}

// ---------------------------------------------------------------------------------------------
// stages
// ---------------------------------------------------------------------------------------------

/**
 * The theme imports the generated stylesheet and the OpenAPI spec unconditionally, so both have to
 * resolve even in a checkout where nothing has been generated yet.
 */
async function ensurePlaceholders() {
    await mkdir(DOKKA_ASSETS, { recursive: true })
    await mkdir(generatedDir, { recursive: true })

    if (!existsSync(DOKKA_CSS)) {
        await writeFile(DOKKA_CSS, '/* Placeholder - run `npm run kotlin` to generate the API reference. */\n', 'utf8')
    }
    if (!existsSync(OPENAPI_SPEC)) {
        await writeFile(
            OPENAPI_SPEC,
            JSON.stringify({ openapi: '3.0.0', info: { title: 'Login Service', version: '0.0.0' }, paths: {} }, null, 2),
            'utf8'
        )
    }
    for (const api of GRAPHQL_APIS) {
        const file = path.join(generatedDir, `graphql-${api.id}.sidebar.json`)
        if (!existsSync(file)) await writeFile(file, '[]\n', 'utf8')
    }
}

/** Dokka HTML for the whole backend, transformed into VitePress pages by dokka-vitepress. */
async function kotlin({ force }) {
    const generated = await newestMtime(DOKKA_HTML, (name) => name.endsWith('.html'))
    const sources = await newestSourceMtime(BACKEND_MODULES.map((module) => path.join(backendDir, module, 'src')))

    if (force || generated === 0 || sources > generated) {
        await run(gradlew(), [':dokkaGenerate'], { cwd: backendDir })
    } else {
        console.log('kotlin: Dokka output is up to date, skipping (use --force to regenerate)')
    }

    // Resolved through the website's own node_modules, so it honours the installed version.
    const cli = fileURLToPath(import.meta.resolve('@graphglue/dokka-vitepress/package.json'))
    await run(process.execPath, [
        path.join(path.dirname(cli), 'dist', 'cli.js'),
        '--src', DOKKA_HTML,
        '--out', DOKKA_OUT,
        '--assets', DOKKA_ASSETS,
        '--link-prefix', '/api/',
        '--modules', BACKEND_MODULES.join(',')
    ])

    // Dokka's own `styles/main.css` ends with a reference to `main.css.map`, which Dokka does not
    // ship, so dokka-vitepress carries a dangling reference into `dokka.css`. The dev server warns
    // on every load trying to resolve it; a build strips it and never notices.
    const css = await readFile(DOKKA_CSS, 'utf8')
    const withoutSourceMap = css.replace(/\/\*# sourceMappingURL=[^*]*\*\/\s*/g, '')
    if (withoutSourceMap !== css) await writeFile(DOKKA_CSS, withoutSourceMap, 'utf8')
}

/** Boots each API module just long enough to read its schema off `/sdl`. */
async function dumpGraphqlSchemas({ force }) {
    await mkdir(schemasDir, { recursive: true })

    for (const api of GRAPHQL_APIS) {
        const target = path.join(schemasDir, `api-${api.id}.gql`)
        if (existsSync(target) && !force) {
            console.log(`graphql: reusing ${path.relative(websiteDir, target)} (use --force to regenerate)`)
            continue
        }

        const sdl = await withServer(
            {
                label: `graphql:${api.id}`,
                command: gradlew(),
                args: [
                    `${api.module}:bootRun`,
                    '--no-daemon',
                    `--args=--server.port=${api.port} --gropius.core.createIndicesOnStartup=false ${api.extraArgs.join(' ')}`
                ],
                cwd: backendDir,
                url: `http://localhost:${api.port}/sdl`
            },
            (response) => response.text()
        )

        await writeFile(target, sdl, 'utf8')
        console.log(`graphql: wrote ${path.relative(websiteDir, target)}`)
    }
}

/**
 * Renders one schema. Always called in a process of its own - see `graphql()`.
 */
async function renderGraphqlSchema(id) {
    const api = GRAPHQL_APIS.find((candidate) => candidate.id === id)
    if (!api) throw new Error(`unknown GraphQL API: ${id}`)

    const { runGraphQLMarkdown } = await import('@graphql-markdown/cli')

    await runGraphQLMarkdown(
        {
            id: api.id,
            schema: path.join(schemasDir, `api-${api.id}.gql`),
            rootPath: path.join(srcDir, 'graphql'),
            baseURL: api.id,
            linkRoot: '/graphql',
            homepage: path.join(websiteDir, 'scripts', 'graphql-homepage', 'index.md'),
            formatter: pathToFileURL(path.join(websiteDir, 'scripts', 'graphql-vitepress-formatter.mjs')).href,
            loaders: { GraphQLFileLoader: '@graphql-tools/graphql-file-loader' },
            docOptions: { index: true }
        },
        { force: true }
    )
}

async function graphql({ force }) {
    await dumpGraphqlSchemas({ force })
    await mkdir(generatedDir, { recursive: true })

    for (const api of GRAPHQL_APIS) {
        const schema = path.join(schemasDir, `api-${api.id}.gql`)
        if (!existsSync(schema)) {
            console.log(`graphql: ${path.relative(websiteDir, schema)} is missing, skipping ${api.id}`)
            continue
        }

        const out = path.join(srcDir, 'graphql', api.id)
        await rm(out, { recursive: true, force: true })

        // GraphQL-Markdown keeps its printer in static state and its `init` is a no-op once that
        // state is set, so a second schema rendered in the same process silently inherits the
        // first one's base path - every link in the second set of pages then points into the first
        // set. One process per schema is the fix.
        await run(process.execPath, [path.join(websiteDir, 'scripts', 'docs.mjs'), 'render-graphql', api.id], {
            cwd: websiteDir
        })

        const sidebar = await graphqlSidebar(out, `/graphql/${api.id}/`)
        await writeFile(
            path.join(generatedDir, `graphql-${api.id}.sidebar.json`),
            `${JSON.stringify(sidebar, null, 2)}\n`,
            'utf8'
        )
    }
}

/** Boots the login-service against sqlite just long enough to read its OpenAPI document. */
async function rest({ force }) {
    await mkdir(schemasDir, { recursive: true })
    await mkdir(generatedDir, { recursive: true })

    const target = path.join(schemasDir, 'login.json')

    if (!existsSync(target) || force) {
        if (!existsSync(path.join(loginServiceDir, 'node_modules'))) {
            await run('npm', ['ci'], { cwd: loginServiceDir })
        }

        const spec = await withServer(
            {
                label: 'rest',
                command: 'npm',
                args: ['start'],
                cwd: loginServiceDir,
                env: {
                    NODE_ENV: 'development',
                    GROPIUS_LOGIN_DATABASE_DRIVER: 'sqlite',
                    // The service appends `.sqlite` and resolves the result against its own
                    // directory, which would leave the submodule dirty. Keep it in `schemas/`.
                    GROPIUS_LOGIN_DATABASE_DATABASE: path.join(schemasDir, 'login'),
                    GROPIUS_DEFAULT_CHECK_DATABASE_CONSISTENT: 'none',
                    GROPIUS_DEFAULT_ENTITIES_ENABLED: 'false',
                    GROPIUS_LOGIN_LISTEN_PORT: String(LOGIN_SERVICE_PORT)
                },
                url: `http://localhost:${LOGIN_SERVICE_PORT}/login-api-doc-json`
            },
            (response) => response.json()
        )

        // Nest generates an operationId but leaves the summary empty, and an empty summary renders
        // as a blank entry in both the sidebar and the operation header.
        for (const methods of Object.values(spec.paths ?? {})) {
            for (const operation of Object.values(methods)) {
                if (operation && typeof operation === 'object' && operation.operationId && !operation.summary) {
                    operation.summary = operation.operationId
                }
            }
        }

        await writeFile(target, `${JSON.stringify(spec, null, 2)}\n`, 'utf8')
        console.log(`rest: wrote ${path.relative(websiteDir, target)}`)
    } else {
        console.log(`rest: reusing ${path.relative(websiteDir, target)} (use --force to regenerate)`)
    }

    await writeFile(OPENAPI_SPEC, await readFile(target, 'utf8'), 'utf8')
}

/** TypeDoc over the login-service TypeScript sources, in VitePress' markdown flavour. */
async function typedoc({ force }) {
    const generated = await newestMtime(TYPEDOC_OUT, (name) => name.endsWith('.md'))
    const sources = await newestMtime(path.join(loginServiceDir, 'src'))

    if (!force && generated > 0 && sources < generated) {
        console.log('typedoc: output is up to date, skipping (use --force to regenerate)')
        return
    }

    if (!existsSync(path.join(loginServiceDir, 'node_modules'))) {
        await run('npm', ['ci'], { cwd: loginServiceDir })
    }

    await rm(TYPEDOC_OUT, { recursive: true, force: true })
    await run(process.execPath, [
        path.join(websiteDir, 'node_modules', 'typedoc', 'bin', 'typedoc'),
        '--options', path.join(websiteDir, 'typedoc.json')
    ], { cwd: websiteDir })
}

const STAGES = { kotlin, graphql, rest, typedoc }

async function generate(options) {
    for (const [name, stage] of Object.entries(STAGES)) {
        if (options.skip.includes(name)) {
            console.log(`${name}: skipped`)
            continue
        }
        if (options.only.length > 0 && !options.only.includes(name)) continue
        await stage(options)
    }
}

async function clean() {
    const targets = [DOKKA_OUT, DOKKA_ASSETS, TYPEDOC_OUT, generatedDir, schemasDir,
        path.join(srcDir, 'graphql'),
        path.join(websiteDir, '.vitepress', 'cache'),
        path.join(websiteDir, '.vitepress', 'dist')]
    for (const target of targets) {
        await rm(target, { recursive: true, force: true })
        console.log(`removed ${path.relative(websiteDir, target)}`)
    }
}

async function vitepress(command) {
    await ensurePlaceholders()
    await run(
        process.execPath,
        [
            // The four generated references come to roughly 5,500 pages. VitePress holds every
            // rendered page's module graph for the length of the build, so `build` peaks at about
            // 16 GB resident and does not finish under a 14 GB heap at all. `dev` compiles pages on
            // demand and needs none of this, but the flag is harmless there.
            //
            // Overridden by NODE_OPTIONS if the caller has already set a limit.
            ...(process.env.NODE_OPTIONS?.includes('max-old-space-size') ? [] : ['--max-old-space-size=20480']),
            path.join(websiteDir, 'node_modules', 'vitepress', 'bin', 'vitepress.js'),
            command,
            '.'
        ],
        { cwd: websiteDir }
    )
}

// ---------------------------------------------------------------------------------------------

const [command = 'dev', ...flags] = process.argv.slice(2)
const listFlag = (name) =>
    flags
        .filter((flag) => flag.startsWith(`--${name}=`))
        .flatMap((flag) => flag.slice(name.length + 3).split(','))
        .filter(Boolean)

const options = {
    force: flags.includes('--force'),
    skip: listFlag('skip'),
    only: listFlag('only')
}

try {
    switch (command) {
        case 'kotlin':
        case 'graphql':
        case 'rest':
        case 'typedoc':
            await ensurePlaceholders()
            await STAGES[command](options)
            break
        case 'generate':
            await ensurePlaceholders()
            await generate(options)
            break
        // Internal: one schema, one process. Spawned by `graphql`, not meant to be run by hand.
        case 'render-graphql':
            await renderGraphqlSchema(flags.find((flag) => !flag.startsWith('--')))
            break
        case 'dev':
            // Only fills in what is missing - editing the guide should not wait on Gradle, and the
            // two stages that need a running server are left out entirely. Run them by hand.
            await ensurePlaceholders()
            if (!options.skip.includes('kotlin') && !existsSync(DOKKA_OUT)) await kotlin(options)
            if (!options.skip.includes('typedoc') && !existsSync(TYPEDOC_OUT)) await typedoc(options)
            await vitepress('dev')
            break
        case 'build':
            await ensurePlaceholders()
            await generate(options)
            await vitepress('build')
            break
        // Builds the site from whatever has already been generated. CI generates in one step and
        // builds in another so the two show up as separate jobs.
        case 'site':
            await vitepress('build')
            break
        case 'clean':
            await clean()
            break
        default:
            console.error(`unknown command: ${command}\nexpected one of: ${Object.keys(STAGES).join(', ')}, generate, dev, build, clean`)
            process.exitCode = 1
    }
} catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
}
