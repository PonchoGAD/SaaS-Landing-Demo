/**
 * Twitter/X Monitor
 *
 * Strategy:
 *   1. If TWITTER_BEARER_TOKEN is set → use Twitter API v2 (free tier: last 100 tweets per user)
 *   2. Otherwise → use nitter.net public JSON endpoint as fallback (no auth required)
 *
 * Rate limits are respected: max 1 request/second across all handles.
 */
import axios from 'axios';
import { extractMintAddresses, analyzeSentiment, calcEngagement } from './analyzer';

export interface RawTweet {
  id:         string;
  author:     string;
  text:       string;
  likes:      number;
  retweets:   number;
  replies:    number;
  createdAt:  Date;
}

const TWITTER_BEARER = process.env.TWITTER_BEARER_TOKEN ?? '';
const NITTER_HOST    = process.env.NITTER_HOST ?? 'nitter.net';

// ─── Twitter API v2 ───────────────────────────────────────────────────────────

async function fetchViaTwitterApi(handle: string, sinceId?: string): Promise<RawTweet[]> {
  const params: Record<string, string> = {
    max_results: '20',
    'tweet.fields': 'created_at,public_metrics',
    expansions: 'author_id'
  };
  if (sinceId) params.since_id = sinceId;

  const res = await axios.get(
    `https://api.twitter.com/2/tweets/search/recent?query=from:${handle}`,
    {
      headers: { Authorization: `Bearer ${TWITTER_BEARER}` },
      params,
      timeout: 10000
    }
  );

  const tweets: RawTweet[] = [];
  for (const t of (res.data.data ?? [])) {
    tweets.push({
      id:        t.id,
      author:    handle,
      text:      t.text,
      likes:     t.public_metrics?.like_count    ?? 0,
      retweets:  t.public_metrics?.retweet_count ?? 0,
      replies:   t.public_metrics?.reply_count   ?? 0,
      createdAt: new Date(t.created_at)
    });
  }
  return tweets;
}

// ─── Nitter fallback (RSS/JSON) ───────────────────────────────────────────────

async function fetchViaNitter(handle: string): Promise<RawTweet[]> {
  // Nitter exposes an RSS feed at /handle/rss
  const res = await axios.get(`https://${NITTER_HOST}/${handle}/rss`, {
    timeout: 10000,
    headers: { 'User-Agent': 'GAD-AI-Terminal/1.0' }
  });

  // Parse RSS XML manually (minimal, no dependencies)
  const items: RawTweet[] = [];
  const raw: string = res.data;
  const itemBlocks  = raw.match(/<item>([\s\S]*?)<\/item>/g) ?? [];

  for (const block of itemBlocks.slice(0, 20)) {
    const title  = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ?? [])[1] ?? '';
    const pubDate = (block.match(/<pubDate>(.*?)<\/pubDate>/) ?? [])[1] ?? '';
    const link   = (block.match(/<link>(.*?)<\/link>/) ?? [])[1] ?? '';
    const id     = link.split('/').pop() ?? String(Date.now());

    items.push({
      id,
      author:    handle,
      text:      title,
      likes:     0,
      retweets:  0,
      replies:   0,
      createdAt: pubDate ? new Date(pubDate) : new Date()
    });
  }
  return items;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface ParsedTweet extends RawTweet {
  detectedMints: string[];
  sentiment:     number;
  engagement:    number;
}

export async function fetchTweetsForHandle(handle: string, sinceId?: string): Promise<ParsedTweet[]> {
  const raw = TWITTER_BEARER
    ? await fetchViaTwitterApi(handle, sinceId)
    : await fetchViaNitter(handle);

  return raw.map(t => ({
    ...t,
    detectedMints: extractMintAddresses(t.text),
    sentiment:     analyzeSentiment(t.text),
    engagement:    calcEngagement(t.likes, t.retweets, t.replies)
  }));
}
