"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const index_1 = require("../../libs/db/src/index");
function registerRoutes(app) {
    app.get('/tokens', async (_req, res) => {
        const { rows } = await (0, index_1.query)('SELECT * FROM tokens ORDER BY last_updated DESC LIMIT 100');
        res.json({ tokens: rows });
    });
    app.get('/tokens/:mint', async (req, res) => {
        const { mint } = req.params;
        const token = await (0, index_1.query)('SELECT * FROM tokens WHERE mint_address = $1', [mint]);
        if (!token.rows.length) {
            return res.status(404).json({ error: 'Token not found' });
        }
        const metrics = await (0, index_1.query)('SELECT * FROM token_metrics WHERE token_id = $1 ORDER BY timestamp DESC LIMIT 10', [token.rows[0].id]);
        res.json({ token: token.rows[0], metrics: metrics.rows });
    });
    app.get('/wallets/:address', async (req, res) => {
        const { address } = req.params;
        const wallet = await (0, index_1.query)('SELECT * FROM wallets WHERE address = $1', [address]);
        if (!wallet.rows.length) {
            return res.status(404).json({ error: 'Wallet not found' });
        }
        const trades = await (0, index_1.query)('SELECT * FROM wallet_trades WHERE wallet_id = $1 ORDER BY executed_at DESC LIMIT 50', [wallet.rows[0].id]);
        res.json({ wallet: wallet.rows[0], trades: trades.rows });
    });
    app.get('/watchlist', async (_req, res) => {
        const tokens = await (0, index_1.query)(`SELECT t.* FROM tokens t JOIN watchlist_tokens w ON w.token_id = t.id ORDER BY w.added_at DESC`);
        const wallets = await (0, index_1.query)(`SELECT w.* FROM wallets w JOIN watchlist_wallets x ON x.wallet_id = w.id ORDER BY x.added_at DESC`);
        res.json({ tokens: tokens.rows, wallets: wallets.rows });
    });
    app.post('/watchlist/token', async (req, res) => {
        const { mint, addedBy } = req.body;
        if (!mint)
            return res.status(400).json({ error: 'mint is required' });
        const tokenResult = await (0, index_1.query)('SELECT id FROM tokens WHERE mint_address = $1', [mint]);
        if (!tokenResult.rows.length)
            return res.status(404).json({ error: 'Token not found' });
        await (0, index_1.query)('INSERT INTO watchlist_tokens (token_id, added_by) VALUES ($1, $2) ON CONFLICT DO NOTHING', [tokenResult.rows[0].id, addedBy || 'system']);
        res.json({ success: true });
    });
    app.delete('/watchlist/token/:mint', async (req, res) => {
        const { mint } = req.params;
        const tokenResult = await (0, index_1.query)('SELECT id FROM tokens WHERE mint_address = $1', [mint]);
        if (!tokenResult.rows.length)
            return res.status(404).json({ error: 'Token not found' });
        await (0, index_1.query)('DELETE FROM watchlist_tokens WHERE token_id = $1', [tokenResult.rows[0].id]);
        res.json({ success: true });
    });
    app.post('/watchlist/wallet', async (req, res) => {
        const { address, addedBy } = req.body;
        if (!address)
            return res.status(400).json({ error: 'address is required' });
        const walletResult = await (0, index_1.query)('SELECT id FROM wallets WHERE address = $1', [address]);
        if (!walletResult.rows.length) {
            const insert = await (0, index_1.query)('INSERT INTO wallets (address, last_activity) VALUES ($1, now()) RETURNING id', [address]);
            await (0, index_1.query)('INSERT INTO watchlist_wallets (wallet_id, added_by) VALUES ($1, $2)', [insert.rows[0].id, addedBy || 'system']);
            return res.json({ success: true });
        }
        await (0, index_1.query)('INSERT INTO watchlist_wallets (wallet_id, added_by) VALUES ($1, $2) ON CONFLICT DO NOTHING', [walletResult.rows[0].id, addedBy || 'system']);
        res.json({ success: true });
    });
    app.delete('/watchlist/wallet/:address', async (req, res) => {
        const { address } = req.params;
        const walletResult = await (0, index_1.query)('SELECT id FROM wallets WHERE address = $1', [address]);
        if (!walletResult.rows.length)
            return res.status(404).json({ error: 'Wallet not found' });
        await (0, index_1.query)('DELETE FROM watchlist_wallets WHERE wallet_id = $1', [walletResult.rows[0].id]);
        res.json({ success: true });
    });
    app.get('/portfolio', async (_req, res) => {
        const portfolio = await (0, index_1.query)('SELECT * FROM portfolio_positions ORDER BY created_at DESC');
        res.json({ portfolio: portfolio.rows });
    });
    app.post('/portfolio', async (req, res) => {
        const { mint, entry_price, take_profit_1, take_profit_2, stop_loss, position_size } = req.body;
        if (!mint || !entry_price || !position_size) {
            return res.status(400).json({ error: 'mint, entry_price and position_size are required' });
        }
        const token = await (0, index_1.query)('SELECT id FROM tokens WHERE mint_address = $1', [mint]);
        if (!token.rows.length)
            return res.status(404).json({ error: 'Token not found' });
        const position = await (0, index_1.query)(`INSERT INTO portfolio_positions (token_id, entry_price, take_profit_1, take_profit_2, stop_loss, position_size) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [token.rows[0].id, entry_price, take_profit_1 || null, take_profit_2 || null, stop_loss || null, position_size]);
        await (0, index_1.query)('INSERT INTO portfolio_logs (position_id, action, details) VALUES ($1, $2, $3)', [position.rows[0].id, 'created', { entry_price, position_size }]);
        res.json({ position: position.rows[0] });
    });
    app.patch('/portfolio/:id', async (req, res) => {
        const { id } = req.params;
        const update = req.body;
        const allowed = ['take_profit_1', 'take_profit_2', 'stop_loss', 'position_size', 'status', 'current_price'];
        const keys = Object.keys(update).filter((key) => allowed.includes(key));
        if (!keys.length)
            return res.status(400).json({ error: 'No valid fields to update' });
        const sets = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
        const values = keys.map((key) => update[key]);
        values.push(id);
        const result = await (0, index_1.query)(`UPDATE portfolio_positions SET ${sets}, updated_at = now() WHERE id = $${keys.length + 1} RETURNING *`, values);
        if (!result.rows.length)
            return res.status(404).json({ error: 'Position not found' });
        await (0, index_1.query)('INSERT INTO portfolio_logs (position_id, action, details) VALUES ($1, $2, $3)', [id, 'updated', update]);
        res.json({ position: result.rows[0] });
    });
    app.get('/risk/:mint', async (req, res) => {
        const { mint } = req.params;
        const token = await (0, index_1.query)('SELECT * FROM tokens WHERE mint_address = $1', [mint]);
        if (!token.rows.length)
            return res.status(404).json({ error: 'Token not found' });
        const history = await (0, index_1.query)('SELECT * FROM score_history WHERE token_id = $1 ORDER BY created_at DESC LIMIT 5', [token.rows[0].id]);
        res.json({ token: token.rows[0], riskHistory: history.rows });
    });
    app.get('/signals', async (_req, res) => {
        const signals = await (0, index_1.query)('SELECT * FROM alerts WHERE resolved = false ORDER BY created_at DESC LIMIT 50');
        res.json({ signals: signals.rows });
    });
}
