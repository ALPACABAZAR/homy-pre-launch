import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { blogPosts } from './blogData';

export default function BlogPost() {
  const { slug } = useParams();
  const post = blogPosts.find(p => p.slug === slug);

  useEffect(() => {
    if (post) {
      document.title = `${post.title} | HOMY Blog`;
      
      // Attempt to update meta description dynamically for bots that execute JavaScript
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', post.metaDescription);
      }
    }
  }, [post]);

  if (!post) {
    return (
      <div className="app-wrapper blog-container-page">
        <p className="availability-pill">404</p>
        <h1>Article Not Found</h1>
        <p className="subtitle">We couldn't find the article you were looking for.</p>
        <Link to="/blog" className="back-home-link">← Back to Blog</Link>
      </div>
    );
  }

  return (
    <div className="app-wrapper blog-post-page-detail">
      <div className="blog-header">
        <Link to="/blog" className="back-home-link">
          ← {post.lang === 'de' ? 'Zurück zum Blog' : 'Back to Blog'}
        </Link>
        <span className="blog-card-lang-tag post-detail-lang">{post.lang.toUpperCase()}</span>
      </div>

      <p className="availability-pill">{post.date}</p>
      <h1 className="post-detail-title">{post.title}</h1>

      <div className="colorful-bar">
        <div className="c-segment c-green"></div>
        <div className="c-segment c-yellow"></div>
        <div className="c-segment c-orange"></div>
        <div className="c-segment c-red"></div>
        <div className="c-segment c-blue"></div>
      </div>

      <article className="blog-post-content-container" dangerouslySetInnerHTML={{ __html: post.content }} />

      <div className="blog-post-cta">
        <h3>{post.lang === 'de' ? 'Bereit für eine stressfreie WG- & Wohnungssuche?' : 'Ready to search stress-free?'}</h3>
        <p>{post.lang === 'de' ? 'Lade HOMY jetzt herunter und finde dein passendes Zuhause per Swipe!' : 'Download HOMY now and find your perfect home with a simple swipe!'}</p>
        <div className="store-badges">
          <a className="store-btn store-btn-active" href="https://apps.apple.com/de/app/homy-rent-and-swap/id6766799894?l=en-GB" target="_blank" rel="noopener noreferrer">
            <svg className="store-btn-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            <div className="store-btn-text">
              <span className="store-btn-sub">Download on the</span>
              <span className="store-btn-name">App Store</span>
            </div>
          </a>
        </div>
      </div>

      <nav className="legal-footer" aria-label="Legal links">
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/impressum">Impressum</Link>
      </nav>
    </div>
  );
}
