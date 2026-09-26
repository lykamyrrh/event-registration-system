# Aurum Registry - No-Code Multi-Event Registration System

**Aurum Registry** is an intuitive, code-free registration management platform designed with an elegant **Blue & Gold** aesthetic. Create, customize, manage, and archive pre-registration and registration sites for any occasion in seconds.

---

## ✨ Features Included

1. **🎨 Ready-to-Use Templates**:
   - **Product Launch & VIP Pre-Registration** (Waitlists & Early Bird Passes)
   - **Executive Summit & Conference Registration** (Multi-track passes & swag sizes)
   - **Hands-On Masterclass & Workshop Signup** (Track choices & laptop requirements)
   - **Gala Dinner & Award Night RSVP** (Entrée choices & +1 guest details)

2. **🛠️ No-Code Visual Form Builder**:
   - Add/Remove fields (Text, Email, Phone, Select Dropdown, Radio, Checkbox, Date, Textarea).
   - Live real-time preview mode before publishing.
   - Customize header titles, event date, location, submit button text, and success message.

3. **📊 Submissions & Filterable Data Tables**:
   - Search across all registrant data fields.
   - Filter by status (*Confirmed*, *Checked-In*, *Pending*, *Cancelled*) or event occasion.
   - Precise timestamps (`submitted_at`, `created_at`, `last_used_at`).
   - 1-Click CSV data export for Excel / Sheets.

4. **📁 Archive & History Vault**:
   - Archive completed events while preserving historical registrant records.
   - System audit activity timeline log.
   - 1-Click "Restore to Active" functionality.

5. **⚡ Supabase Database & Vercel Deployment**:
   - Seamless dual-mode: Works out of the box with local storage sync, or connect to your live Supabase project in 1 click.
   - Includes 1-Click copy for the complete Supabase SQL DDL Schema script.
   - Deployment ready for Vercel with included `vercel.json`.

6. **🤖 RegiAI System Assistant**:
   - Interactive sliding drawer with walkthrough guidance.
   - **AI Form Generator**: Prompt the AI (e.g. *"Build a Hackathon registration form"*) and it auto-drafts the site structure!
   - Stats summary and Vercel/Supabase deployment helper.

---

## 🚀 Quick Start Guide

### 1. Run Locally
```bash
# Navigate to project folder
cd C:\Users\User\.gemini\antigravity\scratch\event-registration-system

# Install dependencies
npm install

# Start local dev server
npm run dev
```

### 2. Deploy Live to Vercel
1. Push this project folder to your GitHub repository.
2. Go to [Vercel.com](https://vercel.com) and import the repository.
3. Click **Deploy** — Vercel will automatically build the project!

### 3. Connect Supabase (Optional)
1. Open the **Supabase Config** tab in the top navigation bar of Aurum Registry.
2. Copy the **1-Click SQL Script** into your Supabase SQL Editor and execute.
3. Enter your `SUPABASE_URL` and `SUPABASE_ANON_KEY` to sync live database records.

---

## 🎨 Theme Palette
- **Primary Backdrop**: Deep Royal Navy (`#070D19`, `#0F172A`)
- **Accent & Glow**: Radiant Gold (`#EAB308`, `#F59E0B`, `#FBBF24`, `#FEF3C7`)
- **Glassmorphism**: Glass panels with gold glow borders & blur backdrops
