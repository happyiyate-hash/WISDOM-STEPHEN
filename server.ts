import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Proxy route for Cloudflare Worker token upload
  app.post('/api/upload-tokens', async (req, res) => {
    try {
      const { action, blockchain, tokens } = req.body;
      console.log(`[Server Proxy] Uploading ${tokens?.length || 0} tokens on blockchain '${blockchain}' to Cloudflare Worker...`);

      const workerRes = await fetch('https://rough-meadow-6435.happyiyate.workers.dev/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: action || 'uploadTokens',
          blockchain: blockchain || 'polygon',
          tokens: tokens || [],
        }),
      });

      const responseText = await workerRes.text();
      let responseData: any;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { text: responseText };
      }

      console.log(`[Server Proxy] Worker response status (${workerRes.status}):`, responseData);

      return res.status(workerRes.ok ? 200 : workerRes.status).json({
        ok: workerRes.ok,
        status: workerRes.status,
        result: responseData,
      });
    } catch (err: any) {
      console.error('[Server Proxy] Cloudflare Worker fetch failed:', err);
      return res.status(500).json({
        ok: false,
        error: err.message || 'Failed to proxy request to Cloudflare Worker.',
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
