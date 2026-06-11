# HOMY Web

Public website and lightweight backend for `homyforme.com`.

## Launch Settings

Set these in Railway before public launch:

```text
VITE_APP_STORE_URL=https://apps.apple.com/de/app/homy-rent-and-swap/id6766799894?l=en-GB
VITE_LEGAL_SERVICE_ADDRESS=Your complete serviceable postal address
VITE_LEGAL_SERVICE_ADDRESS_DE=Ihre vollständige ladungsfähige Anschrift
```

If `VITE_APP_STORE_URL` is empty, the App Store button falls back to HOMY's public App Store listing.

## Local Commands

```bash
npm install
npm run lint
npm run build
npm run dev
```
