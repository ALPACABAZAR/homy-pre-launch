import React from 'react';
import { Link } from 'react-router-dom';
import { blogPosts } from './blogData';

export default function Blog() {
  // Simple language state to filter blog posts (defaults to 'de' or 'en' based on preference)
  const [langFilter, setLangFilter] = React.useState('all');

  const filteredPosts = blogPosts.filter(post => {
    if (langFilter === 'all') return true;
    return post.lang === langFilter;
  });

  return (
    <div className="app-wrapper blog-container-page">
      <div className="blog-header">
        <Link to="/" className="back-home-link">
          ← {langFilter === 'de' ? 'Zurück zur Startseite' : 'Back to Home'}
        </Link>
        <div className="blog-lang-filter">
          <button 
            className={langFilter === 'all' ? 'active' : ''} 
            onClick={() => setLangFilter('all')}
          >
            All
          </button>
          <button 
            className={langFilter === 'en' ? 'active' : ''} 
            onClick={() => setLangFilter('en')}
          >
            EN
          </button>
          <button 
            className={langFilter === 'de' ? 'active' : ''} 
            onClick={() => setLangFilter('de')}
          >
            DE
          </button>
        </div>
      </div>

      <p className="availability-pill">HOMY Blog</p>
      <h1>Wohnung & WG-Suche in Freiburg</h1>
      <p className="subtitle">Learn how to find cheap apartments, roommates, Wohnungstausch (swap) and rent your house in Freiburg.</p>

      <div className="colorful-bar">
        <div className="c-segment c-green"></div>
        <div className="c-segment c-yellow"></div>
        <div className="c-segment c-orange"></div>
        <div className="c-segment c-red"></div>
        <div className="c-segment c-blue"></div>
      </div>

      <div className="blog-posts-list">
        {filteredPosts.map(post => (
          <article key={post.slug} className="blog-card">
            <span className="blog-card-lang-tag">{post.lang.toUpperCase()}</span>
            <span className="blog-card-date">{post.date}</span>
            <h2 className="blog-card-title">
              <Link to={`/blog/${post.slug}`}>{post.title}</Link>
            </h2>
            <p className="blog-card-desc">{post.metaDescription}</p>
            <Link to={`/blog/${post.slug}`} className="read-more-link">
              {post.lang === 'de' ? 'Weiterlesen →' : 'Read more →'}
            </Link>
          </article>
        ))}
      </div>

      <nav className="legal-footer" aria-label="Legal links">
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/impressum">Impressum</Link>
      </nav>
    </div>
  );
}
