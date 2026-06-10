"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Risk;
exports.getServerSideProps = getServerSideProps;
const link_1 = __importDefault(require("next/link"));
function Risk({ signals }) {
    return (<div style={{ padding: '32px', fontFamily: 'Inter, sans-serif' }}>
      <h1>Risk</h1>
      <nav>
        <link_1.default href="/">Overview</link_1.default> | <link_1.default href="/trending">Trending</link_1.default> | <link_1.default href="/watchlist">Watchlist</link_1.default> | <link_1.default href="/portfolio">Portfolio</link_1.default> | <link_1.default href="/signals">Signals</link_1.default>
      </nav>
      <div style={{ marginTop: '24px' }}>
        <h2>Risk alerts</h2>
        <ul>
          {signals.map((signal) => (<li key={signal.id}>{signal.subject} — score {signal.score}</li>))}
        </ul>
      </div>
    </div>);
}
async function getServerSideProps() {
    const apiUrl = process.env.API_BASE_URL || 'http://localhost:4000';
    const response = await fetch(`${apiUrl}/signals`);
    const data = await response.json();
    return { props: { signals: data.signals || [] } };
}
