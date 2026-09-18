// Side-effect stylesheet imports (app/globals.css, leaflet/dist/leaflet.css)
// have no type declarations; TypeScript 7 rejects them without this.
declare module "*.css";
