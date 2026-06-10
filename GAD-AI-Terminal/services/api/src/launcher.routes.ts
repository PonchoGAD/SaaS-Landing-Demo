import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { launchToken, sellPosition, refreshPrice, listCoins } from './launcher';
import { query } from '@lib/db';

const router = Router();

const UPLOAD_DIR = path.join('/tmp', 'launcher_uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max logo
  fileFilter: (_req, file, cb) => {
    if (/\.(png|jpg|jpeg|gif|webp)$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

// GET /launcher/coins — list all launched tokens
router.get('/coins', async (_req: Request, res: Response) => {
  try {
    const coins = await listCoins();
    res.json(coins);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /launcher/coins/:mint — single coin with events
router.get('/coins/:mint', async (req: Request, res: Response) => {
  try {
    const { mint } = req.params;
    const [coinRes, eventsRes] = await Promise.all([
      query<any>('SELECT * FROM launched_tokens WHERE mint_address = $1', [mint]),
      query<any>('SELECT * FROM launcher_events WHERE mint = $1 ORDER BY created_at DESC LIMIT 50', [mint]),
    ]);
    if (!coinRes.rows.length) return res.status(404).json({ error: 'Token not found' });
    res.json({ coin: coinRes.rows[0], events: eventsRes.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /launcher/create — deploy new token on pump.fun
router.post('/create', upload.single('logo'), async (req: Request, res: Response) => {
  try {
    const { name, ticker, description, solBudget, website, twitter, telegram } = req.body;
    if (!name || !ticker || !description || !solBudget) {
      return res.status(400).json({ error: 'name, ticker, description, solBudget required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'logo image required' });
    }

    const budget = parseFloat(solBudget);
    if (isNaN(budget) || budget < 0.05) {
      return res.status(400).json({ error: 'solBudget must be >= 0.05 SOL' });
    }

    const result = await launchToken({
      name: name.trim(),
      ticker: ticker.trim().toUpperCase(),
      description: description.trim(),
      logoPath: req.file.path,
      solBudget: budget,
      website: website?.trim(),
      twitter: twitter?.trim(),
      telegram: telegram?.trim(),
    });

    // Clean up temp file
    fs.unlink(req.file.path, () => {});

    if (!result.success) return res.status(400).json({ error: result.error });
    res.json({ mintAddress: result.mintAddress, txSignature: result.txSignature });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /launcher/coins/:mint/sell — sell owner's position
router.post('/coins/:mint/sell', async (req: Request, res: Response) => {
  try {
    const { mint } = req.params;
    const pct = parseInt(req.body.pct ?? '100', 10);
    if (pct < 1 || pct > 100) return res.status(400).json({ error: 'pct must be 1-100' });

    const result = await sellPosition(mint, pct);
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json({ solReceived: result.solReceived });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /launcher/coins/:mint/refresh — update price from DexScreener
router.post('/coins/:mint/refresh', async (req: Request, res: Response) => {
  try {
    const price = await refreshPrice(req.params.mint);
    res.json({ priceSol: price });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /launcher/coins/:mint/events — event log for a token
router.get('/coins/:mint/events', async (req: Request, res: Response) => {
  try {
    const { rows } = await query<any>(
      'SELECT * FROM launcher_events WHERE mint = $1 ORDER BY created_at DESC LIMIT 100',
      [req.params.mint]
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
