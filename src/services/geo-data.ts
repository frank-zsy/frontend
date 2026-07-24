/**
 * Geo data service – loads country/subdivision data from OpenDigger
 * and provides locale-aware lookup utilities.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeoCity {
  name_zh: string; // Chinese name (always present)
  name?: string; // English name (may be absent)
  id?: string; // ID (may be absent)
}

export interface GeoSubdivision {
  id: string; // e.g. ":divisions/CN/CN-BJ"
  alpha2: string; // e.g. "CN-BJ"
  name: string; // English name
  name_zh: string; // Chinese name
  type: string; // "Division-1"
  category: string; // e.g. "PROVINCE", "STATE"
  cities?: GeoCity[]; // City-level data (only some subdivisions have this)
}

export interface GeoCountry {
  id: string; // e.g. ":divisions/CN"
  alpha2: string; // e.g. "CN"
  name: string; // English name
  name_zh: string; // Chinese name
  name_full: string; // Full official name
  type: string; // "Division-0"
  subdivisions: GeoSubdivision[];
}

// ---------------------------------------------------------------------------
// Data source
// ---------------------------------------------------------------------------

const GEO_DATA_URL = 'https://oss.open-digger.cn/countries.json';

// ---------------------------------------------------------------------------
// Cache (singleton + concurrent-safe)
// ---------------------------------------------------------------------------

let cachedData: GeoCountry[] | null = null;
let inflightRequest: Promise<GeoCountry[]> | null = null;

/**
 * Load geo data from OpenDigger. Uses module-level cache so the network
 * request is performed at most once. Concurrent calls share the same promise.
 */
async function loadGeoData(): Promise<GeoCountry[]> {
  if (cachedData) return cachedData;
  if (inflightRequest) return inflightRequest;

  inflightRequest = (async () => {
    try {
      const res = await fetch(GEO_DATA_URL);
      if (!res.ok) {
        throw new Error(`Failed to fetch geo data: ${res.status}`);
      }
      const json = await res.json();
      // The endpoint returns {exportTime, countries: [...]} wrapper
      const data = (Array.isArray(json) ? json : json.countries || []) as GeoCountry[];
      cachedData = data;
      return data;
    } finally {
      inflightRequest = null;
    }
  })();

  return inflightRequest;
}

// ---------------------------------------------------------------------------
// Sort helpers
// ---------------------------------------------------------------------------

function sortByLocale<T>(items: T[], locale: string, getName: (item: T) => string): T[] {
  const collatorLocale = locale === 'zh' ? 'zh-Hans-CN' : 'en';
  return [...items].sort((a, b) => getName(a).localeCompare(getName(b), collatorLocale));
}

function getNameByLocale(name: string, nameZh: string, locale: string): string {
  // Some entries lack one of the localized names (e.g. subdivisions without a
  // Chinese name_zh), so fall back to the other to avoid returning undefined.
  return (locale === 'zh' ? nameZh : name) || name || nameZh || '';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the full list of countries, sorted by the given locale.
 * - locale === 'zh': sorted by name_zh using zh-Hans-CN collation (pinyin order)
 * - otherwise: sorted by name using en collation
 */
export async function getCountries(locale: string): Promise<GeoCountry[]> {
  const data = await loadGeoData();
  return sortByLocale(data, locale, (c) => getNameByLocale(c.name, c.name_zh, locale));
}

/**
 * Get subdivisions for a specific country, sorted by the given locale.
 * @param countryId - The country id (e.g. ":divisions/CN") or alpha2 code (e.g. "CN")
 */
export async function getSubdivisions(countryId: string, locale: string): Promise<GeoSubdivision[]> {
  const data = await loadGeoData();
  const country = data.find((c) => c.id === countryId || c.alpha2 === countryId);
  if (!country) return [];
  return sortByLocale(country.subdivisions || [], locale, (s) =>
    getNameByLocale(s.name, s.name_zh, locale),
  );
}

/**
 * Resolve a location ID to a human-readable name.
 * - Country-level ID (e.g. ":divisions/CN") → country name
 * - Subdivision-level ID (e.g. ":divisions/CN/CN-BJ") → "Country / Subdivision"
 */
export function resolveLocationName(id: string, locale: string, data: GeoCountry[]): string {
  if (!id || !data.length) return id || '';

  // Try country-level match first
  const country = data.find((c) => c.id === id || c.alpha2 === id);
  if (country) {
    return getNameByLocale(country.name, country.name_zh, locale);
  }

  // Try subdivision-level match
  for (const c of data) {
    const sub = (c.subdivisions || []).find((s) => s.id === id || s.alpha2 === id);
    if (sub) {
      const countryName = getNameByLocale(c.name, c.name_zh, locale);
      const subName = getNameByLocale(sub.name, sub.name_zh, locale);
      return `${countryName} / ${subName}`;
    }
  }

  return id;
}

/**
 * Synchronous version of resolveLocationName. Uses the cached data if available.
 * Returns null if data has not been loaded yet.
 */
export function resolveLocationNameSync(id: string, locale: string): string | null {
  if (!cachedData) return null;
  return resolveLocationName(id, locale, cachedData);
}

/**
 * Resolve the full "Country / Subdivision / City" display label for a stored
 * profile location. Loads geo data on demand.
 *
 * City-level data only carries a Chinese name (name_zh), so the city level is
 * only rendered in the Chinese locale and omitted in other locales.
 *
 * @param cityName - The stored city name (matches GeoCity.name_zh).
 */
export async function getLocationLabel(
  countryId: string,
  subdivisionId: string,
  cityName: string,
  locale: string,
): Promise<string> {
  if (!countryId) return '';
  const data = await loadGeoData();
  const country = data.find((c) => c.id === countryId || c.alpha2 === countryId);
  if (!country) return '';

  const parts: string[] = [getNameByLocale(country.name, country.name_zh, locale)];

  if (subdivisionId) {
    const sub = (country.subdivisions || []).find(
      (s) => s.id === subdivisionId || s.alpha2 === subdivisionId,
    );
    if (sub) {
      parts.push(getNameByLocale(sub.name, sub.name_zh, locale));

      // Cities only have a Chinese name, so render them in the Chinese locale only.
      if (cityName && locale === 'zh') {
        const city = (sub.cities || []).find(
          (c) => c.name_zh === cityName || c.name === cityName,
        );
        parts.push(city ? city.name_zh : cityName);
      }
    }
  }

  return parts.join(' / ');
}

/**
 * Get cities for a specific subdivision, sorted by name_zh.
 * Cities only have name_zh (Chinese name), no id or English name guaranteed.
 * @param countryId - The country id (e.g. ":divisions/CN") or alpha2 code (e.g. "CN")
 * @param subdivisionId - The subdivision id (e.g. ":divisions/CN/CN-BJ") or alpha2 code (e.g. "CN-BJ")
 */
export async function getCities(
  countryId: string,
  subdivisionId: string,
  locale: string,
): Promise<GeoCity[]> {
  const data = await loadGeoData();
  const country = data.find((c) => c.id === countryId || c.alpha2 === countryId);
  if (!country) return [];

  const subdivision = (country.subdivisions || []).find(
    (s) => s.id === subdivisionId || s.alpha2 === subdivisionId,
  );
  if (!subdivision || !hasCities(subdivision)) return [];

  const collatorLocale = locale === 'zh' ? 'zh-Hans-CN' : 'en';
  return [...subdivision.cities!].sort((a, b) =>
    (a.name_zh || a.name || '').localeCompare(b.name_zh || b.name || '', collatorLocale),
  );
}

/**
 * Check if a subdivision has city-level data available.
 */
export function hasCities(subdivision: GeoSubdivision): boolean {
  return Array.isArray(subdivision.cities) && subdivision.cities.length > 0;
}
