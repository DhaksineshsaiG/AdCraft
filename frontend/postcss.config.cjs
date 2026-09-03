// PostCSS configuration
// Must be a .js (CommonJS) file — PostCSS cannot load .ts files at build time.
// Vite resolves this file before TypeScript compilation, so CJS module.exports
// is required regardless of the project's "type": "module" in package.json.
module.exports = {
  plugins: {
    tailwindcss:  {},
    autoprefixer: {},
  },
};
