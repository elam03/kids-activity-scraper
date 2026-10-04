# Setup Guide: Google Cloud Console OAuth for Localhost & Railway

**Ticket**: `kids-activity-scraper-855.4`  
**GitHub Issue**: [#31 (Feature: User authentication login)](https://github.com/elam03/kids-activity-scraper/issues/31)  
**Parent Map**: `kids-activity-scraper-855`  
**Date**: October 2026  
**Status**: Decided

---

## 1. Google Cloud Console Configuration Checklist

Follow these exact steps in [Google Cloud Console](https://console.cloud.google.com/):

### Step 1: Create or Select Project
- Project Name: `Little Days Out` (or reuse existing Google Analytics project).

### Step 2: Configure OAuth Consent Screen
1. Go to **APIs & Services** > **OAuth consent screen**.
2. Select **External** > Click **Create**.
3. **App information**:
   - App name: `Little Days Out`
   - User support email: `[admin email]`
4. **App domain**:
   - Application home page: `https://www.littledaysout.com`
   - Authorized domains: `littledaysout.com`, `railway.app`
5. **Scopes**:
   - Select `.../auth/userinfo.email`
   - Select `.../auth/userinfo.profile`
   - Select `openid`
6. Click **Save and Continue** (In testing mode, add test user emails if unverified; or submit for production verification).

### Step 3: Create OAuth 2.0 Web Client Credentials
1. Go to **APIs & Services** > **Credentials**.
2. Click **Create Credentials** > **OAuth client ID**.
3. Application type: **Web application**.
4. Name: `Little Days Out Web Client`.
5. **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   http://localhost
   https://www.littledaysout.com
   https://littledaysout.com
   https://kids-activity-scraper.up.railway.app
   ```
   *(Important: Google One Tap checks the window.location.origin against this list; requests from unlisted origins are blocked by CORS with a 400 origin_mismatch error).*
6. **Authorized redirect URIs**:
   ```
   http://localhost:3000/api/auth/google/callback
   https://www.littledaysout.com/api/auth/google/callback
   https://littledaysout.com/api/auth/google/callback
   ```
7. Click **Create** and copy your **Client ID** and **Client Secret**.

---

## 2. Environment Variables Configuration

### Local Environment (`.env.local`)
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID="1234567890-abcdefg.apps.googleusercontent.com"
GOOGLE_CLIENT_ID="1234567890-abcdefg.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxxxxxx"
AUTH_SECRET="use_openssl_rand_hex_32_to_generate_a_secure_token"
```

### Railway Production Environment
In Railway Dashboard > Project > Service > **Variables**:
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: (Same Client ID)
- `GOOGLE_CLIENT_ID`: (Same Client ID)
- `GOOGLE_CLIENT_SECRET`: (Client Secret)
- `AUTH_SECRET`: (Production 32-character random string)

---

## 3. Verification & Testing Procedure
1. Run local dev: `npm run dev` and navigate to `http://localhost:3000`.
2. Ensure the Google Identity Services script loads with zero console warnings (`gsi/client`).
3. Verify that One Tap prompt displays without `origin_mismatch`.
