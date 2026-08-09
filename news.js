const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();

// GET /api/news?topic=technology&country=us
router.get('/', async (req, res) => {
  try {
    if (!process.env.NEWS_API_KEY) {
      return res.status(501).json({
        error: 'News is not configured. Add NEWS_API_KEY to the backend .env file.',
      });
    }
    const { topic, country = 'us' } = req.query;
    const base = topic
      ? `https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&sortBy=publishedAt&pageSize=10`
      : `https://newsapi.org/v2/top-headlines?country=${encodeURIComponent(country)}&pageSize=10`;

    const response = await fetch(base, {
      headers: { 'X-Api-Key': process.env.NEWS_API_KEY },
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'News lookup failed.' });
    }

    const articles = (data.articles || []).map((a) => ({
      title: a.title,
      source: a.source?.name,
      url: a.url,
      publishedAt: a.publishedAt,
      description: a.description,
      image: a.urlToImage,
    }));
    res.json({ articles });
  } catch (err) {
    console.error('News error:', err.message);
    res.status(500).json({ error: 'Could not fetch news right now.' });
  }
});

module.exports = router;
