// [HOMY] Landing page for homyforme.com: hero, updates/waitlist signup posting to /api/waitlist on
// server/index.js, language handling via i18n.js (explicit user pick locks the locale via
// useRef).

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './index.css';

function App() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('android');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gdprChecked, setGdprChecked] = useState(false);
  const [gdprError, setGdprError] = useState(false);
  const formRef = useRef(null);
  const userPickedLang = useRef(false);
  const appStoreUrl =
    import.meta.env.VITE_APP_STORE_URL ||
    'https://apps.apple.com/de/app/homy-rent-and-swap/id6766799894?l=en-GB';

  useEffect(() => {
    if (typeof window !== 'undefined' && /^\/de(\/|$)/.test(window.location.pathname)) {
      userPickedLang.current = true;
      i18n.changeLanguage('de');
      return;
    }
    const fetchLocalization = async () => {
      try {
        const response = await axios.get('https://ipapi.co/json/', { timeout: 3000 });
        if (!userPickedLang.current) {
          if (['DE', 'AT', 'CH'].includes(response.data.country_code)) {
            i18n.changeLanguage('de');
          } else {
            i18n.changeLanguage('en');
          }
        }
      } catch (error) {
        console.error("Failed to detect location:", error);
      }
    };
    fetchLocalization();
  }, [i18n]);

  const switchLang = (lang) => {
    userPickedLang.current = true;
    i18n.changeLanguage(lang);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!gdprChecked) {
      setGdprError(true);
      return;
    }

    setIsSubmitting(true);
    setGdprError(false);

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
      const endpoint =
        activeTab === 'ideas'
          ? '/api/comment'
          : '/api/android-waitlist';
      await axios.post(endpoint, data);
      
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'generate_lead', {
          event_category: 'engagement',
          event_label: activeTab === 'ideas' ? 'feedback_submission' : 'waitlist_registration',
          value: 1.0
        });
      }

      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 6000);
    } catch (err) {
      console.error("Error submitting form", err);
      alert("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSubmitted(false);
    setGdprError(false);
  };

  const successKey = activeTab === 'ideas'
    ? 'success_comment'
    : 'success_android';

  const submitLabelKey = activeTab === 'ideas'
    ? 'btn_comment'
    : 'btn_android';

  const pillPosition = activeTab === 'ideas'
    ? 'left'
    : 'right';

  return (
    <div className="app-wrapper">
      <div className="lang-switcher">
        <button
          className={i18n.language === 'en' || !i18n.language ? 'active' : ''}
          onClick={() => switchLang('en')}
        >
          EN
        </button>
        <button
          className={i18n.language === 'de' ? 'active' : ''}
          onClick={() => switchLang('de')}
        >
          DE
        </button>
      </div>

      <p className="availability-pill">{t('availability_pill')}</p>
      <h1 dangerouslySetInnerHTML={{ __html: t('title') }}></h1>
      <p className="subtitle">{t('subtitle')}</p>

      <div className="colorful-bar">
        <div className="c-segment c-green"></div>
        <div className="c-segment c-yellow"></div>
        <div className="c-segment c-orange"></div>
        <div className="c-segment c-red"></div>
        <div className="c-segment c-blue"></div>
      </div>

      <div className="store-badges store-badges-primary">
        <div className="store-buttons">
          <a className="store-btn store-btn-active" href={appStoreUrl} target="_blank" rel="noopener noreferrer">
            <svg className="store-btn-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            <div className="store-btn-text">
              <span className="store-btn-sub">{t('app_store_sub')}</span>
              <span className="store-btn-name">App Store</span>
            </div>
          </a>

          <button className="store-btn store-btn-waitlist" type="button" disabled aria-disabled="true">
            <svg className="store-btn-icon google-play-icon" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
              <path d="M52.7 28.4c-13.8 7.5-22 21.9-22 38.5v378.2c0 16.6 8.2 31 22 38.5l212.2-227.6L52.7 28.4z"/>
              <path d="M264.9 256 52.7 28.4c6.8-3.7 14.9-4.3 23-1.5l269.2 148.7L264.9 256z"/>
              <path d="M344.9 336.4 75.7 485.1c-8.1 2.8-16.2 2.2-23-1.5L264.9 256l80 80.4z"/>
              <path d="M458.3 230.8c24.4 13.5 24.4 36.9 0 50.4l-113.4 55.2-80-80.4 80-80.4 113.4 55.2z"/>
            </svg>
            <div className="store-btn-text">
              <span className="store-btn-sub">{t('google_play_sub')}</span>
              <span className="store-btn-name">{t('google_play_name')}</span>
            </div>
          </button>
        </div>
      </div>

      <div className="segmented-control">
        <div className={`active-pill ${pillPosition}`}></div>
        <div className={`active-indicator ${pillPosition}`}></div>
        <button
          className={`segment-btn ideas-btn ${activeTab === 'ideas' ? 'active' : ''}`}
          onClick={() => switchTab('ideas')}
        >
          {t('ideas_tab')}
        </button>
        <button
          className={`segment-btn android-btn ${activeTab === 'android' ? 'active' : ''}`}
          onClick={() => switchTab('android')}
        >
          {t('updates_tab')}
        </button>
      </div>

      <div className="form-container" key={activeTab} ref={formRef}>
        {submitted ? (
          <div className="success-message">
            {t(successKey)}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="form-intro">{t(`form_intro_${activeTab}`)}</p>
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
            {activeTab === 'ideas' && (
              <textarea
                name="comment"
                className="input-field"
                placeholder={t('placeholder_comment')}
                required
              />
            )}
            <label className={`gdpr-label ${gdprError ? 'gdpr-label-error' : ''}`}>
              <input
                type="checkbox"
                checked={gdprChecked}
                onChange={(e) => {
                  setGdprChecked(e.target.checked);
                  if (e.target.checked) setGdprError(false);
                }}
              />
              <span>
                {t('gdpr_consent')}{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="privacy-link">
                  {i18n.language === 'de' ? 'Datenschutzerklärung' : 'Privacy Policy'}
                </a>
              </span>
            </label>
            {gdprError && (
              <p className="gdpr-error-msg">{t('gdpr_required')}</p>
            )}
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? "..." : t(submitLabelKey)}
            </button>
          </form>
        )}
      </div>

      <nav className="legal-footer" aria-label="Legal links">
        <Link to="/blog">{i18n.language === 'de' ? 'Blog' : 'Blog'}</Link>
        <a href="/privacy">{i18n.language === 'de' ? 'Datenschutz' : 'Privacy'}</a>
        <a href="/terms">{i18n.language === 'de' ? 'AGB' : 'Terms'}</a>
        <a href="/impressum">Impressum</a>
      </nav>
    </div>
  );
}

export default App;
