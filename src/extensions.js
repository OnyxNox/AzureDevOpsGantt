/**
 * Get a valid Mermaid JS node title.
 * @returns Valid Mermaid JS node title with all non-alphanumeric characters replaced with HTML
 * ASCII character codes.
 */
String.prototype.sanitizeMermaidTitle = function () {
    return this.replace(/[^a-zA-Z0-9 ]/g, (char) => `#${char.charCodeAt(0)};`);
};