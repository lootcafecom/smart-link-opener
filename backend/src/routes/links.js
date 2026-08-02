const express = require('express');
const { nanoid } = require('nanoid');
const { pool } = require('../db');

const router = express.Router();

const RESERVED_SLUGS = new Set(['api', 'favicon.ico', 'style.css', 'app.js', 'index.html']);

function isValidUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function serializeLink(row, req) {
  return {
    slug: row.slug,
    destinationUrl: row.destination_url,
    clicks: row.clicks,
    createdAt: row.created_at,
    shortUrl: `${req.protocol}://${req.get('host')}/${row.slug}`,
  };
}

// POST /api/links  { destinationUrl, customSlug? }
router.post('/', async (req, res) => {
  const { destinationUrl, customSlug } = req.body || {};

  if (!destinationUrl || !isValidUrl(destinationUrl)) {
    return res.status(400).json({ error: 'A valid destinationUrl (http/https) is required.' });
  }

  let slug = (customSlug || '').trim();

  if (slug) {
    if (!/^[a-zA-Z0-9_-]{3,32}$/.test(slug)) {
      return res
        .status(400)
        .json({ error: 'Custom slug must be 3-32 characters: letters, numbers, "-" or "_".' });
    }
    if (RESERVED_SLUGS.has(slug.toLowerCase())) {
      return res.status(400).json({ error: 'That slug is reserved. Please choose another.' });
    }
  } else {
    slug = nanoid(7);
  }

  try {
    const result = await pool.query(
      `INSERT INTO links (slug, destination_url) VALUES ($1, $2)
       RETURNING slug, destination_url, clicks, created_at`,
      [slug, destinationUrl]
    );
    return res.status(201).json(serializeLink(result.rows[0], req));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'That slug is already taken.' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong creating the link.' });
  }
});

// GET /api/links/:slug  -> metadata + click count (does NOT increment clicks)
router.get('/:slug', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT slug, destination_url, clicks, created_at FROM links WHERE slug = $1`,
      [req.params.slug]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Link not found.' });
    }
    return res.json(serializeLink(result.rows[0], req));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong fetching the link.' });
  }
});

module.exports = router;
