"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Watchlist;
exports.getServerSideProps = getServerSideProps;
const link_1 = __importDefault(require("next/link"));
function Watchlist({ watchlist }) {
    return (<div style={{ padding: '32px', fontFamily: 'Inter, sans-serif' }}>
      <h1>Watchlist</h1>
      <nav>
        <link_1.default href="/">Overview</link_1.default> | <link_1.default href="/trending">Trending</link_1.default> | <link_1.default href="/portfolio">Portfolio</link_1.default> | <link_1.default href="/risk">Risk</link_1.default> | <link_1.default href="/signals">Signals</link_1.default>
      </nav>
      <section style={{ marginTop: '24px' }}>
        <h2>Tokens</h2>
        <ul>
          {watchlist.tokens.map((token) => (<li key={token.id}>{token.symbol || token.mint_address}</li>))}
        </ul>
      </section>
      <section style={{ marginTop: '24px' }}>
        <h2>Wallets</h2>
        <ul>
          {watchlist.wallets.map((wallet) => (<li key={wallet.id}>{wallet.address}</li>))}
        </ul>
      </section>
    </div>);
}
async function getServerSideProps() {
    const apiUrl = process.env.API_BASE_URL || 'http://localhost:4000';
    const response = await fetch(`${apiUrl}/watchlist`);
    const watchlist = await response.json();
    return { props: { watchlist } };
}
