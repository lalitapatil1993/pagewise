import { useEffect, useState } from 'react';
import { fetchTrending } from '../api.js';

export function useTrending() {
  const [books, setBooks] = useState([]);
  useEffect(() => {
    const c = new AbortController();
    fetchTrending(c.signal)
      .then((list) => { if (!c.signal.aborted) setBooks(list); })
      .catch(() => { /* hero works without trending */ });
    return () => c.abort();
  }, []);
  return books;
}
