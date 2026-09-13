# Custom Domain & SSL Guide: www.littledaysout.com

This document diagnoses and resolves the `unsecure` / SSL warning for **`www.littledaysout.com`** and provides instructions for configuring the apex domain **`littledaysout.com`**.

---

## 1. Diagnosis & Root Cause

### A. What caused the "Not Secure" warning in the browser?

1. **DNS & Certificate Provisioning Delay**:
   - When a custom domain (`www.littledaysout.com`) is pointed to Railway via CNAME (`p3nkhkwb.up.railway.app.`), Railway's edge router automatically initiates an ACME challenge with **Let's Encrypt** to issue a TLS/SSL certificate.
   - While DNS is propagating and Let's Encrypt is validating the challenge (typically 5–20 minutes), requests over HTTPS fail or browsers fall back to plain HTTP (`http://www.littledaysout.com`), triggering Chrome/Safari's **"Not Secure"** warning.

2. **Current Certificate Status (Verified)**:
   - Railway has successfully provisioned the Let's Encrypt SSL certificate for `www.littledaysout.com`:
     - **Subject**: `CN=www.littledaysout.com`
     - **Issuer**: `Let's Encrypt (YR1)`
     - **Valid until**: `Dec 12, 2026`
     - **Status**: Active and verified (`curl -Iv https://www.littledaysout.com` succeeds with HTTP/2 200).

3. **Apex Domain (`littledaysout.com`) Missing DNS Record**:
   - Currently, `www.littledaysout.com` has a CNAME record pointing to Railway.
   - However, `littledaysout.com` (without `www.`) has **no DNS records** configured at the registrar (Squarespace Domains), resulting in `Could not resolve host: littledaysout.com`.

---

## 2. In-App Enforcements Applied

To ensure all visitors are forced to use secure HTTPS and eliminate any "Not Secure" browser states:

1. **HSTS (HTTP Strict Transport Security)**:
   - Added `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` header in `next.config.mjs`.
   - Tells all modern browsers to strictly use HTTPS for 2 years, even if a user explicitly types `http://`.
2. **Security Headers**:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: SAMEORIGIN`
   - `Referrer-Policy: strict-origin-when-cross-origin`
3. **Zero Insecure Mixed-Content**:
   - All assets, scripts (Google Analytics), fonts, and map basemap tiles use strict `https://`.

---

## 3. Action Required: Configure Apex Domain Forwarding in Squarespace Domains

Because `littledaysout.com` is registered at Squarespace Domains (formerly Google Domains), visitors who type `littledaysout.com` without `www.` must be forwarded to `https://www.littledaysout.com`.

### Step-by-Step Forwarding Setup:

1. Log into your **Squarespace Domains** account (`https://account.squarespace.com/domains`).
2. Select your domain: **`littledaysout.com`**.
3. In the left navigation, click **Website** (or **Domain Forwarding** / **URL Redirect**):
   - **Forward From**: `littledaysout.com` (root / apex)
   - **Forward To**: `https://www.littledaysout.com`
   - **Redirect Type**: `301 (Permanent Redirect)`
   - **Forward Path**: `Enabled` (matches URLs like `/events` -> `https://www.littledaysout.com/events`)
   - **SSL**: `Enabled` (automatically provisioned by Squarespace for the redirect)
4. Save the configuration.

### Alternative (Adding Apex Domain in Railway):
If you prefer Railway to manage both:
1. In Railway Project Settings → Networking → Custom Domains:
   - Add `littledaysout.com` (in addition to `www.littledaysout.com`).
2. Railway will display an **ALIAS / ANAME** or dedicated **A record IP address**.
3. In Squarespace DNS settings, add the provided record for `@`.

---

## 4. How to Verify

1. **Test `www` subdomain**:
   ```bash
   curl -sI https://www.littledaysout.com/
   ```
   Should return `HTTP/2 200` with `strict-transport-security`.

2. **Test HTTP to HTTPS redirect**:
   ```bash
   curl -sI http://www.littledaysout.com/
   ```
   Should return `HTTP/1.1 301 Moved Permanently` with `Location: https://www.littledaysout.com/`.

3. **In the browser**:
   - Visit `https://www.littledaysout.com`.
   - Click the padlock icon in the URL bar — it will show **"Connection is secure"** and certificate details issued by **Let's Encrypt**.
