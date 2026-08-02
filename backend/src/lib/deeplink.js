/**
 * Maps a normal https:// destination URL to app deep-link info, when we
 * recognize the domain. Returns null for unrecognized domains (the redirect
 * page will just send the visitor straight to the destination URL).
 */

const RULES = [
  {
    test: (host) => host.includes('youtube.com') || host === 'youtu.be',
    androidPackage: 'com.google.android.youtube',
    ios: (url) => {
      const id = extractYouTubeId(url);
      return id ? `vnd.youtube://${id}` : `vnd.youtube://www.youtube.com${url.pathname}${url.search}`;
    },
  },
  {
    test: (host) => host.includes('instagram.com'),
    androidPackage: 'com.instagram.android',
    ios: () => 'instagram://app',
  },
  {
    test: (host) => host.includes('open.spotify.com'),
    androidPackage: 'com.spotify.music',
    ios: (url) => {
      // https://open.spotify.com/track/abc123 -> spotify:track:abc123
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return `spotify:${parts[0]}:${parts[1]}`;
      }
      return 'spotify://';
    },
  },
  {
    test: (host) => host.includes('amazon.'),
    androidPackage: 'com.amazon.mShop.android.shopping',
    ios: (url) => `com.amazon.mobile.shopping.web://${url.hostname}${url.pathname}${url.search}`,
  },
  {
    test: (host) => host === 'twitter.com' || host === 'x.com',
    androidPackage: 'com.twitter.android',
    ios: () => 'twitter://',
  },
  {
    test: (host) => host.includes('tiktok.com'),
    androidPackage: 'com.zhiliaoapp.musically',
    ios: () => 'tiktok://',
  },
  {
    test: (host) => host.includes('facebook.com'),
    androidPackage: 'com.facebook.katana',
    ios: (url) => `fb://facewebmodal/f?href=${encodeURIComponent(url.toString())}`,
  },
];

function extractYouTubeId(url) {
  if (url.hostname === 'youtu.be') return url.pathname.slice(1) || null;
  return url.searchParams.get('v');
}

function buildDeepLink(destinationUrl) {
  let url;
  try {
    url = new URL(destinationUrl);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '');
  const rule = RULES.find((r) => r.test(host));
  if (!rule) return null;

  const iosScheme = rule.ios(url);
  const fallback = encodeURIComponent(url.toString());
  const androidIntent =
    `intent://${host}${url.pathname}${url.search}` +
    `#Intent;scheme=https;package=${rule.androidPackage};` +
    `category=android.intent.category.BROWSABLE;S.browser_fallback_url=${fallback};end`;

  return { iosScheme, androidIntent, matchedApp: rule.androidPackage };
}

module.exports = { buildDeepLink };
