const express = require('express');
const { pool } = require('../db');
const { buildDeepLink } = require('../lib/deeplink');

const router = express.Router();

router.get('/:slug', async (req, res, next) => {
  const { slug } = req.params;

  // Let static files / other middleware handle anything that isn't a bare slug.
  if (slug.includes('.')) return next();

  try {
    const result = await pool.query(
      `UPDATE links SET clicks = clicks + 1 WHERE slug = $1
       RETURNING destination_url`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).send(renderNotFound());
    }

    const destinationUrl = result.rows[0].destination_url;
    const deepLink = buildDeepLink(destinationUrl);

    res.set('Content-Type', 'text/html');
    return res.send(renderRedirectPage(destinationUrl, deepLink));
  } catch (err) {
    console.error(err);
    return res.status(500).send('Something went wrong.');
  }
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderNotFound() {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Link not found</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         background:#F5F7FA; color:#12131A; display:flex; align-items:center;
         justify-content:center; height:100vh; margin:0; text-align:center; }
</style></head>
<body><div><h1>404</h1><p>This link doesn't exist or has expired.</p></div></body></html>`;
}

function renderRedirectPage(destinationUrl, deepLink) {
  const iosScheme = deepLink ? deepLink.iosScheme : null;
  const androidIntent = deepLink ? deepLink.androidIntent : null;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Opening…</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         background:#12131A; color:#F5F7FA; display:flex; align-items:center;
         justify-content:center; height:100vh; margin:0; }
  .box { text-align:center; }
  .spinner { width:32px; height:32px; border:3px solid #2A2D36; border-top-color:#4361EE;
             border-radius:50%; animation:spin 0.8s linear infinite; margin:0 auto 1rem; }
  @keyframes spin { to { transform: rotate(360deg); } }
  a { color:#7B8CFF; }
</style>
</head>
<body>
<div class="box">
  <div class="spinner"></div>
  <p>Opening your link…</p>
  <p><a id="fallback-link" href="${escapeHtml(destinationUrl)}">Tap here if nothing happens</a></p>
</div>
<script>
  (function () {
    var destination = ${JSON.stringify(destinationUrl)};
    var iosScheme = ${JSON.stringify(iosScheme)};
    var androidIntent = ${JSON.stringify(androidIntent)};
    var ua = navigator.userAgent || '';
    var isIOS = /iPhone|iPad|iPod/i.test(ua);
    var isAndroid = /Android/i.test(ua);

    function goToDestination() {
      window.location.href = destination;
    }

    if (isAndroid && androidIntent) {
      // Android intent:// URLs carry their own browser_fallback_url, but we
      // add a timer as a safety net in case the intent silently no-ops.
      window.location.href = androidIntent;
      setTimeout(goToDestination, 2500);
    } else if (isIOS && iosScheme) {
      var start = Date.now();
      window.location.href = iosScheme;
      setTimeout(function () {
        // If the app opened, iOS backgrounds this tab and this timer will
        // effectively be paused/delayed. If we're still active after ~1.5s,
        // the app likely isn't installed, so fall back to the browser.
        if (Date.now() - start < 3000) {
          goToDestination();
        }
      }, 1500);
    } else {
      goToDestination();
    }
  })();
</script>
</body>
</html>`;
}

module.exports = router;
