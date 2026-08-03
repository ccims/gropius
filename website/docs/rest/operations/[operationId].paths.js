import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { usePaths } from 'vitepress-openapi'

/**
 * One page per operation, built from the spec `npm run rest` writes. Read rather than imported so
 * that a checkout which has never generated the spec still resolves - `scripts/docs.mjs` leaves an
 * empty spec behind, which simply produces no pages.
 */
const spec = JSON.parse(
    readFileSync(fileURLToPath(new URL('../../../.vitepress/generated/login-openapi.json', import.meta.url)), 'utf8')
)

export default {
    paths() {
        return usePaths({ spec })
            .getPathsByVerbs()
            .map(({ operationId, summary }) => ({
                params: {
                    operationId,
                    pageTitle: `${summary ?? operationId} - Login Service`
                }
            }))
    }
}
