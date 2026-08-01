import { get } from "./client.js";

const CACHE_KEY = 'springwave_universities';
const DOMAIN_CACHE_KEY = 'springwave_university_domains';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Get all active universities. Cached in sessionStorage.
 * @returns {Promise<Array>} Array of university objects {name, shortName, domains, logo, color}
 */
export async function getUniversities() {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL) return data;
    }
  } catch (e) {}

  try {
    const result = await get('/universities');
    const universities = result.universities || [];
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: universities, ts: Date.now() }));
    } catch (e) {}
    return universities;
  } catch (err) {
    console.error('Failed to fetch universities from API:', err);
    return [];
  }
}

/**
 * Get domain-to-university mapping. Cached in sessionStorage.
 * @returns {Promise<Object>} Map of { "vku.udn.vn": { id, name, shortName }, ... }
 */
export async function getDomainMap() {
  try {
    const cached = sessionStorage.getItem(DOMAIN_CACHE_KEY);
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL) return data;
    }
  } catch (e) {}

  try {
    const result = await get('/universities/domains');
    const domains = result.domains || {};
    try {
      sessionStorage.setItem(DOMAIN_CACHE_KEY, JSON.stringify({ data: domains, ts: Date.now() }));
    } catch (e) {}
    return domains;
  } catch (err) {
    console.error('Failed to fetch university domain map from API:', err);
    return {};
  }
}

/**
 * Check if an email belongs to a known school domain.
 * Uses the cached domain map from the API.
 * @param {string} email
 * @returns {Promise<{isSchool: boolean, university: Object|null}>}
 */
export async function checkSchoolEmail(email) {
  if (!email || typeof email !== 'string') return { isSchool: false, university: null };
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return { isSchool: false, university: null };

  const domainMap = await getDomainMap();

  for (const [schoolDomain, uni] of Object.entries(domainMap)) {
    if (domain === schoolDomain || domain.endsWith('.' + schoolDomain)) {
      return { isSchool: true, university: uni };
    }
  }
  return { isSchool: false, university: null };
}

/**
 * Populate a <select> element with university options.
 * @param {HTMLSelectElement|string} selectElOrId
 * @param {string} [selectedValue] - Pre-select this university name
 */
export async function populateUniversitySelect(selectElOrId, selectedValue = '') {
  const selectEl = typeof selectElOrId === 'string' ? document.getElementById(selectElOrId) : selectElOrId;
  if (!selectEl) return;

  const universities = await getUniversities();
  
  // Clear existing options except placeholder
  const placeholder = selectEl.options[0]?.value === '' ? selectEl.options[0] : null;
  selectEl.innerHTML = '';
  if (placeholder) {
    selectEl.appendChild(placeholder);
  }

  universities.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.name;
    opt.textContent = u.shortName ? `${u.name} (${u.shortName})` : u.name;
    if (selectedValue && (u.name === selectedValue || u.shortName === selectedValue)) {
      opt.selected = true;
    }
    selectEl.appendChild(opt);
  });

  if (selectedValue) {
    selectEl.value = selectedValue;
  }
}
