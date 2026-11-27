import path from 'node:path';
import { createRequire } from 'node:module';
import { Router } from 'express';
import express from 'express';
import { openApiDocument } from './openapi.js';

const require = createRequire(import.meta.url);

/** The folder of the swagger-ui-dist package, which holds the CSS and the JavaScript. */
const swaggerUiFolder = path.dirname(require.resolve('swagger-ui-dist/package.json'));

/**
 * The script that starts Swagger UI.
 *
 * It is served as its own file instead of being inlined into the page, because the content
 * security policy of helmet does not allow inline scripts.
 */
const INIT_SCRIPT = `
window.onload = function () {
  window.ui = SwaggerUIBundle({
    url: '/api/openapi.json',
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
    plugins: [SwaggerUIBundle.plugins.DownloadUrl],
    layout: 'StandaloneLayout',
    tryItOutEnabled: true,
    persistAuthorization: true,
  });
};
`;

/**
 * Serves the OpenAPI document and the Swagger UI.
 */
export function createDocsRouter() {
  const router = Router();

  router.get('/openapi.json', (req, res) => {
    res.json(openApiDocument);
  });

  router.use('/docs/assets', express.static(swaggerUiFolder, { index: false, maxAge: '1h' }));

  router.get('/docs/swagger-init.js', (req, res) => {
    res.type('application/javascript').send(INIT_SCRIPT);
  });

  router.get('/docs', (req, res) => {
    res.type('html').send(docsPage());
  });

  return router;
}

/**
 * The Swagger UI page. The assets are served by this server, so the documentation also works
 * without an internet connection.
 *
 * @returns {string}
 */
function docsPage() {
  const favicon =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='9' fill='%236366f1'/%3E%3C/svg%3E";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="${favicon}" />
    <title>Sweety API - documentation</title>
    <link rel="stylesheet" href="/api/docs/assets/swagger-ui.css" />
    <style>
      body { margin: 0; background: #0b1020; }
      .topbar { display: none; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/api/docs/assets/swagger-ui-bundle.js" crossorigin></script>
    <script src="/api/docs/assets/swagger-ui-standalone-preset.js" crossorigin></script>
    <script src="/api/docs/swagger-init.js"></script>
  </body>
</html>`;
}
