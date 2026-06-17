const SCRIPT_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const ON_EVENT_PATTERN = /\son\w+\s*=\s*["'][^"']*["']/gi;
const JAVASCRIPT_PATTERN = /javascript\s*:/gi;
const HTML_TAG_PATTERN = /<[^>]*>/g;

export function sanitizeHtml(str) {
  if (!str) return '';
  if (typeof str !== 'string') return String(str);

  return str
    .replace(SCRIPT_PATTERN, '')
    .replace(ON_EVENT_PATTERN, '')
    .replace(JAVASCRIPT_PATTERN, '')
    .replace(HTML_TAG_PATTERN, '')
    .trim();
}

export function sanitizeField(obj, fields) {
  if (!obj || !fields) return obj;
  const sanitized = { ...obj };
  for (const field of fields) {
    if (sanitized[field]) {
      sanitized[field] = sanitizeHtml(sanitized[field]);
    }
  }
  return sanitized;
}

export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function stripHtml(html) {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}
