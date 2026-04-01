import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { getSession } from './browser/puppeteerSession.js';
import { scrapeAttendancePage } from './fetcher/scrapeAttendancePage.js';
import { fetchTimetable } from './fetcher/timetable.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());

// Simple in-memory cache so all three APIs can be served from one scrape
let cache = null;
let cacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getScrapedData() {
  const now = Date.now();
  if (cache && (now - cacheTime) < CACHE_TTL_MS) {
    console.log('[cache] Serving from in-memory cache');
    return cache;
  }

  const page = await getSession();
  const data = await scrapeAttendancePage(page);
  cache = data;
  cacheTime = now;
  return data;
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, environment: 'puppeteer_scraper', cacheAge: cache ? Math.round((Date.now() - cacheTime) / 1000) + 's' : 'empty' });
});

// Invalidate cache so next request forces a fresh scrape
app.post('/api/refresh', (req, res) => {
  cache = null;
  cacheTime = 0;
  res.json({ ok: true, message: 'Cache cleared. Next request will re-scrape.' });
});

app.post('/api/profile', async (req, res) => {
  try {
    const { profileData } = await getScrapedData();
    res.json(profileData);
  } catch (err) {
    console.error('[api/profile] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/profile', async (req, res) => {
  try {
    const { profileData } = await getScrapedData();
    res.json(profileData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/attendance', async (req, res) => {
  try {
    const { attendance } = await getScrapedData();
    res.json(attendance);
  } catch (err) {
    console.error('[api/attendance] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/attendance', async (req, res) => {
  try {
    const { attendance } = await getScrapedData();
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/marks', async (req, res) => {
  try {
    const { marks } = await getScrapedData();
    res.json(marks);
  } catch (err) {
    console.error('[api/marks] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/marks', async (req, res) => {
  try {
    const { marks } = await getScrapedData();
    res.json(marks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/timetable', async (req, res) => {
  try {
    const page = await getSession();
    const timetable = await fetchTimetable(page);
    res.json(timetable);
  } catch (err) {
    console.error('[api/timetable] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/timetable', async (req, res) => {
  try {
    const page = await getSession();
    const timetable = await fetchTimetable(page);
    res.json(timetable);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ SRM Scraper running on http://localhost:${PORT}`);
  console.log(`   → Call any endpoint to trigger browser login automatically`);
  console.log(`   → POST /api/refresh to clear the data cache`);
});
