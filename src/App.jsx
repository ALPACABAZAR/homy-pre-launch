import React, { useState, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import axios from 'axios';
import './index.css';

function App() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('waitlist');
  const [submitted, setSubmitted] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Attempt to detect country from IP to default language accurately
    const fetchLocalization = async () => {
      try {
        const response = await axios.get('https://ipapi.co/json/');
        // If country is Germany, Austria, or Switzerland, use German
        if (['DE', 'AT', 'CH'].includes(response.data.country_code)) {
          i18n.changeLanguage('de');
        } else {
          i18n.changeLanguage('en');
        }
      } catch (error) {
        console.error("Failed to detect location:", error);
      }
    };
    fetchLocalization();
  }, [i18n]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
      const endpoint = activeTab === 'waitlist' ? '/api/waitlist' : '/api/comment';
      // In development, assumes proxy or CORS allows request to backend port
      // In production (Railway), frontend and backend share the same domain
      await axios.post(endpoint, data);

      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 5000); // Reset after 5s
    } catch (err) {
      console.error("Error submitting form", err);
      alert("Failed to sumbit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-wrapper">
      <div className="lang-switcher">
        <button
          className={i18n.language === 'en' || !i18n.language ? 'active' : ''}
          onClick={() => i18n.changeLanguage('en')}
        >
          EN
        </button>
        <button
          className={i18n.language === 'de' ? 'active' : ''}
          onClick={() => i18n.changeLanguage('de')}
        >
          DE
        </button>
      </div>

      <h1 dangerouslySetInnerHTML={{ __html: t('title') }}></h1>

      <div className="colorful-bar">
        <div className="c-segment c-green"></div>
        <div className="c-segment c-yellow"></div>
        <div className="c-segment c-orange"></div>
        <div className="c-segment c-red"></div>
        <div className="c-segment c-blue"></div>
      </div>

      <div className="segmented-control">
        <div className={`active-pill ${activeTab === 'commentaries' ? 'left' : 'right'}`}></div>
        <div className={`active-indicator ${activeTab === 'commentaries' ? 'left' : 'right'}`}></div>
        <button
          className={`segment-btn commentaries-btn ${activeTab === 'commentaries' ? 'active' : ''}`}
          onClick={() => { setActiveTab('commentaries'); setSubmitted(false); }}
        >
          {t('comments_tab')}
        </button>
        <button
          className={`segment-btn waitlist-btn ${activeTab === 'waitlist' ? 'active' : ''}`}
          onClick={() => { setActiveTab('waitlist'); setSubmitted(false); }}
        >
          {t('waitlist_tab')}
        </button>
      </div>

      <div className="form-container" key={activeTab}>
        {submitted ? (
          <div className="success-message">
            {activeTab === 'waitlist' ? t('success_waitlist') : t('success_comment')}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              name="name"
              className="input-field"
              placeholder={t('placeholder_name')}
              required
            />
            <input
              type="email"
              name="email"
              className="input-field"
              placeholder={t('placeholder_email')}
              required
            />
            {activeTab === 'commentaries' && (
              <textarea
                name="comment"
                className="input-field"
                placeholder={t('placeholder_comment')}
                required
              />
            )}
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? "..." : (activeTab === 'waitlist' ? t('btn_waitlist') : t('btn_comment'))}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default App;
