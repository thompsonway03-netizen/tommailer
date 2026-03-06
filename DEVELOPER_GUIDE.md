# tommailer v.9ja01 - Developer & Sales Guide

This guide explains how to package, sell, and manage licenses for **tommailer v.9ja01**.

## 1. How to Package as a Standalone PC App (.exe)

Since the app is built with React and Node.js, the best way to turn it into a standalone Windows application is using **Electron**.

### Steps:
1. **Install Electron**: Add Electron to your project (`npm install electron`).
2. **Main Process**: Create a `main.js` file that loads your built React app.
3. **Build**: Use `electron-builder` to package the app into a single `.exe` file.
4. **Offline Mode**: Ensure the app points to your **Live Licensing Server URL** (see below) instead of `localhost`.

---

## 2. Setting Up the Licensing Server

For the serial keys to work globally, the backend (the `server.ts` logic) must be hosted on a live server (e.g., a VPS, Heroku, or Google Cloud).

1. **Host the API**: Deploy the backend code.
2. **Update Client URL**: In `src/App.tsx`, change all `fetch("/api/...")` calls to `fetch("https://your-api-domain.com/api/...")`.
3. **Database**: Keys are stored in `licensing.json`.
   - Local/Electron: `%USERPROFILE%\\.tommailer\\licensing.json`
   - Vercel serverless: `/tmp/licensing.json` (ephemeral, not persistent across cold starts/redeploys)

---

## 3. How to Generate Serial Keys for Users

You (the developer) have a hidden endpoint to generate keys.

### Method A: Using the built-in Admin API
You can send a POST request to your live server to generate 10 new keys at a time:
- **Endpoint**: `POST https://your-api-domain.com/api/admin/generate`
- **Result**: 10 new 10-character keys will be added to the database.

### Method B: Manual Database Entry
You can open `%USERPROFILE%\\.tommailer\\licensing.json` and manually add keys as JSON objects using:
- `serial_key` (string)
- `is_active` (boolean)
- `hwid_locked_to` (string or `null`)

---

## 4. Selling the App (The Workflow)

1. **User Buys**: User pays you for a license.
2. **Give Key**: You pick an unused key from your database and send it to the user.
3. **User Activates**: The user opens **tommailer**, enters the key.
4. **HWID Lock**: The app sends the user's unique PC ID to your server. The server "locks" that key to that specific PC.
5. **Security**: If the user tries to use the same key on a second PC, the server will return "Serial already in use."

---

## 5. Releasing a License (Support)

If a user gets a new PC, they can click **"Deactivate"** inside the app settings. This clears the HWID on your server, allowing them to use the key on their new machine.

---

## 7. Automated Sales & Key Distribution

To sell the app and have keys sent automatically, follow this "Hands-Off" workflow:

### Step 1: Choose a Platform
Use **Lemon Squeezy** or **Gumroad**. These platforms allow you to sell digital products and trigger actions after a sale.

### Step 2: Set up a Webhook Endpoint
In your `server.ts`, I have already prepared the logic. You would add a new route like `/api/webhooks/purchase`. 

### Step 3: The Automation Logic
1. User pays on the platform.
2. The platform sends a POST request to your `/api/webhooks/purchase` endpoint.
3. Your code:
   ```ts
   // Example Logic
   const newKey = generateSingleKey(); // Create the key
   sendEmailToUser(userEmail, newKey); // Send it to them
   ```

### Step 4: Using "License Keys" Feature
Most platforms have a "License Keys" feature. You can:
1. Generate 1,000 keys using the **Developer Console** I built for you.
2. Export them from `%USERPROFILE%\\.tommailer\\licensing.json` as CSV.
3. Upload that CSV to Lemon Squeezy.
4. Lemon Squeezy will automatically "give away" one unique key from your list to every person who buys the app.

---

## 8. Final Checklist for Launch
1. [ ] **Host the Server**: Deploy this code to a live URL (e.g., `https://api.tommailer.com`).
2. [ ] **Update Client**: Ensure `App.tsx` points to your live URL.
3. [ ] **Package**: Create the `.exe` using Electron.
4. [ ] **Upload**: Post your `.exe` on your sales page.
5. [ ] **Keys**: Upload your pre-generated keys to the sales platform.
