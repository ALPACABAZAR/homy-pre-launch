import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation dictionaries
const resources = {
    en: {
        translation: {
            "title": "Find a place<br/>you want to<br/>live in.",
            "comments_tab": "Comments",
            "waitlist_tab": "Waitlist",
            "placeholder_name": "Your Name",
            "placeholder_email": "Your Email",
            "placeholder_comment": "What features would you love to see in the app?",
            "btn_waitlist": "Join Waitlist",
            "btn_comment": "Send Comment",
            "success_waitlist": "Thanks! We've received your email.",
            "success_comment": "Thanks! We've received your comment."
        }
    },
    de: {
        translation: {
            "title": "Finde den Ort,<br/>wo du leben<br/>willst.",
            "comments_tab": "Kommentare",
            "waitlist_tab": "Warteliste",
            "placeholder_name": "Dein Name",
            "placeholder_email": "Deine E-Mail",
            "placeholder_comment": "Welche Funktionen würdest du gerne in der App sehen?",
            "btn_waitlist": "Auf die Warteliste",
            "btn_comment": "Kommentar Senden",
            "success_waitlist": "Danke! Wir haben deine E-Mail erhalten.",
            "success_comment": "Danke! Wir haben deinen Kommentar erhalten."
        }
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false // not needed for react as it escapes by default
        }
    });

export default i18n;
