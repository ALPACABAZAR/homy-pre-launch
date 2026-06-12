// [HOMY] Privacy policy page (app + website), routed from main.jsx.

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
    updated: 'Last updated: June 2026',
    sections: [
      {
        heading: '1. Controller',
        body: `The controller responsible for data processing in the HOMY app and on this website is:\n\nHOMY\nJuan Pablo Cirett Jimenez\nFreiburg im Breisgau, Germany\nPostal address: ${legalAddressEn}\nEmail: team@homyforme.com\n\nIf you have any questions about this privacy policy or how we handle your data, please contact us at the email above.`,
      },
      {
        heading: '2. The HOMY app: what we process',
        body: 'When you use the HOMY app (iOS or Android), we process the following data:\n\n• Account data: your first name, email address, and sign-in provider (Google, Apple, or email/password). Passwords are stored only as cryptographic hashes.\n• Profile data you choose to add: profile photo, bio, city, language preference, and optional identity-verification photo.\n• Content you post: home listings and seeker posts, including photos, descriptions, price and an approximate location/neighbourhood you select. Listings are visible to other HOMY users; exact addresses are never shown publicly.\n• Matching activity: your likes, passes and matches, used to run the matching system.\n• Messages: chat messages you exchange with your matches, including photos and voice notes you send.\n• Device data: a push-notification token (Firebase Cloud Messaging) so we can notify you about matches and messages, and basic app diagnostics.\n• Subscription status: whether you have HOMY Premium. Payment is handled entirely by Apple App Store or Google Play — we never receive or store your payment details.\n\nThe app only accesses your device location, camera, microphone or photos after you grant the corresponding system permission, and only for the feature that needs it (maps, listing photos, voice messages).',
      },
      {
        heading: '3. The HOMY app: storage, processors and recipients',
        body: 'App data is stored in Google Firebase (Firestore database, Firebase Authentication, Firebase Storage, Firebase Cloud Messaging), operated by Google LLC (USA) as our data processor under a Data Processing Agreement consistent with the EU Standard Contractual Clauses.\n\nOur authentication service runs on Railway (Railway Corp., USA) under equivalent safeguards.\n\nContent you publish (listings, seeker posts, your first name and profile photo) is visible to other users of the app. Your messages are visible only to you and the person you matched with.\n\nWe do not sell your data, and we do not share it with third parties for advertising.',
      },
      {
        heading: '4. The HOMY app: retention and account deletion',
        body: 'We keep your app data for as long as your account exists.\n\nYou can delete your account at any time directly in the app: Profile → Account access → Delete account. This permanently removes your account, profile, listings, matches and messages from our production systems within 30 days.\n\nAlternatively, email team@homyforme.com from your registered email address with the subject "Delete my account" and we will delete it within 30 days. See also homyforme.com/account-deletion.',
      },
      {
        heading: '5. This website: what we collect',
        body: 'When you submit the updates, waiting list, or share-an-idea form on this website, we collect:\n\n• Your name\n• Your email address\n• Your idea or comment (Ideas tab only)\n\nWe do not collect any other personal data through the website. We do not use cookies or tracking technologies on this website.',
      },
      {
        heading: '6. This website: why we collect it',
        body: 'We collect your name and email address solely to send you product updates you have consented to receive, including availability notifications if you join the waiting list.\n\nWe collect your idea or comment (if submitted) to improve the HOMY product. We will never use it for any other purpose.',
      },
      {
        heading: '7. Legal basis',
        body: 'For the HOMY app, processing is necessary for the performance of our contract with you (Art. 6(1)(b) GDPR) — creating an account, publishing listings, matching and messaging are the service itself. Optional features that require system permissions (location, camera, microphone, photos, notifications) are based on your consent (Art. 6(1)(a) GDPR), which you can withdraw at any time in your device settings.\n\nFor the website forms, processing is based on your freely given, specific and informed consent pursuant to Art. 6(1)(a) GDPR. You may withdraw it at any time by emailing team@homyforme.com with the subject "Unsubscribe". Withdrawal does not affect the lawfulness of processing prior to withdrawal.',
      },
      {
        heading: '8. This website: storage and recipients',
        body: 'Website form data is stored in a private Google Sheets spreadsheet accessible only to the HOMY team, via the Google Sheets API. Google LLC (USA) acts as a data processor under our instructions and under a Data Processing Agreement consistent with the EU Standard Contractual Clauses.\n\nWe do not sell, share, or disclose your data to any third party.',
      },
      {
        heading: '9. Website language detection',
        body: 'When you first open this website, a request is made to ipapi.co to detect your country based on your IP address. This is used only to display the page in your preferred language (German or English). We do not store your IP address or any geolocation data.',
      },
      {
        heading: '10. Your rights',
        body: 'Under the GDPR you have the right to:\n\n• Access the personal data we hold about you\n• Correct inaccurate data\n• Request deletion of your data ("right to be forgotten")\n• Request restriction of processing\n• Data portability\n• Object to processing\n• Withdraw consent at any time\n\nTo exercise any of these rights, email team@homyforme.com. We will respond within 30 days.',
      },
      {
        heading: '11. Supervisory authority',
        body: 'You have the right to lodge a complaint with a data protection supervisory authority. The authority responsible for HOMY is:\n\nLandesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg\nwww.baden-wuerttemberg.datenschutz.de',
      },
      {
        heading: '12. Changes to this policy',
        body: 'We may update this privacy policy as the product evolves. The "last updated" date at the top will always reflect the most recent version. Continued use of the app or website after changes constitutes acceptance.',
      },
    ],
  },
  de: {
    title: 'Datenschutzerklärung',
    updated: 'Zuletzt aktualisiert: Juni 2026',
    sections: [
      {
        heading: '1. Verantwortlicher',
        body: `Verantwortlicher für die Datenverarbeitung in der HOMY-App und auf dieser Website ist:\n\nHOMY\nJuan Pablo Cirett Jimenez\nFreiburg im Breisgau, Deutschland\nPostanschrift: ${legalAddressDe}\nE-Mail: team@homyforme.com\n\nBei Fragen zu dieser Datenschutzerklärung oder zur Verarbeitung Ihrer Daten wenden Sie sich bitte an die oben genannte E-Mail-Adresse.`,
      },
      {
        heading: '2. Die HOMY-App: welche Daten wir verarbeiten',
        body: 'Wenn Sie die HOMY-App (iOS oder Android) nutzen, verarbeiten wir folgende Daten:\n\n• Kontodaten: Vorname, E-Mail-Adresse und Anmeldemethode (Google, Apple oder E-Mail/Passwort). Passwörter werden ausschließlich als kryptografische Hashes gespeichert.\n• Profildaten, die Sie freiwillig angeben: Profilfoto, Bio, Stadt, Spracheinstellung und optional ein Foto zur Identitätsverifizierung.\n• Von Ihnen veröffentlichte Inhalte: Wohnungsanzeigen und Suchprofile, einschließlich Fotos, Beschreibungen, Preis und einer ungefähren Lage/Stadtteil Ihrer Wahl. Anzeigen sind für andere HOMY-Nutzer sichtbar; genaue Adressen werden niemals öffentlich angezeigt.\n• Matching-Aktivität: Ihre Likes, Passes und Matches, zur Durchführung des Matching-Systems.\n• Nachrichten: Chat-Nachrichten mit Ihren Matches, einschließlich gesendeter Fotos und Sprachnachrichten.\n• Gerätedaten: ein Push-Benachrichtigungs-Token (Firebase Cloud Messaging) für Benachrichtigungen über Matches und Nachrichten sowie grundlegende App-Diagnosedaten.\n• Abo-Status: ob Sie HOMY Premium haben. Die Zahlung wird vollständig über den Apple App Store bzw. Google Play abgewickelt — wir erhalten und speichern keine Zahlungsdaten.\n\nDie App greift auf Standort, Kamera, Mikrofon oder Fotos nur zu, nachdem Sie die entsprechende Systemberechtigung erteilt haben, und nur für die jeweilige Funktion (Karte, Anzeigenfotos, Sprachnachrichten).',
      },
      {
        heading: '3. Die HOMY-App: Speicherung, Auftragsverarbeiter und Empfänger',
        body: 'App-Daten werden in Google Firebase gespeichert (Firestore-Datenbank, Firebase Authentication, Firebase Storage, Firebase Cloud Messaging), betrieben von Google LLC (USA) als Auftragsverarbeiter auf Grundlage eines Auftragsverarbeitungsvertrags gemäß den EU-Standardvertragsklauseln.\n\nUnser Authentifizierungsdienst läuft auf Railway (Railway Corp., USA) unter gleichwertigen Garantien.\n\nVon Ihnen veröffentlichte Inhalte (Anzeigen, Suchprofile, Vorname und Profilfoto) sind für andere Nutzer der App sichtbar. Ihre Nachrichten sehen nur Sie und die Person, mit der Sie gematcht haben.\n\nWir verkaufen Ihre Daten nicht und geben sie nicht zu Werbezwecken an Dritte weiter.',
      },
      {
        heading: '4. Die HOMY-App: Speicherdauer und Kontolöschung',
        body: 'Wir speichern Ihre App-Daten, solange Ihr Konto besteht.\n\nSie können Ihr Konto jederzeit direkt in der App löschen: Profil → Kontozugang → Konto löschen. Dadurch werden Ihr Konto, Profil, Anzeigen, Matches und Nachrichten innerhalb von 30 Tagen dauerhaft aus unseren Produktivsystemen entfernt.\n\nAlternativ senden Sie eine E-Mail von Ihrer registrierten E-Mail-Adresse mit dem Betreff „Konto löschen" an team@homyforme.com — wir löschen Ihr Konto innerhalb von 30 Tagen. Siehe auch homyforme.com/account-deletion.',
      },
      {
        heading: '5. Diese Website: welche Daten wir erheben',
        body: 'Wenn Sie das Update-, Wartelisten- oder Ideen-Formular auf dieser Website ausfüllen, erheben wir:\n\n• Ihren Namen\n• Ihre E-Mail-Adresse\n• Ihre Idee oder Ihren Kommentar (nur im Tab „Idee teilen")\n\nÜber die Website erheben wir keine weiteren personenbezogenen Daten. Wir verwenden keine Cookies oder Tracking-Technologien auf dieser Website.',
      },
      {
        heading: '6. Diese Website: Zweck der Erhebung',
        body: 'Wir erheben Ihren Namen und Ihre E-Mail-Adresse ausschließlich, um Ihnen Produkt-Updates zuzusenden, denen Sie zugestimmt haben, einschließlich Verfügbarkeitsbenachrichtigungen, wenn Sie sich in die Warteliste eintragen.\n\nIhre Idee oder Ihr Kommentar (sofern eingereicht) wird ausschließlich zur Verbesserung des HOMY-Produkts verwendet. Eine anderweitige Nutzung findet nicht statt.',
      },
      {
        heading: '7. Rechtsgrundlage',
        body: 'Für die HOMY-App ist die Verarbeitung zur Erfüllung unseres Vertrags mit Ihnen erforderlich (Art. 6 Abs. 1 lit. b DSGVO) — Kontoerstellung, Veröffentlichung von Anzeigen, Matching und Nachrichten sind der Dienst selbst. Optionale Funktionen mit Systemberechtigungen (Standort, Kamera, Mikrofon, Fotos, Benachrichtigungen) beruhen auf Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), die Sie jederzeit in den Geräteeinstellungen widerrufen können.\n\nFür die Website-Formulare erfolgt die Verarbeitung auf Grundlage Ihrer freiwilligen, spezifischen und informierten Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO. Sie können diese jederzeit per E-Mail mit dem Betreff „Abmelden" an team@homyforme.com widerrufen. Der Widerruf berührt nicht die Rechtmäßigkeit der bis dahin erfolgten Verarbeitung.',
      },
      {
        heading: '8. Diese Website: Speicherung und Empfänger',
        body: 'Website-Formulardaten werden in einer privaten Google-Tabelle gespeichert, auf die ausschließlich das HOMY-Team Zugriff hat. Dies erfolgt über die Google Sheets API. Google LLC (USA) ist als Auftragsverarbeiter tätig, auf Grundlage eines Auftragsverarbeitungsvertrags gemäß den EU-Standardvertragsklauseln.\n\nWir verkaufen, teilen oder geben Ihre Daten in keiner Form an Dritte weiter.',
      },
      {
        heading: '9. Spracherkennung der Website',
        body: 'Beim ersten Aufruf dieser Website wird eine Anfrage an ipapi.co gestellt, um Ihr Land anhand Ihrer IP-Adresse zu ermitteln. Dies dient ausschließlich dazu, die Seite in Ihrer bevorzugten Sprache (Deutsch oder Englisch) anzuzeigen. Wir speichern Ihre IP-Adresse oder Geolokalisierungsdaten nicht.',
      },
      {
        heading: '10. Ihre Rechte',
        body: 'Gemäß DSGVO haben Sie das Recht auf:\n\n• Auskunft über die von uns gespeicherten Daten\n• Berichtigung unrichtiger Daten\n• Löschung Ihrer Daten („Recht auf Vergessenwerden")\n• Einschränkung der Verarbeitung\n• Datenübertragbarkeit\n• Widerspruch gegen die Verarbeitung\n• Widerruf Ihrer Einwilligung jederzeit\n\nZur Ausübung dieser Rechte senden Sie bitte eine E-Mail an team@homyforme.com. Wir antworten innerhalb von 30 Tagen.',
      },
      {
        heading: '11. Aufsichtsbehörde',
        body: 'Sie haben das Recht, eine Beschwerde bei einer Datenschutz-Aufsichtsbehörde einzureichen. Die für HOMY zuständige Behörde ist:\n\nLandesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg\nwww.baden-wuerttemberg.datenschutz.de',
      },
      {
        heading: '12. Änderungen dieser Erklärung',
        body: 'Wir können diese Datenschutzerklärung im Zuge der Produktentwicklung aktualisieren. Das Datum „Zuletzt aktualisiert" am Anfang zeigt stets die aktuelle Version. Die weitere Nutzung der App oder Website nach Änderungen gilt als Zustimmung.',
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
