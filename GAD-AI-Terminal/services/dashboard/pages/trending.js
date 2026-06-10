"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Trending;
exports.getServerSideProps = getServerSideProps;
const link_1 = __importDefault(require("next/link"));
function Trending({ tokens }) {
    return (<div style={{ padding: '32px', fontFamily: 'Inter, sans-serif' }}>
      <h1>Trending</h1>
      <nav>
        <link_1.default href="/">Overview</link_1.default> | <link_1.default href="/watchlist">Watchlist</link_1.default> | <link_1.default href="/portfolio">Portfolio</link_1.default> | <link_1.default href="/risk">Risk</link_1.default> | <link_1.default href="/signals">Signals</link_1.default>
      </nav>
      <ul style={{ marginTop: '24px' }}>
        {tokens.map((token) => (<li key={token.mint_address}>
            {token.symbol || token.mint_address} — market cap {token.market_cap ?? 'n/a'} — liquidity {token.liquidity ?? 'n/a'}
          </li>))}
      </ul>
    </div>);
}
async function getServerSideProps() {
    const apiUrl = process.env.API_BASE_URL || 'http://localhost:4000';
    const response = await fetch(`${apiUrl}/tokens`);
    const data = await response.json();
    return { props: { tokens: data.tokens.slice(0, 12) } };
}
