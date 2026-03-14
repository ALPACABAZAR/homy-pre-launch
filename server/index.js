import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy is required if running behind a reverse proxy (like Railway, Heroku, Nginx)
// so the rate limiter correctly identifies the client's IP instead of the proxy's IP.
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

// Apply rate limiting to API endpoints to prevent Google Sheets spam
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: { error: "Too many requests from this IP, please try again after 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply only to data submission endpoints
app.use('/api/', apiLimiter);

// Initialize Google Sheets
// We will need process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
// and process.env.GOOGLE_PRIVATE_KEY
// and process.env.GOOGLE_SHEET_ID
async function appendToSheet(data) {
    if (!process.env.GOOGLE_SHEET_ID) {
        console.warn("No Google Sheet ID provided. Skipping sheet append.");
        return;
    }

    try {
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);

        // Auth
        await doc.useServiceAccountAuth({
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });

        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];

        await sheet.addRow(data);
    } catch (error) {
        console.error("Error appending to Google Sheet:", error);
        throw error;
    }
}

app.post('/api/waitlist', async (req, res) => {
    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required" });
    }

    try {
        await appendToSheet({
            Type: 'Waitlist',
            Name: name,
            Email: email,
            Comment: '',
            Date: new Date().toISOString()
        });
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to save waitlist entry" });
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
        res.status(500).json({ error: "Failed to save comment entry" });
    }
});

// Serve static frontend
app.use(express.static(path.join(__dirname, '../dist')));

app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Backend attached and running on port ${PORT}`);
});
