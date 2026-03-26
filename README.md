<div align="center">

# MindAssist Web

**Marketing Website & Specialist Management Portal**

A scroll-driven marketing landing page and full-featured specialist portal for MindAssist — Sri Lanka's first tri-lingual mental health platform. Built with Next.js 16, React 19, and Framer Motion, featuring animated mesh gradients, glassmorphic UI, real-time Firestore integration, and LiveKit-powered video consultations with E2EE support.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Firebase](https://img.shields.io/badge/Firebase-Hosting_+_Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![LiveKit](https://img.shields.io/badge/LiveKit-WebRTC-1F1F1F?logo=webrtc&logoColor=white)](https://livekit.io)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-12-0055FF?logo=framer&logoColor=white)](https://motion.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## Overview

MindAssist Web serves two distinct audiences from a single Next.js application:

1. **Public Marketing Site** — A cinematic, scroll-driven landing page that communicates Sri Lanka's mental health crisis through data-driven storytelling and positions MindAssist as the solution. Features animated mesh gradients, parallax scroll scenes, glassmorphic feature cards, a competitive analysis table, investor pitch section, and team showcase.

2. **Specialist Portal** — A secure, authenticated dashboard where licensed mental health professionals manage their practice — from onboarding and availability scheduling to live video consultations, patient records, session notes, and income analytics.

### Key Highlights

- **Scroll-Driven Storytelling** — Multi-scene parallax narrative powered by Framer Motion `useScroll` + `useTransform`, transforming scroll position into cinematic data visualizations
- **LiveKit Video Consultations** — WebRTC calls with custom glassmorphic UI, E2EE negotiation, active speaker detection, data-channel ephemeral chat, and post-call rating
- **Real-Time Firestore Streams** — Live appointment updates, session notifications, and patient data across the portal
- **3-Step Specialist Onboarding** — Progressive disclosure wizard with SLMC registration validation, qualification tagging, and practice configuration
- **Income Analytics** — Recharts-powered earnings dashboard with commission breakdown (70/30 specialist/platform split)
- **Anonymous Patient Mode** — Pseudonym + avatar system preserving patient privacy during consultations

---

## Features — Marketing Site

### Animated Hero
Full-viewport landing with three animated mesh gradient blobs (violet, cyan, fuchsia) on 15–25 second staggered animation loops. Headline: "Peace of mind. In your language." with Framer Motion entrance choreography.

### Crisis Narrative
Scroll-triggered multi-scene section: "22 Million People. A Handful of Experts." — animated progress bars visualize Sri Lanka's psychiatrist-to-population ratio, sequential tri-lingual text reveals (English → Sinhala → Tamil), and parallax width/blur/opacity interpolations tied to scroll position.

### Feature Showcase
Glass-morphic card grid with colored glows presenting core app capabilities: Tri-Lingual Intelligence, Precision Screening, Modified CBT, Gratitude Journal, AI Companion, and Emergency Protocol. Spring-physics hover animations.

### Competitive Analysis
Verdict table comparing MindAssist against generic mental health apps across four dimensions: Language Access, Crisis Response, Cultural Fit, and Barrier to Entry.

### Investor Pitch
Foundational advisor testimonial (Dr. Ravimal), seed round messaging, and pitch deck request CTA.

### Team Showcase
Six team member cards with profile photos and LinkedIn links, positioned under "Forged in Code. Driven by Empathy." with IIT / University of Westminster branding.

---

## Features — Specialist Portal

### Authentication & Onboarding
Google OAuth 2.0 sign-in with Firestore specialist lookup. New specialists complete a 3-step registration wizard: personal info (with SLMC number validation), qualifications and specializations, and practice details (fee, consultation types, emergency on-call toggle).

### Real-Time Dashboard
Welcome hub with session notification banners (15-minute approach window), active call indicators, 4-column stats grid (total/upcoming/completed appointments + average rating), upcoming appointment cards, and total earnings summary.

### Video Consultations
LiveKit WebRTC calls with custom glassmorphic theme — participant tiles, mic/camera/speaker toggles, active speaker pulse animation, call timer, connection quality indicator, and iMessage-style data-channel chat (violet gradient bubbles for local, translucent white for remote). E2EE negotiation before call establishment. Post-call rating system.

### Availability Management
Calendar-based slot editor with 30-minute intervals. Quick presets (Morning, Afternoon, Evening, Night) and bulk scheduling across multiple days.

### Patient Management
Patient directory with session history, anonymous mode support (pseudonym + avatar), profile modals, session notes editor, and document upload via Firebase Cloud Storage.

### Income Analytics
Recharts-powered dashboard showing revenue over time, income by consultation type, total earnings, completed appointments, and pending payouts. Platform commission transparency (30% retention, 70% specialist payout).

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | Next.js (App Router) | 16.1.0 |
| **UI Library** | React | 19.2.3 |
| **Language** | TypeScript | 5 |
| **Styling** | Tailwind CSS | 3.4.1 |
| **Animations** | Framer Motion | 12.23.26 |
| **Backend** | Firebase (Auth + Firestore + Storage + Hosting) | 12.10.0 |
| **Video Calls** | LiveKit Components + Client | 2.9.20 / 2.17.3 |
| **Charts** | Recharts | 3.8.0 |
| **Calendar** | react-day-picker | 9.14.0 |
| **Date Utilities** | date-fns | 4.1.0 |
| **Icons** | Lucide React | 0.562.0 |
| **Class Merging** | clsx + tailwind-merge | 2.1.1 / 3.4.0 |
| **Linting** | ESLint | 9 |

---

## Architecture

```
src/
├── app/
│   ├── page.tsx                          # Marketing landing page (6 sections)
│   ├── layout.tsx                        # Root layout — metadata, fonts, global styles
│   ├── globals.css                       # Tailwind base + 390-line LiveKit custom theme
│   └── portal/                           # Specialist portal (authenticated)
│       ├── layout.tsx                    # Auth context + sidebar wrapper
│       ├── login/page.tsx                # Google Sign-In
│       ├── register/page.tsx             # 3-step onboarding wizard
│       ├── dashboard/page.tsx            # Main hub with real-time stats
│       ├── appointments/page.tsx         # Full appointment list + actions
│       ├── consultation/page.tsx         # LiveKit video call room
│       ├── profile/page.tsx              # Specialist profile editor
│       ├── slots/page.tsx                # Availability calendar manager
│       ├── patients/page.tsx             # Patient directory + notes
│       └── income/page.tsx               # Earnings analytics dashboard
├── components/
│   ├── Navbar.tsx                        # Sticky nav with smooth scroll links
│   ├── Hero.tsx                          # Mesh gradient hero with entrance animations
│   ├── Crisis.tsx                        # Scroll-driven data narrative (4 scenes)
│   ├── FeatureStory.tsx                  # Glass-morphic feature card grid
│   ├── Comparison.tsx                    # Competitive verdict table
│   ├── Investor.tsx                      # Pitch section + advisor testimonial
│   ├── Team.tsx                          # Team cards + footer
│   └── portal/                           # 18 portal-specific components
│       ├── AuthGuard.tsx                 # Route protection middleware
│       ├── PortalSidebar.tsx             # Left navigation
│       ├── LiveKitCall.tsx               # Video call wrapper + custom theme
│       ├── ConsultationWorkspace.tsx     # Call room layout
│       ├── SlotCalendar.tsx              # Availability picker
│       ├── PatientProfileModal.tsx       # Patient details modal
│       ├── PatientNoteEditor.tsx         # Session notes UI
│       ├── StatCard.tsx                  # KPI metric card
│       └── ...                           # 10 more portal components
├── lib/
│   ├── firebase.ts                       # Firebase client initialization
│   ├── firestore.ts                      # Firestore CRUD (specialists, appointments, slots)
│   ├── auth.ts                           # Google Sign-In logic
│   ├── types.ts                          # TypeScript interfaces (Specialist, Appointment, etc.)
│   ├── constants.ts                      # Commission rates, payout calculations
│   ├── e2ee.ts                           # E2EE negotiation for video calls
│   ├── consultation-session.ts           # LiveKit session management
│   ├── utils.ts                          # Input sanitization + validation
│   └── hooks/                            # 10 custom React hooks
│       ├── useAuth.tsx                   # Firebase Auth context + specialist state
│       ├── useCallSession.tsx            # LiveKit session state management
│       ├── useAppointments.ts            # Firestore appointment streams
│       ├── usePatients.ts                # Patient profile aggregation
│       ├── useSlots.ts                   # Availability CRUD
│       ├── useSessionNotifications.ts    # Upcoming session alerts
│       ├── usePatientNotes.ts            # Session notes CRUD
│       ├── usePatientUploads.ts          # Document upload management
│       ├── usePatientDocuments.ts        # Document listing
│       └── usePatientMessage.ts          # In-session messaging
└── public/
    └── assets/
        ├── app-mockup.png                # Mobile app device mockup
        └── team/                         # 6 team member photos
```

### Architecture Principles

- **Next.js App Router** — File-based routing with nested layouts for portal auth isolation
- **Custom Hooks** — All Firestore subscriptions and business logic encapsulated in 10 reusable hooks
- **Firestore Data Layer** — Centralized queries in `lib/firestore.ts`, never called directly from components
- **Auth Guard Pattern** — `<AuthGuard>` component wraps all portal routes, redirecting unauthenticated users
- **Static Export** — `output: 'export'` for CDN deployment on Firebase Hosting (no Node.js server)

---

## Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing | Cinematic marketing page with 6 scroll sections |
| `/portal/login` | Sign In | Google OAuth with feature highlights |
| `/portal/register` | Onboarding | 3-step specialist registration wizard |
| `/portal/dashboard` | Dashboard | Real-time stats, notifications, upcoming appointments |
| `/portal/appointments` | Appointments | Full appointment list with status filters and actions |
| `/portal/consultation` | Video Call | LiveKit room with glassmorphic controls + ephemeral chat |
| `/portal/profile` | Profile | Specialist profile editor (bio, fees, qualifications) |
| `/portal/slots` | Availability | Calendar-based slot management with presets |
| `/portal/patients` | Patients | Patient directory with notes and document uploads |
| `/portal/income` | Income | Earnings analytics with charts and payout breakdown |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project with Authentication + Firestore enabled

### Installation

```bash
# Clone the repository
git clone git@github.com:jayashan-b/mindassist-web.git
cd mindassist-web

# Install dependencies
npm install
```

### Firebase Configuration

The Firebase client config is initialized in `src/lib/firebase.ts`. Update the config object with your Firebase project credentials.

### Run

```bash
# Development server (http://localhost:3000)
npm run dev

# Production build (static export to /out)
npm run build

# Lint check
npm run lint
```

---

## Deployment

### Firebase Hosting (Primary)

Static export deployed to Firebase Hosting with SPA rewrites for the portal.

```bash
# Build static export
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

**Project:** `mindassist-live`
**Output:** `/out` directory (static HTML/CSS/JS)
**Rewrites:** `/portal/**` routes rewritten to portal index for client-side routing

### Netlify (Alternative)

Pre-configured via `netlify.toml` — automatic builds from `npm run build`, publishes `/out`, with trailing slash redirects and 404 fallback.

---

## Security

| Layer | Implementation |
|-------|---------------|
| **Authentication** | Google OAuth 2.0 via Firebase Auth |
| **Route Protection** | `<AuthGuard>` component with Firestore specialist verification |
| **Input Sanitization** | `sanitizeInput()` and `sanitizeArray()` on all registration form fields |
| **SLMC Validation** | Regex enforcement for Sri Lanka Medical Council registration numbers |
| **Video Call E2EE** | End-to-end encryption negotiation before LiveKit session establishment |
| **Ephemeral Chat** | Data-channel messages during calls — never persisted to any database |
| **Patient Privacy** | Anonymous mode with pseudonyms and generated avatars |
| **Firestore Rules** | Specialist data scoped by UID, patient data scoped by specialist |

---

## Design System

### Color Palette

Medical-grade violet and slate palette with dark theme for the consultation room:

- **Primary:** `#7c3aed` (Violet 600)
- **Accent:** `#8b5cf6` (Violet 500)
- **Portal Background:** Dark gradient (`#0f0f14` → `#3d3d5c`)
- **Marketing Background:** White with violet accent sections

### Animations

- **Mesh Gradient Hero** — Three animated blobs on 15–25s staggered loops (Framer Motion)
- **Scroll-Driven Scenes** — `useScroll` + `useTransform` for parallax, blur, and opacity interpolations
- **Card Interactions** — Spring physics (`whileHover: { scale: 1.03 }`)
- **Page Transitions** — Fade + Y-axis entrance (0.6s cubic-bezier)

### LiveKit Custom Theme

390 lines of CSS overriding LiveKit's default UI to match the glassmorphic design language — frosted glass control bar (`backdrop-blur: 20px`), violet gradient chat bubbles with iMessage-style tails, translucent participant tiles, and red gradient disconnect button.

### Typography

Geist Sans (body) and Geist Mono (code) via Next.js built-in font optimization.

---

## Project Stats

| Metric | Count |
|--------|-------|
| Commits | 68 |
| TypeScript Source Files | 61 |
| React Components | 28 |
| Pages / Routes | 11 |
| Custom Hooks | 10 |
| Portal Routes | 10 |
| Custom CSS Lines | 390 |
| Solo Developer | 1 |

---

## Related

This is the web companion to the [MindAssist mobile app](https://github.com/jayashan-b/mindassist) — a Flutter application with clinical assessments, encrypted journaling, AI companion, and crisis intervention features.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with purpose in Sri Lanka

**IIT / University of Westminster — SDGP 2026**

</div>
