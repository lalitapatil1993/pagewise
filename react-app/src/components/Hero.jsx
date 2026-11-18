import BookStrip from './BookStrip.jsx';

export default function Hero({ trending, onDetails, onSurprise, surprising }) {
  return (
    <section className="hero">
      <div className="container">
        <h1>Find your next favourite read</h1>
        <p>Live listings from millions of real books, with real covers – delivered to your door.</p>
        <div className="hero-actions">
          <a className="btn btn-primary" href="#catalog">Browse books</a>
          <button type="button" className="btn btn-ghost" disabled={surprising} onClick={onSurprise}>🎲 Surprise me</button>
        </div>

        {trending.length > 0 && (
          <div className="trending">
            <h2 className="trending-title">🔥 Trending this week</h2>
            <BookStrip books={trending} onDetails={onDetails} />
          </div>
        )}
      </div>
    </section>
  );
}
