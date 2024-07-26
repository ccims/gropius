// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require("prism-react-renderer/themes/github");
const darkCodeTheme = require("prism-react-renderer/themes/dracula");

const apiSidebar = require("./sidebars").apiSidebar

async function createConfig() {
    return {
        title: "Gropius Backend",
        url: "https://ccims.github.io/",
        favicon: "img/logo.svg",
        baseUrl: "/gropius-backend-docs/",
        onBrokenLinks: "throw",
        onBrokenMarkdownLinks: "throw",
        onDuplicateRoutes: "throw",
        organizationName: "ccims",
        projectName: "gropius-backend-docs",
        trailingSlash: false,
        markdown: {
            mermaid: true
        },
        presets: [
            [
                "@docusaurus/preset-classic",
                ({
                    docs: {
                        sidebarPath: require.resolve("./sidebars.js"),
                        routeBasePath: "/",
                    },
                    blog: false,
                    theme: {
                        customCss: [require.resolve("./src/css/custom.css")],
                    },
                }),
            ],
        ],

        themeConfig:
            /** @type {import("@docusaurus/preset-classic").ThemeConfig} */
            ({
                colorMode: {
                    defaultMode: "dark",
                },
                navbar: {
                    title: "Gropius Backend",
                    logo: {
                        src: "img/logo.svg"
                    },
                    items: [{
                        type: "doc",
                        docId: "docs/docs",
                        position: "left",
                        label: "Docs",
                    },
                    {
                        type: "doc",
                        docId: apiSidebar[0]?.id ?? apiSidebar[0]?.link?.id ?? apiSidebar[0]?.link?.slug ?? "docs/docs",
                        position: "left",
                        label: "API",
                    },
                    {
                        type: "doc",
                        docId: "graphql/api-public",
                        position: "left",
                        label: "GraphQL"
                    },
                    {
                        type: "doc",
                        docId: "login-service/gropius-login-service",
                        position: "left",
                        label: "REST",
                        docsPluginId: "rest-docs"
                    },
                    {
                        href: "https://github.com/ccims/gropius-backend",
                        label: "GitHub",
                        position: "right",
                    },
                    ],
                },
                footer: {
                    style: "dark",
                    copyright: `Built with Docusaurus.`,
                },
                prism: {
                    theme: lightCodeTheme,
                    darkTheme: darkCodeTheme,
                    defaultLanguage: "kotlin",
                    additionalLanguages: ["kotlin"],
                },
            }),

        plugins: [
            () => ({
                name: "custom-webpack-loaders",
                configureWebpack: () => ({
                    module: {
                        rules: [
                            {
                                test: /\.source$/,
                                type: "asset/source"
                            }
                        ]
                    }
                })
            }),
            [
                "@graphql-markdown/docusaurus",
                {
                    id: "api-public",
                    schema: "./schemas/api-public.gql",
                    rootPath: "./docs",
                    baseURL: "graphql/api-public",
                    docOptions: {
                        index: true
                    },
                    loaders: {
                        GraphQLFileLoader: "@graphql-tools/graphql-file-loader"
                    }
                },
            ],
            [
                "@graphql-markdown/docusaurus",
                {
                    id: "api-internal",
                    schema: "./schemas/api-internal.gql",
                    rootPath: "./docs",
                    baseURL: "graphql/api-internal",
                    docOptions: {
                        index: true
                    },
                    loaders: {
                        GraphQLFileLoader: "@graphql-tools/graphql-file-loader"
                    }
                },
            ],
            [
                "docusaurus-plugin-openapi-docs",
                {
                    id: "rest-docs",
                    docsPluginId: "@docusaurus/preset-classic",
                    config: {
                        "login-service": {
                            specPath: "schemas/login.json",
                            outputDir: "rest-docs/login-service",
                            sidebarOptions: {
                                groupPathsBy: "tag"
                            }
                        }
                    }
                }
            ],
            [
                "@docusaurus/plugin-content-docs",
                {
                    id: "rest-docs",
                    path: "rest-docs",
                    routeBasePath: "rest",
                    sidebarPath: require.resolve("./rest-sidebars.js"),
                    docLayoutComponent: "@theme/DocPage",
                    docItemComponent: "@theme/ApiItem",
                }
            ],
            [
                "docusaurus-plugin-typedoc",
                {
                    entryPoints: ["../login-service/src/"],
                    tsconfig: "../login-service/tsconfig.json",
                    entryPointStrategy: "expand",
                    out: "login-service-api"
                }
            ]
        ],
        themes: ["docusaurus-theme-openapi-docs", "@docusaurus/theme-mermaid"]
    };
}

module.exports = createConfig;