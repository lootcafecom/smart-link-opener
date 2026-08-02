(function () {
  const form = document.getElementById('link-form');
  const destinationInput = document.getElementById('destinationUrl');
  const slugInput = document.getElementById('customSlug');
  const slugPrefix = document.getElementById('slug-prefix');
  const submitBtn = document.getElementById('submit-btn');
  const errorMsg = document.getElementById('error-msg');
  const result = document.getElementById('result');
  const resultUrl = document.getElementById('result-url');
  const resultMeta = document.getElementById('result-meta');
  const copyBtn = document.getElementById('copy-btn');

  slugPrefix.textContent = window.location.host + '/';

  function showError(message) {
    errorMsg.textContent = message;
    errorMsg.hidden = false;
  }

  function clearError() {
    errorMsg.hidden = true;
    errorMsg.textContent = '';
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearError();
    result.hidden = true;

    const destinationUrl = destinationInput.value.trim();
    const customSlug = slugInput.value.trim();

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating…';

    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationUrl, customSlug: customSlug || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      resultUrl.textContent = data.shortUrl;
      resultMeta.textContent = 'Opens ' + destinationUrl + ' — falls back to the browser automatically.';
      result.hidden = false;
      form.reset();
      slugPrefix.textContent = window.location.host + '/';
    } catch (err) {
      showError('Could not reach the server. Is the backend running?');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create smart link';
    }
  });

  copyBtn.addEventListener('click', async function () {
    try {
      await navigator.clipboard.writeText(resultUrl.textContent);
      copyBtn.textContent = 'Copied';
      setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1500);
    } catch (err) {
      // Clipboard API unavailable (e.g. insecure context) — select text as a fallback.
      const range = document.createRange();
      range.selectNode(resultUrl);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
    }
  });
})();
