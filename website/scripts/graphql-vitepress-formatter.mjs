/**
 * A VitePress formatter for GraphQL-Markdown.
 *
 * GraphQL-Markdown ships presets for Docusaurus, Starlight, MkDocs and a few others, but not for
 * VitePress, so this module implements the formatter contract itself. See
 * https://graphql-markdown.dev/docs/advanced/integration-with-frameworks#custom-mdx-formatter.
 *
 * The differences that matter:
 *
 * - Pages are plain `.md`, not `.mdx`. VitePress compiles markdown as a Vue template, so no JSX
 *   components are available - but raw HTML and VitePress' own containers are.
 * - Admonitions become VitePress custom containers (`:::warning`).
 * - Badges become VitePress' built-in `<Badge>` component.
 * - Collapsible blocks are emitted as the markup `::: details` compiles to, so they pick up the
 *   default theme's styling without going through the container syntax (which would not survive
 *   being nested inside another block).
 *
 * `formatMDXDetails` returns a template containing a single `\r`; the renderer substitutes the
 * block's content for it. That invariant is part of the contract, not an accident.
 */

import { readFile, writeFile } from "node:fs/promises";

const EOL = "\n";
const EOP = "\n\n";

/** Docusaurus' badge classnames mapped onto the four types VitePress' `<Badge>` knows. */
const BADGE_TYPES = {
    deprecated: "danger",
    warning: "warning",
    danger: "danger",
    success: "tip",
    info: "info"
};

/** Admonition types VitePress supports as custom containers; everything else degrades to `info`. */
const ADMONITION_TYPES = new Set(["info", "tip", "warning", "danger", "details"]);

/**
 * VitePress compiles every page as a Vue template, so a literal `{{` would be read as an
 * interpolation and either break the build or silently swallow text. Schema defaults and
 * descriptions can legitimately contain it.
 */
const escapeVue = (text) => String(text).replaceAll("{{", "&#123;&#123;");

export const mdxExtension = ".md";

export const formatMDXBadge = ({ text, classname }) => {
    const type = BADGE_TYPES[String(classname).toLowerCase()] ?? "info";
    return `<Badge type="${type}" text="${escapeVue(text)}" />`;
};

export const formatMDXAdmonition = ({ text, title, type }) => {
    const container = ADMONITION_TYPES.has(String(type).toLowerCase()) ? type.toLowerCase() : "info";
    return `${EOP}:::${container} ${title}${EOL}${text}${EOL}:::${EOP}`;
};

export const formatMDXBullet = (text = "") => {
    return `<span class="graphql-markdown-bullet">&nbsp;●&nbsp;</span>${text}`;
};

/**
 * The markup VitePress' `::: details` container compiles to. Emitted directly rather than as a
 * container so that the surrounding blank lines - and not container nesting rules - decide where
 * markdown parsing resumes.
 */
export const formatMDXDetails = ({ dataOpen, dataClose }) => {
    return (
        `${EOP}<details class="details custom-block">${EOL}` +
        `<summary>${escapeVue(dataOpen)}</summary>${EOP}` +
        `\r${EOP}` +
        `<em class="graphql-markdown-details-close">${escapeVue(dataClose)}</em>${EOL}` +
        `</details>${EOP}`
    );
};

/**
 * Docusaurus renders the `title` front matter as the page's heading; VitePress does not, it only
 * uses it for the document title. So the title is emitted twice: as front matter, and as the H1
 * the page would otherwise be missing.
 *
 * The rest of what GraphQL-Markdown puts in the front matter (`id`, `slug`, `sidebar_position`,
 * `pagination_*`) is Docusaurus-only and is dropped.
 */
export const formatMDXFrontmatter = (_props, formatted) => {
    if (!Array.isArray(formatted) || formatted.length === 0) {
        return "";
    }
    const title = formatted
        .map((line) => /^title:\s*(.+)$/.exec(String(line).trim()))
        .find(Boolean)?.[1]
        ?.replace(/^["']|["']$/g, "");
    if (!title) {
        return "";
    }
    return `---${EOL}title: ${JSON.stringify(title)}${EOL}---${EOP}# ${escapeVue(title)}`;
};

/**
 * Links stay site-absolute and extensionless. Combined with `cleanUrls`, that is exactly what
 * VitePress serves, so no rewriting is needed.
 */
export const formatMDXLink = (link) => link;

export const formatMDXNameEntity = (name, parentType) => {
    const parent = parentType ? `${escapeVue(parentType)}.` : "";
    return `<code class="graphql-markdown-entity">${parent}<b>${escapeVue(name)}</b></code>`;
};

export const formatMDXSpecifiedByLink = (url) => {
    return `[Specification ⎘](${url})`;
};

/**
 * GraphQL-Markdown appends an explicit anchor to every field heading so that the cross-references
 * it generates (`[Issue.id](#id)`) resolve. It writes them as `\{#id\}`, escaped for MDX. VitePress
 * uses the same `{#id}` syntax but reads markdown, not MDX, so the backslashes have to go - without
 * them the anchor is set and the links land where they should.
 *
 * Only headings are touched, so an escaped brace in a description or a code block stays escaped.
 */
export const afterRenderTypeEntitiesHook = async (event) => {
    const { filePath } = event.data;
    const content = await readFile(filePath, "utf8");
    const rewritten = anchorPageHeading(unescapeHeadingAnchors(content));
    if (rewritten !== content) {
        await writeFile(filePath, rewritten, "utf8");
    }
};

const unescapeHeadingAnchors = (content) =>
    content.replaceAll(/^(#{1,6} .*?)\\\{#([^}\\]+)\\\}(\s*)$/gm, "$1{#$2}$3");

/**
 * VitePress derives an anchor from every heading and refuses to build when one of the explicit
 * anchors above collides with it. That happens whenever a type has a field of its own name -
 * `Body.body`, `Query.node` - because the page's H1 and the field heading then slugify the same.
 *
 * Giving the H1 an explicit anchor of its own settles it. `top` is not a name GraphQL-Markdown ever
 * generates (its anchors come from field names), but it is checked against the page anyway.
 */
const anchorPageHeading = (content) => {
    const explicit = new Set([...content.matchAll(/^#{1,6} .*\{#([^}]+)\}\s*$/gm)].map((match) => match[1]));

    let anchor = "top";
    while (explicit.has(anchor)) {
        anchor = `_${anchor}`;
    }

    return content.replace(/^(---\n[\s\S]*?\n---\n\n# )(.+?)$/m, (_match, prefix, title) =>
        /\{#[^}]+\}\s*$/.test(title) ? `${prefix}${title}` : `${prefix}${title} {#${anchor}}`
    );
};

export const createMDXFormatter = () => ({
    formatMDXBadge,
    formatMDXAdmonition,
    formatMDXBullet,
    formatMDXDetails,
    formatMDXFrontmatter,
    formatMDXLink,
    formatMDXNameEntity,
    formatMDXSpecifiedByLink
});
