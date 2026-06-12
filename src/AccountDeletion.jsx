// [HOMY] Account-deletion instructions page (required by Google Play Data
// safety / Apple account-deletion guidelines), routed from main.jsx.

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const content = {
  en: {
    title: 'Delete your HOMY account',
    updated: 'Last updated: June 2026',
    sections: [
      {
        heading: 'Delete directly in the app (fastest)',
        body: 'Open HOMY and go to:\n\nProfile → Account access → Delete account\n\nConfirm the deletion. Your account, profile, listings, matches and messages are permanently removed from our production systems within 30 days.',
      },
      {
        heading: 'Or request deletion by email',
        body: 'Send an email from your registered email address to team@homyforme.com with the subject "Delete my account". We will delete your account within 30 days and confirm by reply.',
      },
      {
        heading: 'What gets deleted',
        body: 'Deletion covers your account data (name, email, sign-in identity), profile (photo, bio, verification photo), your listings and seeker posts including photos, your matching activity, your conversations and messages, and your push-notification token.\n\nPayment records are held by Apple App Store or Google Play under their own policies — HOMY never stores payment details. Limited records may be retained where the law requires it (e.g. abuse-report logs).',
      },
    ],
    back: '← Back',
    contact: 'Questions? Reach us at: ',
  },
  de: {
    title: 'HOMY-Konto löschen',
    updated: 'Zuletzt aktualisiert: Juni 2026',
    sections: [
      {
        heading: 'Direkt in der App löschen (am schnellsten)',
        body: 'Öffnen Sie HOMY und gehen Sie zu:\n\nProfil → Kontozugang → Konto löschen\n\nBestätigen Sie die Löschung. Ihr Konto, Profil, Ihre Anzeigen, Matches und Nachrichten werden innerhalb von 30 Tagen dauerhaft aus unseren Produktivsystemen entfernt.',
      },
      {
        heading: 'Oder Löschung per E-Mail beantragen',
        body: 'Senden Sie eine E-Mail von Ihrer registrierten E-Mail-Adresse an team@homyforme.com mit dem Betreff „Konto löschen". Wir löschen Ihr Konto innerhalb von 30 Tagen und bestätigen per Antwort.',
      },
      {
        heading: 'Was gelöscht wird',
        body: 'Die Löschung umfasst Ihre Kontodaten (Name, E-Mail, Anmelde-Identität), Ihr Profil (Foto, Bio, Verifizierungsfoto), Ihre Anzeigen und Suchprofile einschließlich Fotos, Ihre Matching-Aktivität, Ihre Unterhaltungen und Nachrichten sowie Ihr Push-Benachrichtigungs-Token.\n\nZahlungsdaten verbleiben beim Apple App Store bzw. Google Play gemäß deren Richtlinien — HOMY speichert keine Zahlungsdaten. Einzelne Daten können aufbewahrt werden, soweit gesetzlich erforderlich (z. B. Protokolle zu Missbrauchsmeldungen).',
      },
    ],
    back: '← Zurück',
    contact: 'Fragen? Schreib uns: ',
  },
};

export default function AccountDeletion() {
  const { i18n } = useTranslation();
  const isGermanPath =
    typeof window !== 'undefined' &&
    /^\/(de\/)?konto-loeschen(\/|$)/.test(window.location.pathname);
  const lang = isGermanPath || i18n.language === 'de' ? 'de' : 'en';
  const c = content[lang];

  useEffect(() => {
    document.title = `${c.title} | HOMY`;
  }, [c.title]);

  return (
    <div className="privacy-wrapper">
      <div className="privacy-container">
        <a href="/" className="privacy-back">{c.back}</a>

        <div className="colorful-bar privacy-bar">
          <div className="c-segment c-green"></div>
          <div className="c-segment c-yellow"></div>
          <div className="c-segment c-orange"></div>
          <div className="c-segment c-red"></div>
          <div className="c-segment c-blue"></div>
        </div>

        <h1 className="privacy-title">{c.title}</h1>
        <p className="privacy-updated">{c.updated}</p>

        {c.sections.map((s) => (
          <section key={s.heading} className="privacy-section">
            <h2>{s.heading}</h2>
            {s.body.split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </section>
        ))}

        <p className="privacy-contact">
          {c.contact}
          <a href="mailto:team@homyforme.com">team@homyforme.com</a>
        </p>
      </div>
    </div>
  );
}
