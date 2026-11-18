// Open Library client: live search, covers, work details, trending.
export const API = 'https://openlibrary.org';
export const PAGE_SIZE = 24;
const COVERS = 'https://covers.openlibrary.org/b/id/';
const FIELDS = 'key,title,author_name,first_publish_year,cover_i,subject,ratings_average,ratings_count,number_of_pages_median';

// label shown on the chip -> Open Library subject used for the live query
export const CATEGORIES = [
  { label: 'Fiction', subject: 'fiction' },
  { label: 'Fantasy', subject: 'fantasy' },
  { label: 'Sci-Fi', subject: 'science fiction' },
  { label: 'Mystery', subject: 'mystery' },
  { label: 'Romance', subject: 'romance' },
  { label: 'Horror', subject: 'horror' },
  { label: 'History', subject: 'history' },
  { label: 'Science', subject: 'science' },
  { label: 'Technology', subject: 'computer science' },
  { label: 'Self-Help', subject: 'self-help' },
  { label: 'Biography', subject: 'biography' },
  { label: 'Cooking', subject: 'cooking' }
];
export const CATEGORY_LABELS = ['All', ...CATEGORIES.map((c) => c.label)];

export const coverUrl = (book, size) => `${COVERS}${book.cover}-${size}.jpg?default=false`;

export async function fetchJSON(url, signal, timeout = 12000) {
  const c = new AbortController();
  const timer = setTimeout(() => c.abort(), timeout);
  if (signal) {
    if (signal.aborted) c.abort();
    else signal.addEventListener('abort', () => c.abort(), { once: true });
  }
  try {
    const res = await fetch(url, { signal: c.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export const cleanText = (s) =>
  s.replace(/[^\p{L}\p{N}\s']/gu, ' ').replace(/\b(AND|OR|NOT)\b/g, ' ').replace(/\s+/g, ' ').trim();

const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
const colorFor = (s) => `hsl(${hash(s) % 360} 45% 32%)`;
// Open Library has no prices, so derive a stable illustrative price from the book id.
const priceFor = (id, pages) => 399 + (hash(id) % 25) * 100 + (pages > 600 ? 400 : 0);

function guessCategory(subjects) {
  const text = subjects.join('|').toLowerCase();
  const hit = CATEGORIES.find((c) => text.includes(c.subject));
  return hit ? hit.label : 'Books';
}

export function fromDoc(d) {
  const id = String(d.key || '').replace('/works/', '');
  if (!/^OL\d+W$/.test(id) || !d.title) return null;
  const subjects = (d.subject || []).filter((s) => typeof s === 'string' && s.length < 40).slice(0, 8);
  return {
    id,
    title: d.title,
    author: (d.author_name && d.author_name[0]) || 'Unknown author',
    category: guessCategory(subjects),
    price: priceFor(id, d.number_of_pages_median),
    rating: d.ratings_average ? Math.round(d.ratings_average * 10) / 10 : 0,
    ratings: d.ratings_count || 0,
    year: d.first_publish_year || null,
    cover: d.cover_i || null,
    color: colorFor(id),
    pages: d.number_of_pages_median || null,
    subjects
  };
}

const docsToBooks = (data) => (data.docs || []).map(fromDoc).filter(Boolean);

// sort is only passed to the API for 'rating' / 'new'; other sorts are applied client-side
export function searchUrl({ query, category, sort, page }) {
  const text = cleanText(query);
  const cat = CATEGORIES.find((c) => c.label === category);
  const parts = [text ? `(${text})` : 'ratings_count:[3 TO *]', 'language:eng'];
  if (cat) parts.push(`subject:"${cat.subject}"`);
  const apiSort = sort === 'rating' || sort === 'new' ? sort : (text ? '' : 'readinglog');
  return `${API}/search.json?q=${encodeURIComponent(parts.join(' AND '))}&fields=${FIELDS}` +
    `&has_fields=cover_i&limit=${PAGE_SIZE}&page=${page}${apiSort ? `&sort=${apiSort}` : ''}`;
}

export async function searchBooks(params, signal) {
  const data = await fetchJSON(searchUrl(params), signal);
  return { books: docsToBooks(data), total: data.numFound || 0 };
}

export async function fetchTrending(signal) {
  const data = await fetchJSON(`${API}/trending/weekly.json?limit=14`, signal);
  return (data.works || []).filter((w) => w.cover_i).map(fromDoc).filter(Boolean).slice(0, 12);
}

export async function fetchSurprise(signal) {
  const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const page = 1 + Math.floor(Math.random() * 30);
  const q = `ratings_count:[3 TO *] AND language:eng AND subject:"${cat.subject}"`;
  const data = await fetchJSON(
    `${API}/search.json?q=${encodeURIComponent(q)}&fields=${FIELDS}&has_fields=cover_i&limit=1&page=${page}&sort=readinglog`,
    signal
  );
  const book = docsToBooks(data)[0];
  if (!book) throw new Error('empty');
  return book;
}

function cleanDescription(d) {
  const text = (typeof d === 'string' ? d : (d && d.value) || '')
    .split(/\r?\n-{5,}/)[0]
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|__/g, '')
    .trim();
  return text.length > 900 ? `${text.slice(0, 900).replace(/\s+\S*$/, '')}…` : text;
}

// Description, subjects and rating breakdown for the details dialog. Never rejects.
export async function fetchDetails(id, signal) {
  const [work, ratings] = await Promise.all([
    fetchJSON(`${API}/works/${id}.json`, signal).catch(() => null),
    fetchJSON(`${API}/works/${id}/ratings.json`, signal).catch(() => null)
  ]);
  const extra = { loading: false, description: work ? cleanDescription(work.description) : '' };
  if (work && Array.isArray(work.subjects)) extra.subjects = work.subjects.filter((s) => s.length < 40);
  if (ratings && ratings.summary && ratings.summary.count) {
    extra.rating = Math.round(ratings.summary.average * 10) / 10;
    extra.ratings = ratings.summary.count;
    extra.histogram = ratings.counts;
  }
  return extra;
}

export async function fetchMoreByAuthor(book, signal) {
  const name = cleanText(book.author);
  if (!name) return [];
  const q = `author:"${name}" AND language:eng`;
  const data = await fetchJSON(
    `${API}/search.json?q=${encodeURIComponent(q)}&fields=${FIELDS}&has_fields=cover_i&limit=12&sort=readinglog`,
    signal
  );
  const seen = new Set([book.title.toLowerCase()]);
  return docsToBooks(data).filter((x) => {
    const t = x.title.toLowerCase();
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  }).slice(0, 8);
}
