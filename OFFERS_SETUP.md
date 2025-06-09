# Offers System Setup

This guide explains how to set up the offers system that allows users to create professional offers in PDF format and send them via email.

## Features

- ✅ Create professional offers with client details
- ✅ Add multiple items/services with quantities and pricing
- ✅ Automatic tax calculation (25% VAT)
- ✅ Generate PDF offers for download
- ✅ Send offers via email with PDF attachment
- ✅ Beautiful responsive form interface
- ✅ Professional email templates
- ✅ Uses Supabase SMTP configurations (user-specific)
- ✅ Dynamic company branding from database

## SMTP Configuration

The system uses SMTP configurations stored in your Supabase database. Each user can have their own SMTP settings configured in the `smtp_configurations` table.

### Setting up SMTP in Database

Make sure you have SMTP configuration set up in your Supabase database:

1. Go to your Supabase dashboard
2. Navigate to the `smtp_configurations` table
3. Add a new configuration with:
   - `user_id`: Your user ID
   - `host`: SMTP server (e.g., smtp.gmail.com)
   - `port`: SMTP port (587 for TLS, 465 for SSL)
   - `username`: Your email username
   - `password_encrypted`: Base64 encoded password
   - `from_email`: Your from email address
   - `from_name`: Your from name (optional)
   - `is_active`: true

### Password Encryption

Passwords are stored as base64 encoded strings. To encode your password:
```bash
echo -n "your-password" | base64
```

### Gmail Setup

If using Gmail:
1. Enable 2-factor authentication
2. Generate an App Password: [Google Account Settings](https://myaccount.google.com/apppasswords)
3. Use the app password (base64 encoded) as `password_encrypted`

### Other Email Providers

Common SMTP settings for different providers:

**Gmail:**
- Host: `smtp.gmail.com`
- Port: `587` (TLS) or `465` (SSL)
- Use TLS: `true`

**Outlook/Hotmail:**
- Host: `smtp-mail.outlook.com`
- Port: `587`
- Use TLS: `true`

**Yahoo:**
- Host: `smtp.mail.yahoo.com`
- Port: `587`
- Use TLS: `true`

## Usage

1. Navigate to `/offers/create` in your application
2. Fill in the offer details and client information
3. Add items/services with quantities and pricing
4. Either:
   - Click "Generate PDF" to download the offer
   - Click "Send Offer" to email it to the client

## Customization

### Company Information

Company information is automatically pulled from your Supabase `companies` table. Make sure your user profile is linked to a company record with:
- `name`: Company name
- `address`: Full company address
- `phone`: Company phone number

This information will be automatically used in PDFs and email signatures.

### Tax Rate

The default VAT rate is 25%. To change it, update the `calculateTax()` function in:
- `src/components/OfferForm.tsx`

### Email Template

Customize the email template in:
- `src/app/api/send-offer/route.ts` (emailHtml variable)

## File Structure

```
src/
├── app/
│   ├── offers/
│   │   └── create/
│   │       └── page.tsx          # Offer creation page
│   └── api/
│       ├── generate-offer-pdf/
│       │   └── route.ts           # PDF generation endpoint
│       └── send-offer/
│           └── route.ts           # Email sending endpoint
└── components/
    └── OfferForm.tsx             # Main offer form component
```

## Dependencies

The system uses these packages:
- `jspdf` - PDF generation
- `nodemailer` - Email sending
- `@types/jspdf` - TypeScript types

All dependencies are automatically installed when you run `npm install`. 