// [HOMY] i18next configuration with EN/DE resources; auto-detects the visitor's country via ipapi.co
// (3s timeout) to default German for DE visitors.

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const CITY = import.meta.env.VITE_LAUNCH_CITY || 'Freiburg';

// Translation dictionaries
const resources = {
    en: {
        translation: {
            "availability_pill": "Now available on iPhone",
            "title": `Find a place<br/>you want to live<br/>in ${CITY}.`,
            "subtitle": `Download HOMY to find rooms, apartments & roommates — swipe until you find your perfect room in ${CITY}.`,
            "app_store_sub": "Download on the",
            "google_play_sub": "Coming soon on",
            "google_play_name": "Google Play",
            "ideas_tab": "Share an Idea",
            "updates_tab": "Waiting List",
            "android_tab": "Android",
            "form_intro_updates": "Get HOMY updates and launch news by email.",
            "form_intro_ideas": `Tell us what would make finding a place in ${CITY} easier.`,
            "form_intro_android": "No iPhone? Join the waiting list and we’ll message you when it’s ready.",
            "placeholder_name": "Your Name",
            "placeholder_email": "Your Email",
            "placeholder_comment": `What would make finding a WG in ${CITY} easier for you?`,
            "btn_updates": "Get Updates",
            "btn_comment": "Send Idea",
            "btn_android": "Join Waiting List",
            "gdpr_consent": "I agree to receive updates about HOMY by email. You can unsubscribe at any time.",
            "gdpr_required": "Please accept to continue.",
            "success_updates": "You're on the list! We'll email you product updates.",
            "success_android": "You’re on the waiting list! We’ll message you when it’s ready.",
            "success_comment": "Thanks! Your idea helps us build a better app."
        }
    },
    de: {
        translation: {
            "availability_pill": "Jetzt fürs iPhone verfügbar",
            "title": `Finde dein<br/>neues Zuhause<br/>in ${CITY}.`,
            "subtitle": `Lade HOMY herunter und finde Zimmer, Wohnungen & Mitbewohner — swipe dich zu deinem perfekten Zimmer in ${CITY}.`,
            "app_store_sub": "Laden im",
            "google_play_sub": "Bald bei",
            "google_play_name": "Google Play",
            "ideas_tab": "Idee teilen",
            "updates_tab": "Warteliste",
            "android_tab": "Android",
            "form_intro_updates": "Erhalte HOMY Updates und Launch-News per E-Mail.",
            "form_intro_ideas": `Sag uns, was die Wohnungssuche in ${CITY} einfacher machen würde.`,
            "form_intro_android": "Kein iPhone? Trag dich in die Warteliste ein. Wir melden uns, sobald es bereit ist.",
            "placeholder_name": "Dein Name",
            "placeholder_email": "Deine E-Mail",
            "placeholder_comment": `Was würde die Wohnungssuche in ${CITY} für dich einfacher machen?`,
            "btn_updates": "Updates erhalten",
            "btn_comment": "Idee senden",
            "btn_android": "Warteliste beitreten",
            "gdpr_consent": "Ich stimme zu, Updates über HOMY per E-Mail zu erhalten. Abmeldung jederzeit möglich.",
            "gdpr_required": "Bitte zustimmen, um fortzufahren.",
            "success_updates": "Du bist auf der Liste! Wir melden uns mit Produkt-Updates.",
            "success_android": "Du bist auf der Warteliste! Wir melden uns, sobald es bereit ist.",
            "success_comment": "Danke! Deine Idee hilft uns, eine bessere App zu bauen."
        }
    }
};

// If the user landed on /de explicitly, force German at init time so there's no flash
// of English and no localStorage/navigator override.
const pathLng =
    typeof window !== 'undefined' && /^\/de(\/|$)/.test(window.location.pathname)
        ? 'de'
        : null;

const i18nInit = i18n.use(initReactI18next);
if (!pathLng) {
    i18nInit.use(LanguageDetector);
}

i18nInit.init({
    resources,
    fallbackLng: 'en',
    ...(pathLng ? { lng: pathLng } : {}),
    interpolation: {
        escapeValue: false
    }
});

if (pathLng && typeof window !== 'undefined') {
    try { window.localStorage.setItem('i18nextLng', pathLng); } catch { /* ignore */ }
}

export default i18n;
