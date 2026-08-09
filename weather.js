const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();

// GET /api/weather?city=London  OR  ?lat=..&lon=..
router.get('/', async (req, res) => {
  try {
    if (!process.env.OPENWEATHER_API_KEY) {
      return res.status(501).json({
        error: 'Weather is not configured. Add OPENWEATHER_API_KEY to the backend .env file.',
      });
    }
    const { city, lat, lon } = req.query;
    let url;
    if (city) {
      url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        city
      )}&units=metric&appid=${process.env.OPENWEATHER_API_KEY}`;
    } else if (lat && lon) {
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${process.env.OPENWEATHER_API_KEY}`;
    } else {
      return res.status(400).json({ error: 'Provide "city" or "lat"+"lon".' });
    }

    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Weather lookup failed.' });
    }

    res.json({
      location: data.name,
      country: data.sys?.country,
      tempC: data.main?.temp,
      feelsLikeC: data.main?.feels_like,
      condition: data.weather?.[0]?.description,
      icon: data.weather?.[0]?.icon,
      humidity: data.main?.humidity,
      windKph: data.wind?.speed ? Math.round(data.wind.speed * 3.6) : null,
    });
  } catch (err) {
    console.error('Weather error:', err.message);
    res.status(500).json({ error: 'Could not fetch weather right now.' });
  }
});

module.exports = router;
