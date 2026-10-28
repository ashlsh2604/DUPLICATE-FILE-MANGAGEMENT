/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(express.json({ limit: '50mb' }));

const PORT = Number(process.env.PORT) || 3000;
const C_BIN_PATH = path.resolve(process.cwd(), 'bin', 'dedup_core');
const C_SOURCE_DIR = path.resolve(process.cwd(), 'backend');

/**
 * Health & C Backend Status Endpoint
 */
app.get('/api/c-backend/status', async (_req: Request, res: Response) => {
  const binExists = fs.existsSync(C_BIN_PATH);
  let binVersion = 'Not compiled';

  if (binExists) {
    try {
      const versionOutput = await new Promise<string>((resolve) => {
        const child = spawn(C_BIN_PATH, ['version']);
        let out = '';
        child.stdout.on('data', (d) => { out += d.toString(); });
        child.on('close', () => resolve(out.trim()));
        child.on('error', () => resolve('Execution error'));
      });
      binVersion = versionOutput;
    } catch {
      binVersion = 'Error probing binary';
    }
  }

  res.json({
    status: binExists ? 'ready' : 'missing_binary',
    binaryPath: C_BIN_PATH,
    binaryExists: binExists,
    version: binVersion,
    compiler: 'gcc 12.3.0 (C11 standard with -O3)',
    arch: process.arch,
    platform: process.platform,
    features: [
      'Native FIPS 180-4 SHA-256 implementation',
      'Chained Hash Table with separate chaining',
      'Directory Merkle Tree with recursive rollups',
      'Bitwise Bloom Filter with double hashing',
      'POSIX directory traversal (<dirent.h>, <sys/stat.h>)',
      'Microsecond benchmarking via clock_gettime(CLOCK_MONOTONIC)'
    ]
  });
});

/**
 * Run C Native Benchmark
 */
app.post('/api/c-backend/benchmark', (req: Request, res: Response) => {
  const numFiles = Number(req.body.numFiles) || 2000;
  const avgMB = Number(req.body.avgMB) || 5;

  if (!fs.existsSync(C_BIN_PATH)) {
    res.status(500).json({ error: 'C binary not found at ' + C_BIN_PATH });
    return;
  }

  const child = spawn(C_BIN_PATH, ['benchmark', String(numFiles), String(avgMB)]);
  let stdoutData = '';
  let stderrData = '';

  child.stdout.on('data', (chunk) => {
    stdoutData += chunk.toString();
  });

  child.stderr.on('data', (chunk) => {
    stderrData += chunk.toString();
  });

  child.on('close', (code) => {
    if (code !== 0) {
      res.status(500).json({ error: 'C binary failed with code ' + code, details: stderrData });
      return;
    }

    try {
      const parsed = JSON.parse(stdoutData);
      res.json(parsed);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to parse JSON output from C binary', raw: stdoutData });
    }
  });
});

/**
 * Scan a Local Directory with the C Native Engine
 */
app.post('/api/c-backend/scan', (req: Request, res: Response) => {
  const targetDir = req.body.directory || process.cwd();

  if (!fs.existsSync(C_BIN_PATH)) {
    res.status(500).json({ error: 'C binary not found' });
    return;
  }

  const child = spawn(C_BIN_PATH, ['scan', targetDir]);
  let stdoutData = '';
  let stderrData = '';

  child.stdout.on('data', (chunk) => {
    stdoutData += chunk.toString();
  });

  child.stderr.on('data', (chunk) => {
    stderrData += chunk.toString();
  });

  child.on('close', (code) => {
    if (code !== 0) {
      res.status(500).json({ error: 'Scan error', details: stderrData });
      return;
    }

    try {
      const parsed = JSON.parse(stdoutData);
      res.json(parsed);
    } catch {
      res.status(500).json({ error: 'Failed to parse JSON', raw: stdoutData });
    }
  });
});

/**
 * Retrieve C Source Code Files for in-app inspection
 */
app.get('/api/c-backend/source', (_req: Request, res: Response) => {
  const files: Record<string, string> = {};
  const filenames = ['dedup_core.c', 'sha256.c', 'sha256.h', 'Makefile'];

  for (const fn of filenames) {
    const fullPath = path.join(C_SOURCE_DIR, fn);
    if (fs.existsSync(fullPath)) {
      files[fn] = fs.readFileSync(fullPath, 'utf-8');
    }
  }

  res.json({ files });
});

/**
 * Vite integration & Server Startup
 */
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DedupCore] Express server + C Backend running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
