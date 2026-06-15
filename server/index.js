// [HOMY] Express backend with two roles: (1) serves the homyforme.com pre-launch site (built dist/,
// waitlist/updates/comment signup, unsubscribe flows); (2) the HOMY auth API consumed by the iOS
// and Android apps (/api/auth/*: Apple, Google, email create-account/sign-in, email
// verification, password reset/change, security status, unlink-provider). Auth endpoints use
// server/firebase-admin.js to mint Firebase sessions. Mobile clients reach it via the URLs baked
// into iOS Info.plist (project.yml) and Android HomyApi.kt. Deployed on Railway (npm run build +
// npm start).

import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { blogPosts } from '../src/blogData.js';
import axios from 'axios';
import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import rateLimit from 'express-rate-limit';
import {
    isAdminReady as isFirebaseAdminReady,
    getAdminMessaging,
    getAdminFirestore,
} from './firebase-admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.join(__dirname, '..');
const authStorePath = resolveAuthStorePath();
const unsubscribeStorePath = resolveDataStorePath('UNSUBSCRIBE_STORE_PATH', 'server/data/unsubscribed.json');
const googleAuthClient = new OAuth2Client();
const phoneChallenges = new Map();
let authStoreMutationQueue = Promise.resolve();
const appleSigningKeysCache = {
    keys: null,
    expiresAt: 0
};
let emailTransporter = null;

const app = express();
const APP_STORE_REDIRECT_URL = (
    process.env.APP_STORE_URL ||
    process.env.VITE_APP_STORE_URL ||
    'https://apps.apple.com/de/app/homy-rent-and-swap/id6766799894?l=en-GB'
).trim();

// Trust proxy — required behind Railway/Nginx for rate limiter to see real client IP
app.set('trust proxy', 1);

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});

app.use(cors({
    origin(origin, callback) {
        if (!origin || isAllowedCORSOrigin(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error("CORS origin is not allowed by HOMY."));
    }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Keep marketing forms conservative, but allow auth retries without locking out normal users.
const marketingApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: "Too many requests from this IP, please try again after 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});

const authApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: "Too many sign-in attempts from this IP, please try again after 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/updates', marketingApiLimiter);
app.use('/api/waitlist', marketingApiLimiter);
app.use('/api/comment', marketingApiLimiter);
app.use('/api/unsubscribe', marketingApiLimiter);

async function appendToSheet(data) {
    const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
    if (!scriptUrl) {
        console.warn("No GOOGLE_SCRIPT_URL provided. Skipping sheet append.");
        return;
    }
    await axios.post(scriptUrl, data);
}

async function handleUpdatesSignup(req, res) {
    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required" });
    }

    try {
        await appendToSheet({
            Type: 'Updates',
            Name: name,
            Email: email,
            Comment: '',
            Date: new Date().toISOString()
        });
        res.status(200).json({ success: true });
    } catch (err) {
        console.error("Updates signup error:", err.message);
        res.status(500).json({ error: "Failed to save updates signup" });
    }
}

app.post('/api/updates', handleUpdatesSignup);
app.post('/api/waitlist', handleUpdatesSignup);

app.post('/api/android-waitlist', async (req, res) => {
    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required" });
    }

    try {
        await appendToSheet({
            Type: 'Waiting List',
            Name: name,
            Email: email,
            Comment: 'Notify when HOMY is ready for this device',
            Date: new Date().toISOString()
        });
        res.status(200).json({ success: true });
    } catch (err) {
        console.error("Waiting list signup error:", err.message);
        res.status(500).json({ error: "Failed to save waiting list signup" });
    }
});

app.post('/api/comment', async (req, res) => {
    const { name, email, comment } = req.body;

    if (!name || !email || !comment) {
        return res.status(400).json({ error: "Name, email, and comment are required" });
    }

    try {
        await appendToSheet({
            Type: 'Commentary',
            Name: name,
            Email: email,
            Comment: comment,
            Date: new Date().toISOString()
        });
        res.status(200).json({ success: true });
    } catch (err) {
        console.error("Comment error:", err.message);
        res.status(500).json({ error: "Failed to save comment entry" });
    }
});

app.get('/unsubscribe', async (req, res) => {
    const email = normalizeEmail(req.query?.email);
    const token = typeof req.query?.token === 'string' ? req.query.token.trim() : '';

    if (!isValidUnsubscribeToken(email, token)) {
        res.status(400).setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(renderUnsubscribePage({
            title: 'This unsubscribe link is not valid',
            body: 'For your privacy, this unsubscribe link could not be verified.',
            email,
            token,
            canConfirm: false
        }));
        return;
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderUnsubscribePage({
        title: 'Unsubscribe from HOMY updates?',
        body: `We will stop sending HOMY product updates to ${maskEmailAddress(email)}.`,
        email,
        token,
        canConfirm: true
    }));
});

app.post('/unsubscribe', async (req, res) => {
    await handleUnsubscribe(req, res);
});

app.post('/api/unsubscribe', async (req, res) => {
    await handleUnsubscribe(req, res);
});

app.use('/api/auth/', authApiLimiter);

app.post('/api/auth/apple', async (req, res) => {
    if (!isAuthorized(req)) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const idToken = typeof req.body?.id_token === 'string' ? req.body.id_token.trim() : '';
    const userID = typeof req.body?.user_id === 'string' ? req.body.user_id.trim() : '';
    const accessMode = normalizeAccessMode(req.body?.access_mode);
    const firstName = cleanName(req.body?.first_name);
    const lastName = cleanName(req.body?.last_name);
    const requestedEmail = normalizeEmail(req.body?.email);
    const requestedSession = extractRequestedSession(req.body);

    if (!idToken) {
        return res.status(400).json({ error: "Apple identity token is required." });
    }

    if (!accessMode) {
        return res.status(400).json({ error: "A valid access mode is required." });
    }

    try {
        const appleProfile = await verifyAppleIdentityToken(idToken);
        const responseBody = await updateAuthStore(async (store) => {
            const linkedUser = resolveSessionUser(
                store.users,
                requestedSession,
                "Sign in again before linking Apple to this HOMY account."
            );
            const matchedUsers = [
                findUserByAppleSubject(store.users, appleProfile.sub),
                appleProfile.email ? findUserByEmail(store.users, appleProfile.email) : null,
                requestedEmail ? findUserByEmail(store.users, requestedEmail) : null
            ].filter(Boolean);

            ensureMatchedUsersBelongToLinkedUser(
                linkedUser,
                matchedUsers,
                "That Apple account is already linked to a different HOMY account."
            );

            if (!linkedUser && userID && appleProfile.sub !== userID) {
                throw httpError(
                    403,
                    "That Apple account does not match the HOMY account you are trying to use."
                );
            }

            let user = linkedUser || matchedUsers[0] || null;
            let isNewUser = false;

            if (!user && accessMode === 'sign_in') {
                throw httpError(
                    404,
                    "No HOMY account exists for this Apple account yet. Create one instead."
                );
            }

            if (!user) {
                user = createUserFromAppleProfile(appleProfile, {
                    firstName,
                    lastName,
                    email: requestedEmail
                });
                store.users.push(user);
                isNewUser = true;
            } else {
                linkAppleIdentity(user, appleProfile, {
                    firstName,
                    lastName,
                    email: requestedEmail
                });
            }

            user.lastAuthenticatedAt = new Date().toISOString();
            const sessionToken = issueSessionToken(user);
            return serializeAuthUser(user, isNewUser, sessionToken);
        });

        res.status(200).json(responseBody);
    } catch (err) {
        const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
        const message = statusCode >= 500
            ? "Apple Sign-In is unavailable right now."
            : err.message;

        if (statusCode >= 500) {
            console.error("Apple auth error:", err.message);
        }

        res.status(statusCode).json({ error: message });
    }
});

app.post('/api/auth/email/create-account', async (req, res) => {
    if (!isAuthorized(req)) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const email = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';
    const firstName = cleanName(req.body?.first_name);
    const requestedSession = extractRequestedSession(req.body);

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Enter a valid email address to continue." });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: "Use a password with at least 8 characters." });
    }

    try {
        const responseBody = await updateAuthStore(async (store) => {
            const linkedUser = resolveSessionUser(
                store.users,
                requestedSession,
                "Sign in again before adding email sign-in to this HOMY account."
            );
            const matchedUser = findUserByEmail(store.users, email);
            let isNewUser = false;

            if (linkedUser) {
                if (matchedUser && matchedUser.id !== linkedUser.id) {
                    throw httpError(
                        409,
                        "That email is already linked to a different HOMY account."
                    );
                }

                if (linkedUser.providers?.email?.passwordHash) {
                    throw httpError(
                        409,
                        "Email sign-in is already active for this HOMY account. Change your password instead."
                    );
                }

                linkEmailIdentity(linkedUser, { email, password, firstName });
                linkedUser.lastAuthenticatedAt = new Date().toISOString();
                const sessionToken = issueSessionToken(linkedUser);
                return serializeAuthUser(linkedUser, false, sessionToken);
            }

            if (!matchedUser) {
                const user = createUserFromEmail({ email, firstName });
                store.users.push(user);
                isNewUser = true;
                linkEmailIdentity(user, { email, password, firstName });
                user.lastAuthenticatedAt = new Date().toISOString();
                const sessionToken = issueSessionToken(user);
                return serializeAuthUser(user, isNewUser, sessionToken);
            }

            if (matchedUser.providers?.email?.passwordHash) {
                throw httpError(
                    409,
                    "A HOMY account already exists for that email. Sign in instead."
                );
            }

            throw httpError(
                409,
                "That email already belongs to a HOMY account. Sign in with the original method first, then add email from Account access."
            );
        });

        res.status(200).json(responseBody);
    } catch (err) {
        const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
        const message = statusCode >= 500
            ? "Email account creation is unavailable right now."
            : err.message;

        if (statusCode >= 500) {
            console.error("Email create account error:", err.message);
        }

        res.status(statusCode).json({ error: message });
    }
});

app.post('/api/auth/email/sign-in', async (req, res) => {
    if (!isAuthorized(req)) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const email = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Enter a valid email address to continue." });
    }

    if (!password) {
        return res.status(400).json({ error: "Enter your password to continue." });
    }

    try {
        const responseBody = await updateAuthStore(async (store) => {
            const user = findUserByEmail(store.users, email);

            if (!user?.providers?.email?.passwordHash) {
                throw httpError(
                    404,
                    "No HOMY email account exists for that address yet. Create one instead."
                );
            }

            if (!verifyPassword(password, user.providers.email.passwordHash)) {
                throw httpError(401, "That email or password is not correct.");
            }

            user.lastAuthenticatedAt = new Date().toISOString();
            const sessionToken = issueSessionToken(user);
            return serializeAuthUser(user, false, sessionToken);
        });

        res.status(200).json(responseBody);
    } catch (err) {
        const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
        const message = statusCode >= 500
            ? "Email sign-in is unavailable right now."
            : err.message;

        if (statusCode >= 500) {
            console.error("Email sign-in error:", err.message);
        }

        res.status(statusCode).json({ error: message });
    }
});

app.post('/api/auth/account/security-status', async (req, res) => {
    if (!isAuthorized(req)) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const requestedSession = extractRequestedSession(req.body);

    try {
        const responseBody = await updateAuthStore(async (store) => {
            const user = requireSessionUser(
                store.users,
                requestedSession,
                "Sign in again before opening Account access."
            );

            return {
                user_id: user.id,
                email: user.email || null,
                phone_number: user.phoneNumber || null,
                is_email_verified: Boolean(user.isEmailVerified),
                is_phone_verified: Boolean(user.isPhoneVerified),
                account_security: serializeAccountSecurity(user)
            };
        });

        res.status(200).json(responseBody);
    } catch (err) {
        const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
        const message = statusCode >= 500
            ? "Account access is unavailable right now."
            : err.message;

        if (statusCode >= 500) {
            console.error("Security status error:", err.message);
        }

        res.status(statusCode).json({ error: message });
    }
});

app.post('/api/auth/account/unlink-provider', async (req, res) => {
    if (!isAuthorized(req)) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const requestedSession = extractRequestedSession(req.body);
    const provider = normalizeProvider(req.body?.provider);

    if (!provider) {
        return res.status(400).json({ error: "Choose a valid sign-in method to remove." });
    }

    try {
        const responseBody = await updateAuthStore(async (store) => {
            const user = requireSessionUser(
                store.users,
                requestedSession,
                "Sign in again before removing a sign-in method."
            );

            if (!hasLinkedProvider(user, provider)) {
                throw httpError(404, "That sign-in method is not linked to this HOMY account.");
            }

            if (countLinkedProviders(user) <= 1) {
                throw httpError(
                    409,
                    "Add another sign-in method before removing the last one on this HOMY account."
                );
            }

            unlinkProvider(user, provider);
            user.updatedAt = new Date().toISOString();

            return {
                unlinked: true,
                provider,
                account_security: serializeAccountSecurity(user)
            };
        });

        res.status(200).json(responseBody);
    } catch (err) {
        const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
        const message = statusCode >= 500
            ? "That sign-in method could not be removed right now."
            : err.message;

        if (statusCode >= 500) {
            console.error("Unlink provider error:", err.message);
        }

        res.status(statusCode).json({ error: message });
    }
});

app.post('/api/auth/email/send-verification', async (req, res) => {
    if (!isAuthorized(req)) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const requestedSession = extractRequestedSession(req.body);
    const requestedEmail = normalizeEmail(req.body?.email);

    try {
        const responseBody = await updateAuthStore(async (store) => {
            const user = requireSessionUser(
                store.users,
                requestedSession,
                "Sign in again before verifying this email."
            );
            const targetEmail = requestedEmail || normalizeEmail(user.email);

            if (!isValidEmail(targetEmail)) {
                throw httpError(400, "Add a valid email address before requesting verification.");
            }

            const matchedUser = findUserByEmail(store.users, targetEmail);
            if (matchedUser && matchedUser.id !== user.id) {
                throw httpError(409, "That email is already linked to a different HOMY account.");
            }

            user.email = targetEmail;
            if (!user.providers?.email) {
                user.providers = user.providers || {};
                user.providers.email = {};
            }
            user.isEmailVerified = false;

            const verificationToken = issueUserActionToken(
                user,
                'email_verification',
                { email: targetEmail },
                24 * 60 * 60 * 1000
            );
            const verificationURL = buildBrowserAuthLink('verify', verificationToken, targetEmail);

            await sendTransactionalEmail({
                to: targetEmail,
                subject: "Verify your HOMY email",
                text: [
                    "Verify your HOMY email to finish activating your account.",
                    "",
                    verificationURL
                ].join('\n'),
                html: `
                    <p>Verify your HOMY email to finish activating your account.</p>
                    <p><a href="${escapeHTMLAttribute(verificationURL)}">Verify email</a></p>
                `
            });

            user.updatedAt = new Date().toISOString();

            return {
                sent: true,
                message: `Verification email sent to ${maskEmailAddress(targetEmail)}.`
            };
        });

        res.status(200).json(responseBody);
    } catch (err) {
        const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
        const message = statusCode >= 500
            ? "Email verification is unavailable right now."
            : err.message;

        if (statusCode >= 500) {
            console.error("Send verification error:", err.message);
        }

        res.status(statusCode).json({ error: message });
    }
});

app.post('/api/auth/email/complete-verification', async (req, res) => {
    if (!isAuthorized(req)) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';

    if (!token) {
        return res.status(400).json({ error: "A verification token is required." });
    }

    try {
        const responseBody = await updateAuthStore(async (store) => {
            const tokenMatch = findUserActionToken(store.users, 'email_verification', token);

            if (!tokenMatch) {
                throw httpError(404, "That email verification link is no longer valid. Request a new one.");
            }

            const { user, tokenRecord } = tokenMatch;
            const verifiedEmail = normalizeEmail(tokenRecord.email || user.email);

            if (!verifiedEmail) {
                throw httpError(400, "That email verification link is missing an email address.");
            }

            user.email = verifiedEmail;
            user.isEmailVerified = true;
            if (!user.providers?.email) {
                user.providers = user.providers || {};
                user.providers.email = {};
            }
            user.providers.email.isVerified = true;
            markUserActionTokenConsumed(user, tokenRecord);
            user.updatedAt = new Date().toISOString();
            user.lastAuthenticatedAt = new Date().toISOString();

            const sessionToken = issueSessionToken(user);
            return serializeAuthUser(user, false, sessionToken);
        });

        res.status(200).json(responseBody);
    } catch (err) {
        const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
        const message = statusCode >= 500
            ? "Email verification is unavailable right now."
            : err.message;

        if (statusCode >= 500) {
            console.error("Complete verification error:", err.message);
        }

        res.status(statusCode).json({ error: message });
    }
});

app.post('/api/auth/email/request-password-reset', async (req, res) => {
    if (!isAuthorized(req)) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const email = normalizeEmail(req.body?.email);

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Enter a valid email address to reset your password." });
    }

    try {
        const responseBody = await updateAuthStore(async (store) => {
            const user = findUserByEmail(store.users, email);

            if (user?.providers?.email?.passwordHash) {
                const resetToken = issueUserActionToken(
                    user,
                    'password_reset',
                    { email },
                    60 * 60 * 1000
                );
                const resetURL = buildBrowserAuthLink('reset-password', resetToken, email);

                await sendTransactionalEmail({
                    to: email,
                    subject: "Reset your HOMY password",
                    text: [
                        "Use this link to reset your HOMY password.",
                        "",
                        resetURL
                    ].join('\n'),
                    html: `
                        <p>Use this link to reset your HOMY password.</p>
                        <p><a href="${escapeHTMLAttribute(resetURL)}">Reset password</a></p>
                    `
                });
            }

            return {
                sent: true,
                message: `If a HOMY account exists for ${maskEmailAddress(email)}, a password reset email is on the way.`
            };
        });

        res.status(200).json(responseBody);
    } catch (err) {
        const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
        const message = statusCode >= 500
            ? "Password reset is unavailable right now."
            : err.message;

        if (statusCode >= 500) {
            console.error("Password reset request error:", err.message);
        }

        res.status(statusCode).json({ error: message });
    }
});

app.post('/api/auth/email/reset-password', async (req, res) => {
    if (!isAuthorized(req)) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';

    if (!token) {
        return res.status(400).json({ error: "A password reset token is required." });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: "Use a password with at least 8 characters." });
    }

    try {
        const responseBody = await updateAuthStore(async (store) => {
            const tokenMatch = findUserActionToken(store.users, 'password_reset', token);

            if (!tokenMatch) {
                throw httpError(404, "That password reset link is no longer valid. Request a new one.");
            }

            const { user, tokenRecord } = tokenMatch;
            if (!user.providers?.email) {
                user.providers = user.providers || {};
                user.providers.email = {};
            }

            user.providers.email.passwordHash = hashPassword(password);
            user.isEmailVerified = true;
            if (tokenRecord.email) {
                user.email = normalizeEmail(tokenRecord.email);
            }
            markUserActionTokenConsumed(user, tokenRecord);
            user.updatedAt = new Date().toISOString();
            user.lastAuthenticatedAt = new Date().toISOString();

            const sessionToken = issueSessionToken(user);
            return serializeAuthUser(user, false, sessionToken);
        });

        res.status(200).json(responseBody);
    } catch (err) {
        const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
        const message = statusCode >= 500
            ? "Password reset is unavailable right now."
            : err.message;

        if (statusCode >= 500) {
            console.error("Password reset error:", err.message);
        }

        res.status(statusCode).json({ error: message });
    }
});

app.post('/api/auth/email/change-password', async (req, res) => {
    if (!isAuthorized(req)) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const requestedSession = extractRequestedSession(req.body);
    const currentPassword = typeof req.body?.current_password === 'string' ? req.body.current_password.trim() : '';
    const newPassword = typeof req.body?.new_password === 'string' ? req.body.new_password.trim() : '';

    if (!currentPassword) {
        return res.status(400).json({ error: "Enter your current password to continue." });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ error: "Use a password with at least 8 characters." });
    }

    try {
        const responseBody = await updateAuthStore(async (store) => {
            const user = requireSessionUser(
                store.users,
                requestedSession,
                "Sign in again before changing your password."
            );

            if (!user.providers?.email?.passwordHash) {
                throw httpError(404, "Email password sign-in is not active on this HOMY account yet.");
            }

            if (!verifyPassword(currentPassword, user.providers.email.passwordHash)) {
                throw httpError(401, "That current password is not correct.");
            }

            user.providers.email.passwordHash = hashPassword(newPassword);
            user.updatedAt = new Date().toISOString();

            return {
                updated: true,
                message: "Your HOMY password has been updated.",
                account_security: serializeAccountSecurity(user)
            };
        });

        res.status(200).json(responseBody);
    } catch (err) {
        const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
        const message = statusCode >= 500
            ? "Password changes are unavailable right now."
            : err.message;

        if (statusCode >= 500) {
            console.error("Change password error:", err.message);
        }

        res.status(statusCode).json({ error: message });
    }
});

app.post('/api/auth/email/send-magic-link', async (req, res) => {
    if (!isAuthorized(req)) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const email = normalizeEmail(req.body?.email);
    const accessMode = normalizeAccessMode(req.body?.access_mode) || 'sign_in';

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Enter a valid email address to continue." });
    }

    try {
        const responseBody = await updateAuthStore(async (store) => {
            let user = findUserByEmail(store.users, email);
            let isNewUser = false;

            if (!user && accessMode === 'sign_in') {
                throw httpError(404, "No HOMY account exists for that email yet. Create one instead.");
            }

            if (!user) {
                user = createUserFromEmail({ email, firstName: null });
                user.isEmailVerified = false;
                store.users.push(user);
                isNewUser = true;
            }

            if (!user.providers?.email) {
                user.providers = user.providers || {};
                user.providers.email = {};
            }

            const magicToken = issueUserActionToken(
                user,
                'magic_link',
                {
                    email,
                    accessMode,
                    isNewUser
                },
                30 * 60 * 1000
            );
            const magicLinkURL = buildBrowserAuthLink('magic-link', magicToken, email);

            await sendTransactionalEmail({
                to: email,
                subject: accessMode === 'create_account' ? "Create your HOMY account" : "Sign in to HOMY",
                text: [
                    accessMode === 'create_account'
                        ? "Tap this link to finish creating your HOMY account."
                        : "Tap this link to sign in to HOMY.",
                    "",
                    magicLinkURL
                ].join('\n'),
                html: `
                    <p>${accessMode === 'create_account'
                        ? "Tap this link to finish creating your HOMY account."
                        : "Tap this link to sign in to HOMY."}</p>
                    <p><a href="${escapeHTMLAttribute(magicLinkURL)}">Continue to HOMY</a></p>
                `
            });

            user.updatedAt = new Date().toISOString();

            return {
                sent: true,
                message: `Magic link sent to ${maskEmailAddress(email)}.`
            };
        });

        res.status(200).json(responseBody);
    } catch (err) {
        const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
        const message = statusCode >= 500
            ? "Magic link sign-in is unavailable right now."
            : err.message;

        if (statusCode >= 500) {
            console.error("Magic link send error:", err.message);
        }

        res.status(statusCode).json({ error: message });
    }
});

app.post('/api/auth/email/consume-magic-link', async (req, res) => {
    if (!isAuthorized(req)) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';

    if (!token) {
        return res.status(400).json({ error: "A magic link token is required." });
    }

    try {
        const responseBody = await updateAuthStore(async (store) => {
            const tokenMatch = findUserActionToken(store.users, 'magic_link', token);

            if (!tokenMatch) {
                throw httpError(404, "That magic link is no longer valid. Request a new one.");
            }

            const { user, tokenRecord } = tokenMatch;
            if (!user.providers?.email) {
                user.providers = user.providers || {};
                user.providers.email = {};
            }

            if (tokenRecord.email) {
                user.email = normalizeEmail(tokenRecord.email);
            }
            user.providers.email.magicLinkEnabled = true;
            user.isEmailVerified = true;
            markUserActionTokenConsumed(user, tokenRecord);
            user.updatedAt = new Date().toISOString();
            user.lastAuthenticatedAt = new Date().toISOString();

            const sessionToken = issueSessionToken(user);
            return serializeAuthUser(
                user,
                tokenRecord.isNewUser === true || tokenRecord.accessMode === 'create_account',
                sessionToken
            );
        });

        res.status(200).json(responseBody);
    } catch (err) {
        const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
        const message = statusCode >= 500
            ? "Magic link sign-in is unavailable right now."
            : err.message;

        if (statusCode >= 500) {
            console.error("Magic link consume error:", err.message);
        }

        res.status(statusCode).json({ error: message });
    }
});

app.post('/api/auth/phone/request-code', async (req, res) => {
    if (!isAuthorized(req)) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    if (!isPhoneAuthEnabled()) {
        return res.status(404).json({ error: "Phone sign-in is not available in this version." });
    }

    const phoneNumber = normalizePhoneNumber(req.body?.phone_number);

    if (!isValidPhoneNumber(phoneNumber)) {
        return res.status(400).json({ error: "Enter a valid phone number to continue." });
    }

    try {
        pruneExpiredPhoneChallenges();

        const challengeID = `otp_${crypto.randomUUID()}`;
        const issuedCode = await issuePhoneVerificationCode(phoneNumber);
        phoneChallenges.set(challengeID, {
            challengeID,
            phoneNumber,
            code: issuedCode.code,
            expiresAt: Date.now() + (10 * 60 * 1000),
            attemptCount: 0
        });

        res.status(200).json({
            challenge_id: challengeID,
            phone_number: phoneNumber,
            debug_code: issuedCode.debugCode || null
        });
    } catch (err) {
        const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
        const message = statusCode >= 500
            ? "Phone verification is unavailable right now."
            : err.message;

        if (statusCode >= 500) {
            console.error("Phone code request error:", err.message);
        }

        res.status(statusCode).json({ error: message });
    }
});

app.post('/api/auth/phone/verify-code', async (req, res) => {
    if (!isAuthorized(req)) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    if (!isPhoneAuthEnabled()) {
        return res.status(404).json({ error: "Phone sign-in is not available in this version." });
    }

    pruneExpiredPhoneChallenges();

    const phoneNumber = normalizePhoneNumber(req.body?.phone_number);
    const challengeID = typeof req.body?.challenge_id === 'string' ? req.body.challenge_id.trim() : '';
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    const accessMode = normalizeAccessMode(req.body?.access_mode);
    const requestedSession = extractRequestedSession(req.body);

    if (!isValidPhoneNumber(phoneNumber)) {
        return res.status(400).json({ error: "Enter a valid phone number to continue." });
    }

    if (!challengeID || !code) {
        return res.status(400).json({ error: "A challenge and 6-digit code are required." });
    }

    if (!accessMode) {
        return res.status(400).json({ error: "A valid access mode is required." });
    }

    const challenge = phoneChallenges.get(challengeID);
    if (!challenge || challenge.phoneNumber !== phoneNumber) {
        return res.status(404).json({ error: "That verification challenge could not be found. Request a new code." });
    }

    if (challenge.code !== code) {
        challenge.attemptCount += 1;
        if (challenge.attemptCount >= 5) {
            phoneChallenges.delete(challengeID);
        }
        return res.status(401).json({ error: "That verification code is not valid." });
    }

    phoneChallenges.delete(challengeID);

    try {
        const responseBody = await updateAuthStore(async (store) => {
            const linkedUser = resolveSessionUser(
                store.users,
                requestedSession,
                "Sign in again before linking this phone number to your HOMY account."
            );
            const matchedUser = findUserByPhoneNumber(store.users, phoneNumber);
            let isNewUser = false;

            if (linkedUser) {
                if (matchedUser && matchedUser.id !== linkedUser.id) {
                    throw httpError(
                        409,
                        "That phone number is already linked to a different HOMY account."
                    );
                }

                linkPhoneIdentity(linkedUser, { phoneNumber });
                linkedUser.lastAuthenticatedAt = new Date().toISOString();
                const sessionToken = issueSessionToken(linkedUser);
                return serializeAuthUser(linkedUser, false, sessionToken);
            }

            let user = matchedUser;

            if (!user && accessMode === 'sign_in') {
                throw httpError(
                    404,
                    "No HOMY account exists for that phone number yet. Create one instead."
                );
            }

            if (!user) {
                user = createUserFromPhone({ phoneNumber });
                store.users.push(user);
                isNewUser = true;
            } else {
                linkPhoneIdentity(user, { phoneNumber });
            }

            user.lastAuthenticatedAt = new Date().toISOString();
            const sessionToken = issueSessionToken(user);
            return serializeAuthUser(user, isNewUser, sessionToken);
        });

        res.status(200).json(responseBody);
    } catch (err) {
        const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
        const message = statusCode >= 500
            ? "Phone sign-in is unavailable right now."
            : err.message;

        if (statusCode >= 500) {
            console.error("Phone verify error:", err.message);
        }

        res.status(statusCode).json({ error: message });
    }
});

app.post('/api/auth/google', async (req, res) => {
    if (!isAuthorized(req)) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const idToken = typeof req.body?.id_token === 'string' ? req.body.id_token.trim() : '';
    const accessMode = normalizeAccessMode(req.body?.access_mode);
    const requestedSession = extractRequestedSession(req.body);

    if (!idToken) {
        return res.status(400).json({ error: "Google ID token is required." });
    }

    if (!accessMode) {
        return res.status(400).json({ error: "A valid access mode is required." });
    }

    try {
        const googleProfile = await verifyGoogleIdToken(idToken);
        const responseBody = await updateAuthStore(async (store) => {
            const linkedUser = resolveSessionUser(
                store.users,
                requestedSession,
                "Sign in again before linking Google to this HOMY account."
            );
            const matchedUsers = [
                findUserByGoogleSubject(store.users, googleProfile.sub),
                googleProfile.email ? findUserByEmail(store.users, googleProfile.email) : null
            ].filter(Boolean);

            ensureMatchedUsersBelongToLinkedUser(
                linkedUser,
                matchedUsers,
                "That Google account is already linked to a different HOMY account."
            );

            let user = linkedUser || matchedUsers[0] || null;
            let isNewUser = false;

            if (!user && accessMode === 'sign_in') {
                throw httpError(
                    404,
                    "No HOMY account exists for this Google account yet. Create one instead."
                );
            }

            if (!user) {
                user = createUserFromGoogleProfile(googleProfile);
                store.users.push(user);
                isNewUser = true;
            } else {
                linkGoogleIdentity(user, googleProfile);
            }

            user.lastAuthenticatedAt = new Date().toISOString();
            const sessionToken = issueSessionToken(user);
            return serializeAuthUser(user, isNewUser, sessionToken);
        });

        res.status(200).json(responseBody);
    } catch (err) {
        const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
        const message = statusCode >= 500
            ? "Google authentication is unavailable right now."
            : err.message;

        if (statusCode >= 500) {
            console.error("Google auth error:", err.message);
        }

        res.status(statusCode).json({ error: message });
    }
});

app.post('/api/auth/account/delete', async (req, res) => {
    if (!isAuthorized(req)) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const idToken = typeof req.body?.id_token === 'string' ? req.body.id_token.trim() : '';
    const userID = typeof req.body?.user_id === 'string' ? req.body.user_id.trim() : '';
    const sessionToken = typeof req.body?.session_token === 'string' ? req.body.session_token.trim() : '';

    if (!sessionToken && !idToken) {
        return res.status(400).json({ error: "A valid HOMY session or Google token is required to delete this account." });
    }

    try {
        const responseBody = await updateAuthStore(async (store) => {
            if (sessionToken) {
                if (!userID) {
                    throw httpError(
                        400,
                        "A HOMY user ID is required to delete this account."
                    );
                }

                const userIndex = findUserIndexBySessionToken(store.users, userID, sessionToken);

                if (userIndex === -1) {
                    throw httpError(401, "Sign in again before deleting your account.");
                }

                const user = store.users[userIndex];
                store.users.splice(userIndex, 1);
                return {
                    deleted: true,
                    user_id: user.id
                };
            }

            const googleProfile = await verifyGoogleIdToken(idToken);
            const userIndex = findUserIndexForGoogleProfile(store.users, googleProfile);

            if (userIndex === -1) {
                throw httpError(404, "No HOMY account was found for that Google account.");
            }

            const user = store.users[userIndex];
            if (userID && user.id !== userID) {
                throw httpError(
                    403,
                    "That Google account does not match the HOMY account you are trying to delete."
                );
            }

            store.users.splice(userIndex, 1);
            return {
                deleted: true,
                user_id: user.id
            };
        });

        res.status(200).json(responseBody);
    } catch (err) {
        const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
        const message = statusCode >= 500
            ? "Account deletion is unavailable right now."
            : err.message;

        if (statusCode >= 500) {
            console.error("Account deletion error:", err.message);
        }

        res.status(statusCode).json({ error: message });
    }
});

// ───────────────────────────────────────────────────────────────────
// Phase 8 — push notifications.
//
// HOMY Android/iOS clients POST here after writing a new message to
// Firestore. The endpoint reads the recipient's `fcmTokens` array from
// `users/{toUid}` and fans out a push via the Firebase Admin SDK.
//
// The endpoint never trusts the caller's identity claim on its face —
// the Firebase Admin SDK only sends to tokens stored under the
// recipient's user doc, and the rate limiter keeps spam down. A real
// hardening pass would verify the caller's Firebase ID token (sent
// in an Authorization header) matches a participant on the
// conversation. That's deferred until we wire ID-token forwarding
// in the client.
// ───────────────────────────────────────────────────────────────────
const pushNotificationLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { error: "Too many notification requests." },
    standardHeaders: true,
    legacyHeaders: false,
});

app.post('/api/notify-message', pushNotificationLimiter, async (req, res) => {
    if (!isFirebaseAdminReady()) {
        return res.status(503).json({
            error: 'Push notifications are not configured. Set FIREBASE_SERVICE_ACCOUNT.',
        });
    }
    const { toUid, conversationId, senderName, preview, kind } = req.body || {};
    if (typeof toUid !== 'string' || !toUid.trim()) {
        return res.status(400).json({ error: "Missing 'toUid'." });
    }
    if (typeof conversationId !== 'string' || !conversationId.trim()) {
        return res.status(400).json({ error: "Missing 'conversationId'." });
    }

    try {
        const userDoc = await getAdminFirestore()
            .collection('users')
            .doc(toUid.trim())
            .get();
        const data = userDoc.exists ? userDoc.data() : null;
        const tokens = Array.isArray(data?.fcmTokens) ? data.fcmTokens.filter(Boolean) : [];
        if (tokens.length === 0) {
            return res.json({ sent: 0, reason: 'No FCM tokens registered for recipient.' });
        }

        const title = typeof senderName === 'string' && senderName.trim() ? senderName.trim() : 'HOMY';
        const bodyText = typeof preview === 'string' ? preview.slice(0, 240) : '';
        const message = {
            tokens,
            notification: {
                title,
                body: bodyText || 'New message',
            },
            data: {
                kind: typeof kind === 'string' ? kind : 'message',
                conversationId: conversationId.trim(),
            },
            android: {
                priority: 'high',
                notification: { channelId: 'homy_messages' },
            },
            apns: {
                payload: { aps: { sound: 'default' } },
            },
        };
        const result = await getAdminMessaging().sendEachForMulticast(message);

        // Prune dead tokens — FCM tells us which ones aren't routable.
        const deadTokens = [];
        result.responses.forEach((resp, idx) => {
            if (!resp.success) {
                const code = resp.error?.code || '';
                if (
                    code === 'messaging/invalid-registration-token' ||
                    code === 'messaging/registration-token-not-registered'
                ) {
                    deadTokens.push(tokens[idx]);
                }
            }
        });
        if (deadTokens.length > 0) {
            await getAdminFirestore()
                .collection('users')
                .doc(toUid.trim())
                .update({
                    fcmTokens: data.fcmTokens.filter((t) => !deadTokens.includes(t)),
                });
        }

        return res.json({
            sent: result.successCount,
            failed: result.failureCount,
            pruned: deadTokens.length,
        });
    } catch (err) {
        console.error('notify-message error:', err.message);
        return res.status(500).json({ error: 'Push send failed.' });
    }
});

app.get('/auth/email/verify', (req, res) => {
    res.redirect(
        302,
        buildAppAuthCallbackURL('email_verification', {
            token: typeof req.query?.token === 'string' ? req.query.token.trim() : '',
            email: typeof req.query?.email === 'string' ? req.query.email.trim() : ''
        })
    );
});

app.get('/auth/email/reset-password', (req, res) => {
    res.redirect(
        302,
        buildAppAuthCallbackURL('password_reset', {
            token: typeof req.query?.token === 'string' ? req.query.token.trim() : '',
            email: typeof req.query?.email === 'string' ? req.query.email.trim() : ''
        })
    );
});

app.get('/auth/email/magic-link', (req, res) => {
    res.redirect(
        302,
        buildAppAuthCallbackURL('magic_link', {
            token: typeof req.query?.token === 'string' ? req.query.token.trim() : '',
            email: typeof req.query?.email === 'string' ? req.query.email.trim() : ''
        })
    );
});

app.get(['/ios', '/iphone', '/app'], (_req, res) => {
    res.redirect(302, APP_STORE_REDIRECT_URL);
});

// Android App Links verification (express.static ignores dot-directories,
// so this needs an explicit route). The release entry is the Play upload
// key; the two debug entries let devDebug/prodDebug builds verify
// https://homyforme.com/auth/email/* deep links during QA.
const ANDROID_RELEASE_CERT_SHA256 = 'CA:F7:12:9F:17:AC:63:DE:04:8B:A9:CB:78:34:BB:AA:3A:8D:1E:80:DC:24:18:10:D5:54:DF:E3:AB:49:EA:13';
const ANDROID_DEBUG_CERT_SHA256 = 'C1:18:22:5D:E6:D1:34:B3:C9:0D:62:42:A2:7D:2C:4D:32:DE:F7:FE:14:77:07:8F:7C:8C:32:19:5E:F9:D3:A4';
app.get('/.well-known/assetlinks.json', (_req, res) => {
    res.json([
        {
            relation: ['delegate_permission/common.handle_all_urls'],
            target: {
                namespace: 'android_app',
                package_name: 'com.cirett.homy',
                sha256_cert_fingerprints: [ANDROID_RELEASE_CERT_SHA256]
            }
        },
        {
            relation: ['delegate_permission/common.handle_all_urls'],
            target: {
                namespace: 'android_app',
                package_name: 'com.cirett.homy.dev.debug',
                sha256_cert_fingerprints: [ANDROID_DEBUG_CERT_SHA256]
            }
        },
        {
            relation: ['delegate_permission/common.handle_all_urls'],
            target: {
                namespace: 'android_app',
                package_name: 'com.cirett.homy.debug',
                sha256_cert_fingerprints: [ANDROID_DEBUG_CERT_SHA256]
            }
        }
    ]);
});

// Serve static frontend
app.use(express.static(path.join(__dirname, '../dist')));

const indexHtmlPath = path.join(__dirname, '../dist', 'index.html');
let cachedDeHtml = null;
async function getGermanHtml() {
    if (cachedDeHtml) return cachedDeHtml;
    const html = await fs.readFile(indexHtmlPath, 'utf8');
    const deTitle = 'HOMY – Finde Zimmer, Wohnungen & Mitbewohner';
    const deDesc = 'Lade HOMY aufs iPhone und finde Zimmer, Wohnungen & Mitbewohner in Freiburg. Swipe durch Angebote, poste was du suchst oder anbietest und chatte klarer.';
    const deOgDesc = 'Lade HOMY aufs iPhone und finde Zimmer, Wohnungen & Mitbewohner in Freiburg. Swipe, matche und chatte in einem einfachen Flow.';
    cachedDeHtml = html
        .replace('<html lang="en">', '<html lang="de">')
        .replace('<link rel="canonical" href="https://homyforme.com/" />', '<link rel="canonical" href="https://homyforme.com/de" />')
        .replace(/<title>[^<]*<\/title>/, `<title>${deTitle}</title>`)
        .replace(/<meta name="title" content="[^"]*" \/>/, `<meta name="title" content="${deTitle}" />`)
        .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${deDesc}" />`)
        .replace(/<meta property="og:url" content="[^"]*" \/>/, '<meta property="og:url" content="https://homyforme.com/de" />')
        .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${deTitle}" />`)
        .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${deOgDesc}" />`)
        .replace(/<meta property="og:image" content="[^"]*" \/>/, '<meta property="og:image" content="https://homyforme.com/og-image-de.png" />')
        .replace(/<meta property="og:locale" content="[^"]*" \/>/, '<meta property="og:locale" content="de_DE" />')
        .replace(/<meta property="og:locale:alternate" content="[^"]*" \/>/, '<meta property="og:locale:alternate" content="en_US" />')
        .replace(/<meta name="twitter:url" content="[^"]*" \/>/, '<meta name="twitter:url" content="https://homyforme.com/de" />')
        .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${deTitle}" />`)
        .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${deOgDesc}" />`)
        .replace(/<meta name="twitter:image" content="[^"]*" \/>/, '<meta name="twitter:image" content="https://homyforme.com/og-image-de.png" />');
    return cachedDeHtml;
}

app.get(['/de', '/de/'], async (_req, res, next) => {
    try {
        const html = await getGermanHtml();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (err) {
        next(err);
    }
});

app.get('/blog/:slug', async (req, res, next) => {
    try {
        const { slug } = req.params;
        const post = blogPosts.find(p => p.slug === slug);
        if (!post) {
            return res.sendFile(indexHtmlPath);
        }

        const html = await fs.readFile(indexHtmlPath, 'utf8');
        const title = `${post.title} | HOMY Blog`;
        const desc = post.metaDescription;
        const canonical = `https://homyforme.com/blog/${slug}`;

        const dynamicHtml = html
            .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
            .replace(/<meta name="title" content="[^"]*" \/>/, `<meta name="title" content="${title}" />`)
            .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${desc}" />`)
            .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${canonical}" />`)
            .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${canonical}" />`)
            .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${title}" />`)
            .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${desc}" />`)
            .replace(/<meta name="twitter:url" content="[^"]*" \/>/, `<meta name="twitter:url" content="${canonical}" />`)
            .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${title}" />`)
            .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${desc}" />`);

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(dynamicHtml);
    } catch (err) {
        next(err);
    }
});

app.get(/(.*)/, (_req, res) => {
    res.sendFile(indexHtmlPath);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});

function resolveAuthStorePath() {
    return resolveDataStorePath('AUTH_STORE_PATH', 'server/data/auth-users.json');
}

function resolveDataStorePath(envName, fallbackPath) {
    const configuredPath = (process.env[envName] || fallbackPath).trim();

    if (path.isAbsolute(configuredPath)) {
        return configuredPath;
    }

    return path.join(appRoot, configuredPath);
}

async function handleUnsubscribe(req, res) {
    const email = normalizeEmail(req.body?.email || req.query?.email);
    const token = typeof (req.body?.token || req.query?.token) === 'string'
        ? String(req.body?.token || req.query?.token).trim()
        : '';

    if (!isValidUnsubscribeToken(email, token)) {
        const message = "That unsubscribe link is not valid.";
        if (wantsHTML(req)) {
            res.status(400).setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(renderUnsubscribePage({
                title: 'This unsubscribe link is not valid',
                body: 'For your privacy, this unsubscribe link could not be verified.',
                email,
                token,
                canConfirm: false
            }));
            return;
        }
        res.status(400).json({ error: message });
        return;
    }

    try {
        await recordUnsubscribe(email, req);
        if (wantsHTML(req)) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(renderUnsubscribePage({
                title: 'You are unsubscribed',
                body: `We will stop sending HOMY product updates to ${maskEmailAddress(email)}.`,
                email,
                token,
                canConfirm: false
            }));
            return;
        }
        res.status(200).json({ success: true });
    } catch (err) {
        console.error("Unsubscribe error:", err.message);
        if (wantsHTML(req)) {
            res.status(500).setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(renderUnsubscribePage({
                title: 'Unsubscribe is temporarily unavailable',
                body: 'Please reply to the email with "unsubscribe" and we will remove you manually.',
                email,
                token,
                canConfirm: false
            }));
            return;
        }
        res.status(500).json({ error: "Failed to unsubscribe. Please reply to the email with unsubscribe." });
    }
}

function wantsHTML(req) {
    const accept = String(req.get('Accept') || '');
    const contentType = String(req.get('Content-Type') || '');
    return accept.includes('text/html') || contentType.includes('application/x-www-form-urlencoded');
}

function isValidUnsubscribeToken(email, token) {
    if (!isValidEmail(email) || !token) {
        return false;
    }
    const secret = unsubscribeSecret();
    if (!secret) {
        console.error("UNSUBSCRIBE_SECRET is missing.");
        return false;
    }
    const expected = crypto
        .createHmac('sha256', secret)
        .update(email)
        .digest('hex');
    return timingSafeStringEqual(token, expected);
}

function unsubscribeSecret() {
    return String(process.env.UNSUBSCRIBE_SECRET || process.env.HOMY_UNSUBSCRIBE_SECRET || '').trim();
}

async function recordUnsubscribe(email, req) {
    const timestamp = new Date().toISOString();
    await upsertLocalUnsubscribe(email, timestamp, req);
    try {
        await appendToSheet({
            Action: 'Unsubscribe',
            Type: 'Unsubscribe',
            Name: '',
            Email: email,
            Comment: 'Unsubscribed from HOMY product updates',
            Date: timestamp,
            Unsubscribed: 'TRUE',
            UnsubscribedAt: timestamp,
            Source: 'email-footer'
        });
    } catch (err) {
        console.error("Unsubscribe saved locally, but Google Sheet update failed:", err.message);
    }
}

async function upsertLocalUnsubscribe(email, timestamp, req) {
    await fs.mkdir(path.dirname(unsubscribeStorePath), { recursive: true });
    const store = await readJSONFile(unsubscribeStorePath, { unsubscribed: [] });
    const entries = Array.isArray(store.unsubscribed) ? store.unsubscribed : [];
    const existing = entries.find((entry) => normalizeEmail(entry.email) === email);
    const entry = {
        email,
        unsubscribedAt: timestamp,
        ip: req.ip || null,
        userAgent: req.get('User-Agent') || null
    };
    if (existing) {
        Object.assign(existing, entry);
    } else {
        entries.push(entry);
    }
    await fs.writeFile(
        unsubscribeStorePath,
        JSON.stringify({ unsubscribed: entries }, null, 2),
        'utf8'
    );
}

async function readJSONFile(filePath, fallback) {
    try {
        const raw = await fs.readFile(filePath, 'utf8');
        return JSON.parse(raw);
    } catch (err) {
        if (err.code === 'ENOENT') {
            return fallback;
        }
        throw err;
    }
}

function renderUnsubscribePage({ title, body, email, token, canConfirm }) {
    const safeTitle = escapeHTML(title);
    const safeBody = escapeHTML(body);
    const safeEmail = escapeHTMLAttribute(email);
    const safeToken = escapeHTMLAttribute(token);
    const form = canConfirm
        ? `<form method="post" action="/unsubscribe" style="margin:24px 0 0 0;">
            <input type="hidden" name="email" value="${safeEmail}">
            <input type="hidden" name="token" value="${safeToken}">
            <button type="submit" style="appearance:none; border:0; border-radius:7px; background:#1f1e26; color:#ffffff; font-weight:800; font-size:15px; padding:13px 18px; cursor:pointer;">Unsubscribe</button>
          </form>`
        : '';

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle}</title>
</head>
<body style="margin:0; background:#f8f6f3; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif; color:#1f1e26;">
  <main style="max-width:560px; margin:48px auto; padding:0 18px;">
    <section style="background:#ffffff; border:1px solid #ece6dc; border-radius:8px; overflow:hidden;">
      <div style="display:flex; height:10px;">
        <div style="background:#33aa2b; flex:1;"></div>
        <div style="background:#ffd21a; flex:1;"></div>
        <div style="background:#ff8a0a; flex:1;"></div>
        <div style="background:#f52a1d; flex:1;"></div>
        <div style="background:#3498d4; flex:1;"></div>
      </div>
      <div style="padding:30px;">
        <div style="font-size:14px; font-weight:800; color:#726b62; margin-bottom:12px;">HOMY</div>
        <h1 style="margin:0 0 12px 0; font-size:28px; line-height:1.15;">${safeTitle}</h1>
        <p style="font-size:16px; line-height:1.55; margin:0;">${safeBody}</p>
        ${form}
        <p style="font-size:13px; line-height:1.5; color:#726b62; margin:24px 0 0 0;">Changed your mind? You can always sign up again at <a href="https://homyforme.com" style="color:#1f1e26;">homyforme.com</a>.</p>
      </div>
    </section>
  </main>
</body>
</html>`;
}

function isAuthorized(req) {
    const expectedToken = expectedAuthBearerToken();

    if (!expectedToken) {
        return process.env.NODE_ENV !== 'production';
    }

    return timingSafeStringEqual(req.get('Authorization') || '', `Bearer ${expectedToken}`);
}

function expectedAuthBearerToken() {
    return (
        process.env.AUTH_API_BEARER_TOKEN ||
        process.env.GOOGLE_AUTH_BEARER_TOKEN ||
        process.env.APPLE_AUTH_BEARER_TOKEN ||
        process.env.EMAIL_AUTH_BEARER_TOKEN ||
        process.env.PHONE_OTP_BEARER_TOKEN ||
        ''
    ).trim();
}

function timingSafeStringEqual(actual, expected) {
    const actualBuffer = Buffer.from(String(actual), 'utf8');
    const expectedBuffer = Buffer.from(String(expected), 'utf8');

    if (actualBuffer.length !== expectedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function isAllowedCORSOrigin(origin) {
    const allowedOrigins = parseCSVEnv('CORS_ALLOWED_ORIGINS');

    if (allowedOrigins.length > 0) {
        return allowedOrigins.includes(origin);
    }

    const defaultOrigins = [
        'https://homyforme.com',
        'https://www.homyforme.com'
    ];

    if (process.env.NODE_ENV !== 'production') {
        defaultOrigins.push(
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:3001'
        );
    }

    return defaultOrigins.includes(origin);
}

function parseCSVEnv(name) {
    return String(process.env[name] || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
}

function normalizeAccessMode(value) {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';

    if (['create account', 'create_account', 'createaccount', 'sign up', 'sign_up', 'signup'].includes(normalized)) {
        return 'create_account';
    }

    if (['sign in', 'sign_in', 'signin', 'log in', 'log_in', 'login'].includes(normalized)) {
        return 'sign_in';
    }

    return null;
}

function normalizeProvider(value) {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';

    if (['apple', 'google', 'email', 'phone'].includes(normalized)) {
        return normalized;
    }

    return null;
}

function extractRequestedSession(body) {
    const userID = typeof body?.session_user_id === 'string' ? body.session_user_id.trim() : '';
    const sessionToken = typeof body?.session_token === 'string' ? body.session_token.trim() : '';

    if (!userID && !sessionToken) {
        return null;
    }

    return {
        userID,
        sessionToken
    };
}

function parseAllowedGoogleClientIDs() {
    const rawValue = process.env.GOOGLE_AUTH_ALLOWED_CLIENT_IDS || process.env.GOOGLE_OAUTH_CLIENT_ID || '';

    return rawValue
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
}

function parseAllowedAppleAudiences() {
    const rawValue =
        process.env.APPLE_AUTH_ALLOWED_AUDIENCES ||
        process.env.APPLE_BUNDLE_ID ||
        'com.cirett.homy';

    return rawValue
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
}

async function verifyGoogleIdToken(idToken) {
    const allowedClientIDs = parseAllowedGoogleClientIDs();

    if (allowedClientIDs.length === 0) {
        throw httpError(
            500,
            "Set GOOGLE_AUTH_ALLOWED_CLIENT_IDS before using Google auth."
        );
    }

    try {
        const ticket = await googleAuthClient.verifyIdToken({
            idToken,
            audience: allowedClientIDs
        });
        const payload = ticket.getPayload();

        if (!payload) {
            throw httpError(401, "Google Sign-In could not be verified.");
        }

        if (
            payload.iss !== 'accounts.google.com' &&
            payload.iss !== 'https://accounts.google.com'
        ) {
            throw httpError(401, "Google token issuer does not match HOMY.");
        }

        const subject = String(payload.sub || '').trim();
        const email = normalizeEmail(payload.email);
        const emailVerified = payload.email_verified === true;

        if (!subject) {
            throw httpError(401, "Google Sign-In did not include a valid subject identifier.");
        }

        if (!email || !emailVerified) {
            throw httpError(
                400,
                "Your Google account needs a verified email address to continue."
            );
        }

        return {
            sub: subject,
            email,
            emailVerified,
            givenName: cleanName(payload.given_name),
            familyName: cleanName(payload.family_name)
        };
    } catch (err) {
        if (err?.statusCode) {
            throw err;
        }

        if (err instanceof Error) {
            throw httpError(
                401,
                err.message?.trim() || "Google Sign-In could not be verified."
            );
        }

        throw err;
    }
}

async function verifyAppleIdentityToken(identityToken) {
    const segments = identityToken.split('.');
    if (segments.length !== 3) {
        throw httpError(401, "Apple Sign-In could not be verified.");
    }

    const header = decodeJWTJSONSegment(segments[0], "header");
    const payload = decodeJWTJSONSegment(segments[1], "payload");

    if (header.alg !== 'RS256' || !header.kid) {
        throw httpError(401, "Apple Sign-In could not be verified.");
    }

    const signingKeys = await fetchAppleSigningKeys();
    const signingKey = signingKeys.find((key) => key.kid === header.kid && key.kty === 'RSA');
    if (!signingKey) {
        throw httpError(401, "Apple Sign-In could not be verified.");
    }

    const publicKey = crypto.createPublicKey({
        key: signingKey,
        format: 'jwk'
    });

    const isValidSignature = crypto.verify(
        'RSA-SHA256',
        Buffer.from(`${segments[0]}.${segments[1]}`),
        publicKey,
        Buffer.from(segments[2], 'base64url')
    );

    if (!isValidSignature) {
        throw httpError(401, "Apple Sign-In could not be verified.");
    }

    if (payload.iss !== 'https://appleid.apple.com') {
        throw httpError(401, "Apple token issuer does not match HOMY.");
    }

    const allowedAudiences = parseAllowedAppleAudiences();
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.some((audience) => allowedAudiences.includes(String(audience || '').trim()))) {
        throw httpError(401, "Apple token audience does not match HOMY.");
    }

    const expiry = Number(payload.exp || 0);
    if (!Number.isFinite(expiry) || expiry <= Math.floor(Date.now() / 1000)) {
        throw httpError(401, "Apple Sign-In has expired. Try again.");
    }

    const subject = String(payload.sub || '').trim();
    if (!subject) {
        throw httpError(401, "Apple Sign-In did not include a valid subject identifier.");
    }

    const email = normalizeEmail(payload.email);
    const emailVerified = payload.email_verified === true || payload.email_verified === 'true';

    return {
        sub: subject,
        email: email || null,
        emailVerified
    };
}

async function readAuthStore() {
    try {
        const raw = await fs.readFile(authStorePath, 'utf8');
        const parsed = JSON.parse(raw);

        return {
            users: Array.isArray(parsed.users) ? parsed.users : []
        };
    } catch (err) {
        if (err.code === 'ENOENT') {
            return { users: [] };
        }

        throw err;
    }
}

async function writeAuthStore(store) {
    await fs.mkdir(path.dirname(authStorePath), { recursive: true });
    const tempPath = `${authStorePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
    const serializedStore = `${JSON.stringify(store, null, 2)}\n`;

    await fs.writeFile(tempPath, serializedStore, 'utf8');
    await fs.rename(tempPath, authStorePath);
}

async function updateAuthStore(mutator) {
    const operation = authStoreMutationQueue
        .catch(() => undefined)
        .then(async () => {
            const store = await readAuthStore();
            const result = await mutator(store);
            await writeAuthStore(store);
            return result;
        });

    authStoreMutationQueue = operation.then(
        () => undefined,
        () => undefined
    );

    return operation;
}

function findUserByGoogleSubject(users, subject) {
    return users.find((user) => user.providers?.google?.sub === subject);
}

function findUserByAppleSubject(users, subject) {
    return users.find((user) => user.providers?.apple?.sub === subject);
}

function findUserByEmail(users, email) {
    return users.find((user) => normalizeEmail(user.email) === email);
}

function findUserByPhoneNumber(users, phoneNumber) {
    return users.find((user) => normalizePhoneNumber(user.phoneNumber) === phoneNumber);
}

function findUserIndexForGoogleProfile(users, profile) {
    return users.findIndex((user) => {
        if (user.providers?.google?.sub === profile.sub) {
            return true;
        }

        if (!profile.email) {
            return false;
        }

        return normalizeEmail(user.email) === profile.email;
    });
}

function findUserIndexBySessionToken(users, userID, sessionToken) {
    const tokenHash = hashSessionToken(sessionToken);

    return users.findIndex((user) => {
        if (user.id !== userID) {
            return false;
        }

        return Array.isArray(user.sessionTokens) &&
            user.sessionTokens.some((session) => session?.tokenHash === tokenHash);
    });
}

function resolveSessionUser(users, requestedSession, invalidSessionMessage) {
    if (
        !requestedSession ||
        !requestedSession.userID ||
        !requestedSession.sessionToken
    ) {
        return null;
    }

    const userIndex = findUserIndexBySessionToken(
        users,
        requestedSession.userID,
        requestedSession.sessionToken
    );

    if (userIndex === -1) {
        throw httpError(401, invalidSessionMessage);
    }

    const user = users[userIndex];
    touchSessionToken(user, requestedSession.sessionToken);
    return user;
}

function requireSessionUser(users, requestedSession, missingSessionMessage) {
    const user = resolveSessionUser(users, requestedSession, missingSessionMessage);
    if (!user) {
        throw httpError(401, missingSessionMessage);
    }
    return user;
}

function ensureMatchedUsersBelongToLinkedUser(linkedUser, matchedUsers, message) {
    if (!linkedUser) {
        return;
    }

    const hasConflict = matchedUsers.some((matchedUser) => matchedUser?.id && matchedUser.id !== linkedUser.id);
    if (hasConflict) {
        throw httpError(409, message);
    }
}

function createUserFromGoogleProfile(profile) {
    const timestamp = new Date().toISOString();

    return {
        id: `usr_${crypto.randomUUID()}`,
        firstName: profile.givenName,
        lastName: profile.familyName,
        email: profile.email,
        phoneNumber: null,
        isEmailVerified: true,
        isPhoneVerified: false,
        providers: {
            google: {
                sub: profile.sub,
                email: profile.email
            }
        },
        createdAt: timestamp,
        updatedAt: timestamp,
        lastAuthenticatedAt: timestamp
    };
}

function createUserFromAppleProfile(profile, requestProfile = {}) {
    const timestamp = new Date().toISOString();

    return {
        id: `usr_${crypto.randomUUID()}`,
        firstName: requestProfile.firstName || null,
        lastName: requestProfile.lastName || null,
        email: profile.email || requestProfile.email || null,
        phoneNumber: null,
        isEmailVerified: Boolean(profile.emailVerified && (profile.email || requestProfile.email)),
        isPhoneVerified: false,
        providers: {
            apple: {
                sub: profile.sub,
                email: profile.email || requestProfile.email || null
            }
        },
        createdAt: timestamp,
        updatedAt: timestamp,
        lastAuthenticatedAt: timestamp
    };
}

function createUserFromEmail(profile) {
    const timestamp = new Date().toISOString();

    return {
        id: `usr_${crypto.randomUUID()}`,
        firstName: profile.firstName || null,
        lastName: null,
        email: profile.email,
        phoneNumber: null,
        isEmailVerified: false,
        isPhoneVerified: false,
        providers: {
            email: {}
        },
        createdAt: timestamp,
        updatedAt: timestamp,
        lastAuthenticatedAt: timestamp
    };
}

function createUserFromPhone(profile) {
    const timestamp = new Date().toISOString();

    return {
        id: `usr_${crypto.randomUUID()}`,
        firstName: null,
        lastName: null,
        email: null,
        phoneNumber: profile.phoneNumber,
        isEmailVerified: false,
        isPhoneVerified: true,
        providers: {
            phone: {
                phoneNumber: profile.phoneNumber
            }
        },
        createdAt: timestamp,
        updatedAt: timestamp,
        lastAuthenticatedAt: timestamp
    };
}

function linkGoogleIdentity(user, profile) {
    user.firstName = user.firstName || profile.givenName || null;
    user.lastName = user.lastName || profile.familyName || null;
    user.email = user.email || profile.email;
    user.isEmailVerified = true;
    user.providers = user.providers || {};

    if (user.providers.google?.sub && user.providers.google.sub !== profile.sub) {
        throw httpError(
            409,
            "This Google account is already linked differently. Use the original sign-in method first."
        );
    }

    user.providers.google = {
        sub: profile.sub,
        email: profile.email
    };
    user.updatedAt = new Date().toISOString();
}

function linkAppleIdentity(user, profile, requestProfile = {}) {
    user.firstName = user.firstName || requestProfile.firstName || null;
    user.lastName = user.lastName || requestProfile.lastName || null;
    user.email = user.email || profile.email || requestProfile.email || null;
    user.isEmailVerified = user.isEmailVerified || Boolean(profile.emailVerified && (profile.email || requestProfile.email));
    user.providers = user.providers || {};

    if (user.providers.apple?.sub && user.providers.apple.sub !== profile.sub) {
        throw httpError(
            409,
            "This Apple account is already linked differently. Use the original sign-in method first."
        );
    }

    user.providers.apple = {
        sub: profile.sub,
        email: profile.email || requestProfile.email || null
    };
    user.updatedAt = new Date().toISOString();
}

function linkEmailIdentity(user, profile) {
    user.firstName = user.firstName || profile.firstName || null;
    user.email = profile.email;
    user.isEmailVerified = Boolean(user.isEmailVerified);
    user.providers = user.providers || {};
    user.providers.email = {
        ...(user.providers.email || {}),
        passwordHash: hashPassword(profile.password),
        isVerified: Boolean(user.isEmailVerified)
    };
    user.updatedAt = new Date().toISOString();
}

function linkPhoneIdentity(user, profile) {
    user.phoneNumber = profile.phoneNumber;
    user.isPhoneVerified = true;
    user.providers = user.providers || {};
    user.providers.phone = {
        phoneNumber: profile.phoneNumber
    };
    user.updatedAt = new Date().toISOString();
}

function unlinkProvider(user, provider) {
    user.providers = user.providers || {};
    delete user.providers[provider];

    if (provider === 'phone') {
        user.phoneNumber = null;
        user.isPhoneVerified = false;
    }

    if (provider === 'email') {
        const hasProviderManagedEmail = Boolean(
            user.providers?.google?.email ||
            user.providers?.apple?.email
        );

        if (!hasProviderManagedEmail) {
            user.isEmailVerified = false;
        }
    }
}

function hasLinkedProvider(user, provider) {
    switch (provider) {
    case 'apple':
        return Boolean(user.providers?.apple?.sub);
    case 'google':
        return Boolean(user.providers?.google?.sub);
    case 'email':
        return Boolean(
            user.providers?.email?.passwordHash ||
            user.providers?.email?.magicLinkEnabled ||
            user.providers?.email?.isVerified
        );
    case 'phone':
        return Boolean(user.providers?.phone?.phoneNumber || user.phoneNumber);
    default:
        return false;
    }
}

function countLinkedProviders(user) {
    return ['apple', 'google', 'email', 'phone']
        .filter((provider) => hasLinkedProvider(user, provider))
        .length;
}

function serializeAccountSecurity(user) {
    const linkedProviderCount = countLinkedProviders(user);
    const hasPassword = Boolean(user.providers?.email?.passwordHash);

    return {
        has_password: hasPassword,
        can_change_password: hasPassword,
        linked_providers: ['apple', 'google', 'email', 'phone'].map((provider) => ({
            provider,
            is_linked: hasLinkedProvider(user, provider),
            can_unlink: linkedProviderCount > 1 && hasLinkedProvider(user, provider),
            detail: linkedProviderDetail(user, provider)
        })),
        is_email_mfa_enabled: false,
        supports_email_mfa: false,
        has_passkeys: false,
        supports_passkeys: false
    };
}

function linkedProviderDetail(user, provider) {
    switch (provider) {
    case 'apple':
        return user.providers?.apple?.email || user.email || null;
    case 'google':
        return user.providers?.google?.email || user.email || null;
    case 'email':
        return user.email || null;
    case 'phone':
        return user.phoneNumber || null;
    default:
        return null;
    }
}

function issueUserActionToken(user, type, payload = {}, expiresInMilliseconds) {
    pruneExpiredUserActionTokens(user);

    const token = crypto.randomBytes(24).toString('base64url');
    const issuedAt = new Date().toISOString();
    const tokenRecord = {
        id: `act_${crypto.randomUUID()}`,
        type,
        tokenHash: hashActionToken(token),
        createdAt: issuedAt,
        expiresAt: new Date(Date.now() + expiresInMilliseconds).toISOString(),
        consumedAt: null,
        ...payload
    };

    const existingTokens = Array.isArray(user.authActionTokens) ? user.authActionTokens : [];
    user.authActionTokens = [
        ...existingTokens.filter((record) => record?.type !== type),
        tokenRecord
    ].slice(-20);

    return token;
}

function findUserActionToken(users, type, token) {
    const tokenHash = hashActionToken(token);
    const now = Date.now();

    for (const user of users) {
        pruneExpiredUserActionTokens(user);

        const tokenRecord = (user.authActionTokens || []).find((record) => {
            if (record?.type !== type || record?.tokenHash !== tokenHash || record?.consumedAt) {
                return false;
            }

            const expiry = Date.parse(record.expiresAt || '');
            return Number.isFinite(expiry) && expiry > now;
        });

        if (tokenRecord) {
            return { user, tokenRecord };
        }
    }

    return null;
}

function markUserActionTokenConsumed(user, tokenRecord) {
    if (!Array.isArray(user.authActionTokens)) {
        return;
    }

    const matchingRecord = user.authActionTokens.find((record) => record?.id === tokenRecord?.id);
    if (matchingRecord) {
        matchingRecord.consumedAt = new Date().toISOString();
    }
}

function pruneExpiredUserActionTokens(user) {
    if (!Array.isArray(user.authActionTokens)) {
        return;
    }

    const now = Date.now();
    user.authActionTokens = user.authActionTokens.filter((record) => {
        const expiry = Date.parse(record?.expiresAt || '');
        return record?.consumedAt == null && Number.isFinite(expiry) && expiry > now;
    });
}

function serializeAuthUser(user, isNewUser, sessionToken) {
    return {
        user_id: user.id,
        session_token: sessionToken,
        first_name: user.firstName || null,
        last_name: user.lastName || null,
        email: user.email || null,
        phone_number: user.phoneNumber || null,
        is_email_verified: Boolean(user.isEmailVerified),
        is_phone_verified: Boolean(user.isPhoneVerified),
        is_new_user: isNewUser,
        account_security: serializeAccountSecurity(user)
    };
}

function normalizeEmail(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizePhoneNumber(value) {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw) {
        return '';
    }

    const digits = raw.replace(/\D/g, '');
    if (!digits) {
        return '';
    }

    if (raw.startsWith('00')) {
        return `+${digits.slice(2)}`;
    }

    if (raw.startsWith('+')) {
        return `+${digits}`;
    }

    if (digits.startsWith('0')) {
        return `+${defaultPhoneCountryCode()}${digits.replace(/^0+/, '')}`;
    }

    if (digits.startsWith(defaultPhoneCountryCode())) {
        return `+${digits}`;
    }

    return `+${digits}`;
}

function defaultPhoneCountryCode() {
    return String(process.env.PHONE_DEFAULT_COUNTRY_CODE || '49').replace(/\D/g, '') || '49';
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhoneNumber(phoneNumber) {
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    return phoneNumber.startsWith('+') && digitsOnly.length >= 8 && digitsOnly.length <= 15;
}

function cleanName(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

function issueSessionToken(user) {
    const issuedAt = new Date().toISOString();
    const token = `homy_${crypto.randomUUID()}${crypto.randomBytes(18).toString('hex')}`;
    const tokenRecord = {
        tokenHash: hashSessionToken(token),
        createdAt: issuedAt,
        lastUsedAt: issuedAt
    };

    const existingSessions = Array.isArray(user.sessionTokens) ? user.sessionTokens : [];
    user.sessionTokens = [...existingSessions, tokenRecord].slice(-10);
    return token;
}

function touchSessionToken(user, sessionToken) {
    if (!Array.isArray(user.sessionTokens)) {
        return;
    }

    const tokenHash = hashSessionToken(sessionToken);
    const matchingSession = user.sessionTokens.find((session) => session?.tokenHash === tokenHash);
    if (matchingSession) {
        matchingSession.lastUsedAt = new Date().toISOString();
    }
}

function hashSessionToken(token) {
    return crypto.createHash('sha256').update(String(token || ''), 'utf8').digest('hex');
}

function hashActionToken(token) {
    return crypto.createHash('sha256').update(String(token || ''), 'utf8').digest('hex');
}

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, passwordHash) {
    const [salt, expectedHash] = String(passwordHash || '').split(':');
    if (!salt || !expectedHash) {
        return false;
    }

    const actualHash = crypto.scryptSync(password, salt, 64);
    const expectedBuffer = Buffer.from(expectedHash, 'hex');

    if (actualHash.length !== expectedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(actualHash, expectedBuffer);
}

function buildBackendBaseURL() {
    const configuredURL = String(
        process.env.HOMY_AUTH_LINK_BASE_URL ||
        process.env.PUBLIC_BASE_URL ||
        process.env.APP_BASE_URL ||
        'https://homyforme.com'
    ).trim();

    return configuredURL.replace(/\/+$/, '');
}

function buildAppAuthCallbackURL(action, params = {}) {
    const scheme = String(process.env.HOMY_APP_URL_SCHEME || 'homy').trim() || 'homy';
    const query = new URLSearchParams({ action });

    Object.entries(params).forEach(([key, value]) => {
        if (value != null && String(value).trim() !== '') {
            query.set(key, String(value).trim());
        }
    });

    return `${scheme}://auth?${query.toString()}`;
}

function buildBrowserAuthLink(pathname, token, email) {
    const url = new URL(`/auth/email/${pathname}`, buildBackendBaseURL());
    url.searchParams.set('token', token);
    if (email) {
        url.searchParams.set('email', email);
    }
    return url.toString();
}

function maskEmailAddress(email) {
    const normalizedEmail = normalizeEmail(email);
    const [localPart, domain] = normalizedEmail.split('@');

    if (!localPart || !domain) {
        return normalizedEmail;
    }

    const visiblePrefix = localPart.slice(0, 2);
    const maskedLocalPart = `${visiblePrefix}${'*'.repeat(Math.max(1, localPart.length - visiblePrefix.length))}`;
    return `${maskedLocalPart}@${domain}`;
}

function escapeHTML(value) {
    return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

function escapeHTMLAttribute(value) {
    return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

async function sendTransactionalEmail({ to, subject, text, html }) {
    if (hasResendEmailConfig()) {
        await sendTransactionalEmailWithResend({ to, subject, text, html });
        return;
    }

    const transporter = getEmailTransporter();

    await transporter.sendMail({
        from: formatEmailSender(),
        to,
        subject,
        text,
        html
    });
}

function hasResendEmailConfig() {
    return Boolean(String(process.env.RESEND_API_KEY || '').trim());
}

async function sendTransactionalEmailWithResend({ to, subject, text, html }) {
    const apiKey = String(process.env.RESEND_API_KEY || '').trim();

    if (!apiKey) {
        throw httpError(
            500,
            "Email sending is not configured on the server yet. Add a Resend API key or SMTP credentials first."
        );
    }

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: formatEmailSender(),
            to: [to],
            subject,
            text,
            html
        })
    });

    if (response.ok) {
        return;
    }

    const errorBody = await response.text();
    throw new Error(errorBody || `Resend email request failed with status ${response.status}.`);
}

function getEmailTransporter() {
    if (emailTransporter) {
        return emailTransporter;
    }

    const host = String(process.env.SMTP_HOST || '').trim();
    const port = Number(process.env.SMTP_PORT || 587);
    const user = String(process.env.SMTP_USER || '').trim();
    const pass = String(process.env.SMTP_PASS || '').replace(/\s+/g, '');
    const secure = String(process.env.SMTP_SECURE || '').trim().toLowerCase() === 'true';

    if (!host || !user || !pass || !Number.isFinite(port) || port <= 0) {
        throw httpError(
            500,
            "Email sending is not configured on the server yet. Add SMTP credentials first."
        );
    }

    emailTransporter = nodemailer.createTransport({
        host,
        port,
        secure,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
        auth: {
            user,
            pass
        }
    });

    return emailTransporter;
}

function formatEmailSender() {
    const fromEmail = String(process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '').trim();
    const fromName = String(process.env.SMTP_FROM_NAME || 'HOMY').trim();

    if (!fromEmail) {
        throw httpError(
            500,
            "Email sending is not configured on the server yet. Add SMTP_FROM_EMAIL first."
        );
    }

    return fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
}

async function issuePhoneVerificationCode() {
    throw httpError(
        501,
        "Phone sign-in is not available in this version."
    );
}

function isPhoneAuthEnabled() {
    return String(process.env.PHONE_AUTH_ENABLED || '').trim() === '1';
}

function pruneExpiredPhoneChallenges() {
    const now = Date.now();
    for (const [challengeID, challenge] of phoneChallenges.entries()) {
        if (challenge.expiresAt <= now) {
            phoneChallenges.delete(challengeID);
        }
    }
}

async function fetchAppleSigningKeys() {
    if (appleSigningKeysCache.keys && appleSigningKeysCache.expiresAt > Date.now()) {
        return appleSigningKeysCache.keys;
    }

    const response = await axios.get('https://appleid.apple.com/auth/keys', {
        timeout: 10000
    });
    const keys = Array.isArray(response.data?.keys) ? response.data.keys : [];

    appleSigningKeysCache.keys = keys;
    appleSigningKeysCache.expiresAt = Date.now() + (60 * 60 * 1000);
    return keys;
}

function decodeJWTJSONSegment(segment, name) {
    try {
        return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
    } catch {
        throw httpError(401, `Apple Sign-In ${name} is invalid.`);
    }
}

function httpError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}
