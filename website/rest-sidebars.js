/**
 * Helper to load the rest sidebar js only if it exists
 * returns empty other array otherwise
 */
function loadRestSidebarIfExists() {
    try {
        return require("./rest-docs/login-service/sidebar.js")
    } catch {
        return []
    }
}

/** @type {import("@docusaurus/plugin-content-docs").SidebarsConfig} */
const sidebars = {
    restSidebar: loadRestSidebarIfExists(),
};

module.exports = sidebars;