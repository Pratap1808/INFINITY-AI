const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();

// GET /api/search?q=your+query
router.get('/', async (req, res) => {
  try {
    if (!process.env.BRAVE_SEARCH_API_KEY) {
      return res.status(501).json({
        error: 'Web search is not configured. Add BRAVE_SEARCH_API_KEY to the backend .env file.',
      });
    }
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query param "q" is required.' });

    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=8`,
      {
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY,
        },
      }
    );
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Search request failed.' });
    }

    const results = (data.web?.results || []).map((r) => ({
      title: r.title,
      url: r.url,
      description: r.description,
    }));
    res.json({ results });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: 'Could not search the web right now.' });
  }
});

module.exports = router;
