"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Portfolio;
exports.getServerSideProps = getServerSideProps;
const link_1 = __importDefault(require("next/link"));
function Portfolio({ portfolio }) {
    return (<div style={{ padding: '32px', fontFamily: 'Inter, sans-serif' }}>
      <h1>Portfolio</h1>
      <nav>
        <link_1.default href="/">Overview</link_1.default> | <link_1.default href="/trending">Trending</link_1.default> | <link_1.default href="/watchlist">Watchlist</link_1.default> | <link_1.default href="/risk">Risk</link_1.default> | <link_1.default href="/signals">Signals</link_1.default>
      </nav>
      <table style={{ width: '100%', marginTop: '24px', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Token</th>
            <th>Entry</th>
            <th>Size</th>
            <th>TP1</th>
            <th>SL</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {portfolio.map((position) => (<tr key={position.id} style={{ borderTop: '1px solid #ddd' }}>
              <td>{position.token_id}</td>
              <td>{position.entry_price}</td>
              <td>{position.position_size}</td>
              <td>{position.take_profit_1 || '—'}</td>
              <td>{position.stop_loss || '—'}</td>
              <td>{position.status}</td>
            </tr>))}
        </tbody>
      </table>
    </div>);
}
async function getServerSideProps() {
    const apiUrl = process.env.API_BASE_URL || 'http://localhost:4000';
    const response = await fetch(`${apiUrl}/portfolio`);
    const data = await response.json();
    return { props: { portfolio: data.portfolio || [] } };
}
