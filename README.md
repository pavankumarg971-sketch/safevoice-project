# SafeVoice Beacon

Build a **fully functional real-time full-stack web application** called **“SafeVoice – Voice-Activated Hidden Crime Reporting System for Women Safety.”**

This is a final-year project, but **DO NOT create a static UI/demo-only website**. I need the frontend, backend, database, authentication, real-time updates, GPS location, voice activation, emergency contacts, emergency alerts, complaint reporting, notification integration, and admin dashboard to actually work.

## Technology

Use:

* React + TypeScript

* Tailwind CSS

* Supabase Authentication

* Supabase PostgreSQL

* Supabase Row Level Security

* Supabase Realtime

* Supabase Edge Functions for secure server-side operations

* Web Speech API for voice recognition

* Browser Geolocation API

* Leaflet + OpenStreetMap for maps

Do not expose private API keys in frontend code.

---

## 1. Authentication

Create real authentication with:

* Register

* Login

* Logout

* Forgot password

* Password reset

* Protected routes

* User/admin roles

Registration fields:

* Full name

* Email

* Phone number

* Password

* Confirm password

After registration, create a profile in the database.

---

## 2. User Dashboard

Create a modern responsive dashboard showing:

* User name

* Current safety status

* Active emergency alerts

* Emergency contacts count

* Complaint count

* Alert history

* Complaint status

* Recent activity

Safety status:

🟢 SAFE

When an emergency is active:

🔴 EMERGENCY ACTIVE

The dashboard must update in real time without refreshing.

---

## 3. Emergency Contacts

Create a complete Emergency Contacts page.

User can:

* Add contact

* Edit contact

* Delete contact

* Set primary contact

Fields:

* Name

* Relationship

* Phone number

* Email

* Primary contact

Contacts must be stored in Supabase PostgreSQL.

Do NOT hard-code phone numbers.

Use RLS so users can only access their own contacts.

---

## 4. Emergency Alert

Create a large button:

**🚨 SEND EMERGENCY ALERT**

When clicked:

1. Show confirmation dialog.

2. Request GPS permission.

3. Get current latitude, longitude and accuracy.

4. Create an emergency alert in Supabase.

5. Save timestamp.

6. Set status to `ACTIVE`.

7. Retrieve the user's emergency contacts.

8. Attempt to send notifications through a real notification provider.

9. Record notification status.

10. Notify the admin dashboard through Supabase Realtime.

11. Update the user's dashboard immediately.

Do NOT simply display a fake JavaScript alert.

If notification credentials are missing, show:

**“Alert saved successfully. Notification provider is not configured.”**

Never claim an SMS/email was sent if it was not actually sent.

---

## 5. Voice Activation

Create a Voice Safety page.

Display:

**VOICE SAFETY MODE**

Secret keyword:

**“help me”**

Button:

**🎙 START LISTENING**

Use:

```javascript

window.SpeechRecognition || window.webkitSpeechRecognition

```

When listening is enabled, detect the phrase:

**help me**

When detected, trigger the exact same emergency workflow:

Voice keyword

→ GPS location

→ Create alert

→ Database

→ Notification service

→ Admin real-time alert

→ User dashboard update

If the browser does not support speech recognition, clearly show:

**“Voice recognition is not supported by this browser.”**

Do not claim that a browser can continuously listen in the background when the platform does not permit it.

---

## 6. Hidden Safety Mode

Create:

**Hidden Safety Mode ON/OFF**

When enabled:

* Use a discreet interface

* Allow voice activation

* Minimize visible sensitive information

* Do not display emergency contact details unnecessarily

The user must explicitly enable microphone/listening permissions.

---

## 7. Real-Time GPS

Create a Location page.

Show:

* Location sharing status

* Latitude

* Longitude

* Accuracy

* Last updated time

Use:

```javascript

navigator.geolocation.watchPosition()

```

only after the user explicitly enables location sharing.

Do not collect location when the feature is disabled.

---

## 8. Map

Use Leaflet + OpenStreetMap.

User can view their current location.

Admin can view emergency-alert locations.

Show:

* Marker

* Latitude

* Longitude

* Alert time

* Alert status

Add an **Open in Google Maps** option using the coordinates.

---

## 9. Complaint Reporting

Create a **Report Crime / Safety Complaint** page.

Fields:

* Complaint type

* Description

* Incident date

* Incident time

* Location

* Optional evidence

Complaint types:

* Harassment

* Stalking

* Threat

* Unsafe Situation

* Domestic Violence

* Other

Generate a complaint ID such as:

`CMP-2026-0001`

Statuses:

* SUBMITTED

* UNDER_REVIEW

* IN_PROGRESS

* RESOLVED

* CLOSED

Users can only see their own complaints.

---

## 10. Admin Dashboard

Create a separate admin login and dashboard.

Admin pages:

* Overview

* Live Alerts

* Users

* Complaints

* Map

* Emergency Contacts

* Notification Logs

* Settings

Admin dashboard statistics:

* Total users

* Active alerts

* Open complaints

* Resolved alerts

---

## 11. Real-Time Admin Alerts

Use Supabase Realtime.

When a user creates an emergency alert, the admin dashboard must receive it immediately without page refresh.

Display:

**🔴 ACTIVE EMERGENCY**

* Alert ID

* User

* Time

* Latitude

* Longitude

* Location map

* Notification status

Buttons:

* Acknowledge

* Resolve

When admin acknowledges/resolves the alert, the user's dashboard must update automatically.

---

## 12. Notification System

Create a secure notification service using Supabase Edge Functions.

Support configurable SMS/email providers such as Twilio and SMTP.

Use environment/secrets for credentials.

Example:

```env

TWILIO_ACCOUNT_SID=

TWILIO_AUTH_TOKEN=

TWILIO_PHONE_NUMBER=

SMTP_HOST=

SMTP_USER=

SMTP_PASSWORD=

```

Never expose these credentials in frontend code.

Notification statuses:

* PENDING

* SENT

* FAILED

* NOT_CONFIGURED

Store notification logs in the database.

If the external provider is unavailable, still save the emergency alert and clearly show the notification failure.

---

## 13. Database

Create Supabase/PostgreSQL tables:

### profiles

* id

* user_id

* full_name

* email

* phone

* created_at

* updated_at

### emergency_contacts

* id

* user_id

* name

* relationship

* phone

* email

* is_primary

* created_at

* updated_at

### alerts

* id

* user_id

* trigger_type

* status

* created_at

* acknowledged_at

* resolved_at

### alert_locations

* id

* alert_id

* latitude

* longitude

* accuracy

* created_at

### complaints

* id

* user_id

* complaint_number

* type

* description

* incident_date

* incident_time

* location

* status

* created_at

* updated_at

### notification_logs

* id

* alert_id

* contact_id

* notification_type

* recipient

* status

* provider_message_id

* error_message

* created_at

### admin_profiles

* id

* user_id

* role

* created_at

---

## 14. Security

Implement:

* Supabase Auth

* Row Level Security

* Protected routes

* Admin role authorization

* Server-side validation

* Input validation

* Secure secrets

* No private keys in frontend

* No hard-coded passwords

* No hard-coded emergency contacts

* No sensitive data stored only in localStorage

Users must only access their own:

* Profile

* Contacts

* Alerts

* Complaints

Admins can access authorized administrative data.

---

## 15. UI Design

Make it look like a professional real-world women-safety application.

Colors:

* Pink `#E91E63`

* Dark pink `#C2185B`

* Emergency red `#D32F2F`

* Background `#FFF7FA`

* Dark `#24151B`

* Success green `#168A62`

Use:

* Modern cards

* Rounded corners

* Shadows

* Smooth animations

* Professional icons

* Responsive navigation

* Mobile-first design

* Accessible buttons

* Toast notifications

* Loading states

* Error states

* Confirmation dialogs

---

## 16. Mobile

The entire application must work properly on:

* Android

* iPhone

* Tablet

* Desktop

Optimize the emergency button and voice controls for mobile.

No horizontal scrolling.

---

## 17. Important Real-Time Workflow

This exact workflow must work:

**REGISTER**

↓

**LOGIN**

↓

**ADD EMERGENCY CONTACT**

↓

**ENABLE VOICE SAFETY**

↓

**SAY “HELP ME”**

↓

**GET GPS LOCATION**

↓

**CREATE EMERGENCY ALERT**

↓

**SAVE TO SUPABASE**

↓

**NOTIFY EMERGENCY CONTACTS**

↓

**ADMIN RECEIVES REAL-TIME ALERT**

↓

**ADMIN ACKNOWLEDGES**

↓

**USER DASHBOARD UPDATES**

↓

**ADMIN RESOLVES**

↓

**USER SEES RESOLVED STATUS**

The manual emergency button must use the same workflow.

---

## 18. Demo Mode

Add a clearly labelled **DEMO MODE** for final-year project presentations.

Demo mode may simulate external SMS/email delivery, but the UI must clearly say:

**“DEMO — Notification simulated.”**

Do not mix simulated notifications with real notifications.

Database, authentication, GPS, alerts and real-time dashboard functionality should still work.

---

## 19. Error Handling

Implement proper errors.

GPS denied:

> Location permission denied. Enable location permission to include your current location.

Backend unavailable:

> Unable to connect to SafeVoice server.

Notification unavailable:

> Alert saved successfully, but notification delivery failed or is not configured.

Voice unavailable:

> Voice recognition is not supported by this browser.

---

## 20. Final Requirement

DO NOT stop at the UI.

I need a **complete connected full-stack application**.

Do not use fake hard-coded data as the main system.

Do not use localStorage as the database.

Do not create fake API responses.

Do not claim SMS was sent unless the provider confirms it.

Implement:

* Frontend

* Supabase database

* Authentication

* RLS policies

* Emergency contacts

* GPS

* Voice recognition

* Emergency alerts

* Real-time admin dashboard

* Complaint reporting

* Maps

* Notification integration

* Notification logs

* Admin controls

* Mobile responsive UI

After building, verify that the complete user → emergency alert → database → notification → admin → resolution workflow works end-to-end.

Also generate setup instructions explaining exactly what Supabase configuration, environment variables, notification-provider credentials, microphone permissions and location permissions are required.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://safety-voice-guardian.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e1f45e3c-7739-4e9a-9f5a-37ce14c648ae).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
