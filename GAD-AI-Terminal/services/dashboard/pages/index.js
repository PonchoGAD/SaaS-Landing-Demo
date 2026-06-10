"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServerSideProps = void 0;
exports.default = Overview;
const link_1 = __importDefault(require("next/link"));
function Overview({ tokens }) {
    return (<div style={{ padding: '32px', fontFamily: 'Inter, sans-serif' }}>
      <h1>GAD AI Dashboard</h1>
      <nav>
        <link_1.default href="/trending">Trending</link_1.default> | <link_1.default href="/watchlist">Watchlist</link_1.default> | <link_1.default href="/portfolio">Portfolio</link_1.default> | <link_1.default href="/risk">Risk</link_1.default> | <link_1.default href="/signals">Signals</link_1.default>
      </nav>
      <section style={{ marginTop: '24px' }}>
        <h2>Overview</h2>
        <p>Realtime mem-token monitoring and AI scoring for Solana.</p>
        <div>
          <h3>Top tokens</h3>
          <ul>
            {tokens.map((token) => (<li key={token.mint_address}>
                <strong>{token.symbol || token.mint_address}</strong> • market cap {token.market_cap ?? '—'}
              </li>))}
          </ul>
        </div>
      </section>
    </div>);
}
const getServerSideProps = async () => {
    const apiUrl = process.env.API_BASE_URL || 'http://localhost:4000';
    const response = await fetch(`${apiUrl}/tokens`);
    const data = await response.json();
    return { props: { tokens: data.tokens.slice(0, 8) } };
};
exports.getServerSideProps = getServerSideProps;
