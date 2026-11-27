import path from 'node:path';
import { createRequire } from 'node:module';
import { Router } from 'express';
import express from 'express';
import { openApiDocument } from './openapi.js';

const require = createRequire(import.meta.url);

/** The folder of the swagger-ui-dist package, which holds the CSS and the JavaScript. */
const swaggerUiFolder = path.dirname(require.resolve('swagger-ui-dist/package.json'));

/**
 * Serves the OpenAPI document and the Swagger UI.
 */
export function createDocsRouter() {
  const router = Router();

  router.get('/openapi.json', (req, res) => {
    res.json(openApiDocument);
  });

  router.use('/docs/assets', express.static(swaggerUiFolder, { index: false, maxAge: '1h' }));

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
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sweety API - documentation</title>
    <link rel="stylesheet" href="/api/docs/assets/swagger-ui.css" />
    <style>
      body { margin: 0; background: #0b1020; }
      .topbar { display: none; }
      .swagger-ui { filter: none; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/api/docs/assets/swagger-ui-bundle.js" crossorigin></script>
    <script src="/api/docs/assets/swagger-ui-standalone-preset.js" crossorigin></script>
    <script>
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
    </script>
  </body>
</html>`;
}
