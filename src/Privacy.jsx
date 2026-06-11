// [HOMY] Privacy policy page, routed from main.jsx.

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const legalAddressEn =
  import.meta.env.VITE_LEGAL_SERVICE_ADDRESS ||
  'ADD LEGAL SERVICE ADDRESS BEFORE PUBLIC LAUNCH';
const legalAddressDe =
  import.meta.env.VITE_LEGAL_SERVICE_ADDRESS_DE ||
  'VOR DEM ÖFFENTLICHEN LAUNCH LADUNGSFÄHIGE ANSCHRIFT EINTRAGEN';

const content = {
  en: {
    title: 'Privacy Policy',
    updated: 'Last updated: March 2026',
    sections: [
      {
        heading: '1. Controller',
        body: `The controller responsible for data processing on this website is:\n\nHOMY\nJuan Pablo Cirett Jimenez\nFreiburg im Breisgau, Germany\nPostal address: ${legalAddressEn}\nEmail: team@homyforme.com\n\nIf you have any questions about this privacy policy or how we handle your data, please contact us at the email above.`,
      },
      {
        heading: '2. What data we collect',
        body: 'When you submit the updates, waiting list, or share an idea form, we collect:\n\n• Your name\n• Your email address\n• Your idea or comment (Ideas tab only)\n\nWe do not collect any other personal data. We do not use cookies or tracking technologies on this website.',
      },
      {
        heading: '3. Why we collect it',
        body: 'We collect your name and email address solely to send you product updates you have consented to receive, including availability notifications if you join the waiting list.\n\nWe collect your idea or comment (if submitted) to improve the HOMY product. We will never use it for any other purpose.',
      },
      {
        heading: '4. Legal basis',
        body: 'Processing is based on your freely given, specific, and informed consent pursuant to Art. 6(1)(a) GDPR. You may withdraw your consent at any time by emailing team@homyforme.com with the subject "Unsubscribe". Withdrawal does not affect the lawfulness of processing prior to withdrawal.',
      },
      {
        heading: '5. Storage and recipients',
        body: 'Your data is stored in a private Google Sheets spreadsheet accessible only to the HOMY team, via the Google Sheets API. Google LLC (USA) acts as a data processor under our instructions and under a Data Processing Agreement consistent with the EU Standard Contractual Clauses.\n\nWe do not sell, share, or disclose your data to any third party.',
      },
      {
        heading: '6. Location detection',
        body: 'When you first open this website, a request is made to ipapi.co to detect your country based on your IP address. This is used only to display the page in your preferred language (German or English). We do not store your IP address or any geolocation data.',
      },
      {
        heading: '7. Retention',
        body: 'We retain your data until you request deletion or withdraw consent. You may request deletion at any time (see Your Rights below).',
      },
      {
        heading: '8. Your rights',
        body: 'Under the GDPR you have the right to:\n\n• Access the personal data we hold about you\n• Correct inaccurate data\n• Request deletion of your data ("right to be forgotten")\n• Request restriction of processing\n• Data portability\n• Object to processing\n• Withdraw consent at any time\n\nTo exercise any of these rights, email team@homyforme.com. We will respond within 30 days.',
      },
      {
        heading: '9. Supervisory authority',
        body: 'You have the right to lodge a complaint with a data protection supervisory authority. The authority responsible for HOMY is:\n\nLandesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg\nwww.baden-wuerttemberg.datenschutz.de',
      },
      {
        heading: '10. Changes to this policy',
        body: 'We may update this privacy policy as the product evolves. The "last updated" date at the top will always reflect the most recent version. Continued use of the website after changes constitutes acceptance.',
      },
    ],
  },
  de: {
    title: 'Datenschutzerklärung',
    updated: 'Zuletzt aktualisiert: März 2026',
    sections: [
      {
        heading: '1. Verantwortlicher',
        body: `Verantwortlicher für die Datenverarbeitung auf dieser Website ist:\n\nHOMY\nJuan Pablo Cirett Jimenez\nFreiburg im Breisgau, Deutschland\nPostanschrift: ${legalAddressDe}\nE-Mail: team@homyforme.com\n\nBei Fragen zu dieser Datenschutzerklärung oder zur Verarbeitung Ihrer Daten wenden Sie sich bitte an die oben genannte E-Mail-Adresse.`,
      },
      {
        heading: '2. Welche Daten wir erheben',
        body: 'Wenn Sie das Update-, Wartelisten- oder Ideen-Formular ausfüllen, erheben wir:\n\n• Ihren Namen\n• Ihre E-Mail-Adresse\n• Ihre Idee oder Ihren Kommentar (nur im Tab „Idee teilen")\n\nWir erheben keine weiteren personenbezogenen Daten. Wir verwenden keine Cookies oder Tracking-Technologien auf dieser Website.',
      },
      {
        heading: '3. Zweck der Erhebung',
        body: 'Wir erheben Ihren Namen und Ihre E-Mail-Adresse ausschließlich, um Ihnen Produkt-Updates zuzusenden, denen Sie zugestimmt haben, einschließlich Verfügbarkeitsbenachrichtigungen, wenn Sie sich in die Warteliste eintragen.\n\nIhre Idee oder Ihr Kommentar (sofern eingereicht) wird ausschließlich zur Verbesserung des HOMY-Produkts verwendet. Eine anderweitige Nutzung findet nicht statt.',
      },
      {
        heading: '4. Rechtsgrundlage',
        body: 'Die Verarbeitung erfolgt auf Grundlage Ihrer freiwilligen, spezifischen und informierten Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO. Sie können Ihre Einwilligung jederzeit widerrufen, indem Sie eine E-Mail mit dem Betreff „Abmelden" an team@homyforme.com senden. Der Widerruf berührt nicht die Rechtmäßigkeit der bis dahin erfolgten Verarbeitung.',
      },
      {
        heading: '5. Speicherung und Empfänger',
        body: 'Ihre Daten werden in einer privaten Google-Tabelle gespeichert, auf die ausschließlich das HOMY-Team Zugriff hat. Dies erfolgt über die Google Sheets API. Google LLC (USA) ist als Auftragsverarbeiter tätig, auf Grundlage eines Auftragsverarbeitungsvertrags gemäß den EU-Standardvertragsklauseln.\n\nWir verkaufen, teilen oder geben Ihre Daten in keiner Form an Dritte weiter.',
      },
      {
        heading: '6. Standorterkennung',
        body: 'Beim ersten Aufruf dieser Website wird eine Anfrage an ipapi.co gestellt, um Ihr Land anhand Ihrer IP-Adresse zu ermitteln. Dies dient ausschließlich dazu, die Seite in Ihrer bevorzugten Sprache (Deutsch oder Englisch) anzuzeigen. Wir speichern Ihre IP-Adresse oder Geolokalisierungsdaten nicht.',
      },
      {
        heading: '7. Speicherdauer',
        body: 'Wir speichern Ihre Daten, bis Sie eine Löschung beantragen oder Ihre Einwilligung widerrufen. Sie können die Löschung jederzeit beantragen (siehe Ihre Rechte).',
      },
      {
        heading: '8. Ihre Rechte',
        body: 'Gemäß DSGVO haben Sie das Recht auf:\n\n• Auskunft über die von uns gespeicherten Daten\n• Berichtigung unrichtiger Daten\n• Löschung Ihrer Daten („Recht auf Vergessenwerden")\n• Einschränkung der Verarbeitung\n• Datenübertragbarkeit\n• Widerspruch gegen die Verarbeitung\n• Widerruf Ihrer Einwilligung jederzeit\n\nZur Ausübung dieser Rechte senden Sie bitte eine E-Mail an team@homyforme.com. Wir antworten innerhalb von 30 Tagen.',
      },
      {
        heading: '9. Aufsichtsbehörde',
        body: 'Sie haben das Recht, eine Beschwerde bei einer Datenschutz-Aufsichtsbehörde einzureichen. Die für HOMY zuständige Behörde ist:\n\nLandesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg\nwww.baden-wuerttemberg.datenschutz.de',
      },
      {
        heading: '10. Änderungen dieser Erklärung',
        body: 'Wir können diese Datenschutzerklärung im Zuge der Produktentwicklung aktualisieren. Das Datum „Zuletzt aktualisiert" am Anfang zeigt stets die aktuelle Version. Die weitere Nutzung der Website nach Änderungen gilt als Zustimmung.',
      },
    ],
  },
};

export default function Privacy() {
  const { i18n } = useTranslation();
  const isGermanPath =
    typeof window !== 'undefined' &&
    /^\/(de\/)?datenschutz(\/|$)/.test(window.location.pathname);
  const lang = isGermanPath || i18n.language === 'de' ? 'de' : 'en';
  const c = content[lang];

  useEffect(() => {
    document.title = `${c.title} | HOMY`;
  }, [c.title]);

  return (
    <div className="privacy-wrapper">
      <div className="privacy-container">
        <a href="/" className="privacy-back">
          {lang === 'de' ? '← Zurück' : '← Back'}
        </a>

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
          {lang === 'de'
            ? 'Fragen? Schreib uns: '
            : 'Questions? Reach us at: '}
          <a href="mailto:team@homyforme.com">team@homyforme.com</a>
        </p>
      </div>
    </div>
  );
}
