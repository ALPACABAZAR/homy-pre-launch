// [HOMY] Impressum and Terms legal pages, routed from main.jsx.

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const stripe = (
  <div className="colorful-bar privacy-bar">
    <div className="c-segment c-green"></div>
    <div className="c-segment c-yellow"></div>
    <div className="c-segment c-orange"></div>
    <div className="c-segment c-red"></div>
    <div className="c-segment c-blue"></div>
  </div>
);

const legalAddressEn =
  import.meta.env.VITE_LEGAL_SERVICE_ADDRESS ||
  'ADD LEGAL SERVICE ADDRESS BEFORE PUBLIC LAUNCH';
const legalAddressDe =
  import.meta.env.VITE_LEGAL_SERVICE_ADDRESS_DE ||
  'VOR DEM ÖFFENTLICHEN LAUNCH LADUNGSFÄHIGE ANSCHRIFT EINTRAGEN';

const termsContent = {
  en: {
    title: 'Terms of Use',
    updated: 'Last updated: May 2026',
    sections: [
      {
        heading: '1. What HOMY does',
        body: 'HOMY helps people discover rooms, homes, home swaps, and renter profiles. We provide the app experience, matching tools, chat, safety controls, and premium visibility features. HOMY does not become a party to rental, sublet, or swap agreements between users.',
      },
      {
        heading: '2. Accounts',
        body: 'You must provide accurate account information and keep your login secure. HOMY may remove accounts, posts, messages, or access when we believe the app is being misused, unsafe, fraudulent, discriminatory, or unlawful.',
      },
      {
        heading: '3. Listings and user content',
        body: 'Users are responsible for the homes, photos, descriptions, prices, availability, and messages they publish. Content must be lawful, respectful, accurate, and must not violate another person’s rights. HOMY may moderate or remove content at any time.',
      },
      {
        heading: '4. Housing fairness and safety',
        body: 'Users must follow applicable housing, tenancy, anti-discrimination, consumer protection, and platform rules. HOMY does not guarantee that a listing, user, home, rental offer, or swap is available, accurate, safe, or legally valid. Meet carefully, verify important details, and do not send money before you are confident the offer is legitimate.',
      },
      {
        heading: '5. Premium and subscriptions',
        body: 'Premium features may include unlimited likes, visibility controls, boosted posts, and access to inbound interest. Prices, trial availability, renewal terms, and cancellation options are shown by Apple before purchase. Subscriptions are managed through your Apple ID and can be cancelled in App Store subscription settings.',
      },
      {
        heading: '6. Reports, blocks, and enforcement',
        body: 'You can report suspicious listings, harmful behavior, or unsafe messages from inside the app. HOMY may restrict, hide, delete, or block content and accounts to protect users and the service.',
      },
      {
        heading: '7. Availability and changes',
        body: 'HOMY is a growing product and may change features, cities, pricing, or availability. We try to keep the service reliable, but we cannot promise uninterrupted access.',
      },
      {
        heading: '8. Contact',
        body: 'Questions about these terms can be sent to team@homyforme.com.',
      },
    ],
  },
  de: {
    title: 'AGB',
    updated: 'Zuletzt aktualisiert: Mai 2026',
    sections: [
      {
        heading: '1. Was HOMY macht',
        body: 'HOMY hilft Menschen, Zimmer, Wohnungen, Wohnungstausch-Angebote und Mieterprofile zu entdecken. Wir stellen die App, Matching-Funktionen, Chat, Sicherheitsfunktionen und Premium-Sichtbarkeit bereit. HOMY wird nicht Vertragspartei von Miet-, Untermiet- oder Tauschvereinbarungen zwischen Nutzern.',
      },
      {
        heading: '2. Konten',
        body: 'Sie müssen korrekte Kontodaten angeben und Ihren Zugang schützen. HOMY kann Konten, Beiträge, Nachrichten oder den Zugang entfernen, wenn wir Missbrauch, unsicheres Verhalten, Betrug, Diskriminierung oder Rechtsverstöße vermuten.',
      },
      {
        heading: '3. Anzeigen und Nutzerinhalte',
        body: 'Nutzer sind für Wohnungen, Fotos, Beschreibungen, Preise, Verfügbarkeit und Nachrichten verantwortlich, die sie veröffentlichen. Inhalte müssen rechtmäßig, respektvoll, korrekt und frei von Rechten Dritter sein. HOMY kann Inhalte jederzeit moderieren oder entfernen.',
      },
      {
        heading: '4. Fairness und Sicherheit beim Wohnen',
        body: 'Nutzer müssen geltende Wohnungs-, Miet-, Antidiskriminierungs-, Verbraucher- und Plattformregeln einhalten. HOMY garantiert nicht, dass eine Anzeige, ein Nutzer, eine Wohnung, ein Mietangebot oder ein Tausch verfügbar, korrekt, sicher oder rechtlich wirksam ist. Prüfen Sie wichtige Angaben sorgfältig und senden Sie kein Geld, bevor Sie sicher sind, dass das Angebot seriös ist.',
      },
      {
        heading: '5. Premium und Abonnements',
        body: 'Premium-Funktionen können unbegrenzte Likes, Sichtbarkeitskontrollen, hervorgehobene Beiträge und Zugriff auf eingehendes Interesse enthalten. Preise, Testphasen, Verlängerungen und Kündigungsmöglichkeiten werden von Apple vor dem Kauf angezeigt. Abonnements werden über Ihre Apple-ID verwaltet und können in den App Store Abonnement-Einstellungen gekündigt werden.',
      },
      {
        heading: '6. Melden, Blockieren und Durchsetzung',
        body: 'Verdächtige Anzeigen, schädliches Verhalten oder unsichere Nachrichten können in der App gemeldet werden. HOMY kann Inhalte und Konten einschränken, ausblenden, löschen oder blockieren, um Nutzer und den Dienst zu schützen.',
      },
      {
        heading: '7. Verfügbarkeit und Änderungen',
        body: 'HOMY ist ein wachsendes Produkt. Funktionen, Städte, Preise und Verfügbarkeit können sich ändern. Wir bemühen uns um einen zuverlässigen Dienst, können aber keinen unterbrechungsfreien Zugang garantieren.',
      },
      {
        heading: '8. Kontakt',
        body: 'Fragen zu diesen Bedingungen können an team@homyforme.com gesendet werden.',
      },
    ],
  },
};

const impressumContent = {
  en: {
    title: 'Impressum',
    updated: 'Legal notice under German law',
    sections: [
      {
        heading: 'Provider',
        body: `Juan Pablo Cirett Jimenez\nHOMY\nFreiburg im Breisgau, Germany\nPostal address: ${legalAddressEn}`,
      },
      {
        heading: 'Contact',
        body: 'Email: team@homyforme.com\nWebsite: https://homyforme.com',
      },
      {
        heading: 'Responsible for content',
        body: `Juan Pablo Cirett Jimenez\nPostal address: ${legalAddressEn}`,
      },
      {
        heading: 'Dispute resolution',
        body: 'The European Commission provides an online dispute resolution platform at https://ec.europa.eu/consumers/odr/. HOMY is not obliged or willing to participate in dispute resolution proceedings before a consumer arbitration board unless legally required.',
      },
      {
        heading: 'Important launch note',
        body: 'This legal notice must include a complete serviceable postal address before HOMY is publicly launched in Germany.',
      },
    ],
  },
  de: {
    title: 'Impressum',
    updated: 'Anbieterkennzeichnung nach deutschem Recht',
    sections: [
      {
        heading: 'Anbieter',
        body: `Juan Pablo Cirett Jimenez\nHOMY\nFreiburg im Breisgau, Deutschland\nPostanschrift: ${legalAddressDe}`,
      },
      {
        heading: 'Kontakt',
        body: 'E-Mail: team@homyforme.com\nWebseite: https://homyforme.com',
      },
      {
        heading: 'Verantwortlich für Inhalte',
        body: `Juan Pablo Cirett Jimenez\nPostanschrift: ${legalAddressDe}`,
      },
      {
        heading: 'Streitbeilegung',
        body: 'Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit: https://ec.europa.eu/consumers/odr/. HOMY ist nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen, soweit keine gesetzliche Pflicht besteht.',
      },
      {
        heading: 'Wichtiger Launch-Hinweis',
        body: 'Dieses Impressum muss vor dem öffentlichen Launch in Deutschland eine vollständige ladungsfähige Postanschrift enthalten.',
      },
    ],
  },
};

function LegalDocument({ type }) {
  const { i18n } = useTranslation();
  const isGermanPath =
    typeof window !== 'undefined' &&
    /^\/(de\/)?(agb|impressum)(\/|$)/.test(window.location.pathname);
  const lang = isGermanPath || i18n.language === 'de' ? 'de' : 'en';
  const c = (type === 'impressum' ? impressumContent : termsContent)[lang];

  useEffect(() => {
    document.title = `${c.title} | HOMY`;
  }, [c.title]);

  return (
    <div className="privacy-wrapper">
      <div className="privacy-container">
        <a href="/" className="privacy-back">
          {lang === 'de' ? '← Zurück' : '← Back'}
        </a>
        {stripe}
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
          {lang === 'de' ? 'Kontakt: ' : 'Contact: '}
          <a href="mailto:team@homyforme.com">team@homyforme.com</a>
        </p>
      </div>
    </div>
  );
}

export function Terms() {
  return <LegalDocument type="terms" />;
}

export function Impressum() {
  return <LegalDocument type="impressum" />;
}
