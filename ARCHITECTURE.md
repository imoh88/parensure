# Parensure — Project Architecture

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Backend](#backend)
4. [Frontend](#frontend)
5. [Data Models](#data-models)
6. [API Reference](#api-reference)
7. [Real-Time Layer](#real-time-layer)
8. [Notification System](#notification-system)
9. [Auth Flows](#auth-flows)
10. [Role System](#role-system)
11. [Storage & Media](#storage--media)
12. [AI Integration](#ai-integration)
13. [Environment Variables](#environment-variables)

---

## Overview

Parensure is a mobile-first caregiving platform connecting care receivers with caregivers and care firms. It supports real-time messaging, task and appointment management, health alerts, medication tracking, and multi-role access control.

| Concern | Technology |
|---|---|
| Mobile app | React Native (Expo) |
| Navigation | Expo Router v6 (file-based) |
| State | Zustand |
| Backend | Node.js + Express 5 |
| Database | MongoDB (Mongoose) |
| Auth | JWT (Bearer) + OTP |
| Real-time | Socket.IO |
| Queue | BullMQ + Redis |
| Push | Firebase Cloud Messaging |
| Storage | AWS S3 (presigned URLs) |
| AI | Google Gemini (medication OCR) |
| Email | Nodemailer (SMTP) |
| Validation | Zod (both sides) |

---

## System Architecture

```
┌────────────────────────────────────────────────────────┐
│                  React Native App (Expo)               │
│  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌────────┐   │
│  │ Auth     │  │ Zustand  │  │ API    │  │Socket  │   │
│  │ Screens  │  │ Store    │  │ Layer  │  │ Client │   │
│  └──────────┘  └──────────┘  └───┬────┘  └───┬────┘   │
└──────────────────────────────────┼────────────┼────────┘
                                   │ HTTPS      │ WSS
┌──────────────────────────────────┼────────────┼────────┐
│               Node.js / Express 5 (Port 8000)          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ REST API │  │ Socket.IO│  │ BullMQ   │             │
│  │ /api/v1  │  │ Server   │  │ Worker   │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘            │
│       │             │              │                   │
│  ┌────▼─────────────▼──────────────▼─────────────────┐ │
│  │   Services Layer (Business Logic)                  │ │
│  └────┬────────────────────────────────────────────── ┘ │
└───────┼────────────────────────────────────────────────┘
        │
┌───────┼────────────────────────────────────────────────┐
│       │  Infrastructure                                 │
│  ┌────▼────┐  ┌─────────┐  ┌──────┐  ┌─────────────┐  │
│  │ MongoDB │  │  Redis  │  │ AWS  │  │  Firebase   │  │
│  │         │  │(BullMQ) │  │  S3  │  │    FCM      │  │
│  └─────────┘  └─────────┘  └──────┘  └─────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## Backend

**Location:** `parensure-backend/`

### Entry Points

| File | Purpose |
|---|---|
| `src/server.ts` | Starts HTTP server, initialises Socket.IO, connects to MongoDB |
| `src/app.ts` | Express app factory — middleware stack, route registration |
| `src/workers/notification` | BullMQ worker process (run separately via `npm run worker:notification`) |

### Middleware Stack (in order)

```
CORS → JSON body parser (10 MB) → URL-encoded parser
  → authenticate (JWT) → requireRole (per-route)
  → validate (Zod) → route handler
  → globalErrorHandler
```

| Middleware | File | Notes |
|---|---|---|
| `authenticate` | `middlewares/auth-middleware.ts` | Verifies Bearer JWT, attaches `req.userId`, `req.accountType` |
| `requireRole(...roles)` | `middlewares/auth-middleware.ts` | Enforces `CARE_RECEIVER \| CAREGIVER \| FIRM_ADMIN` |
| `validate(schema)` | `middlewares/validation.ts` | Zod schema validation of `req.body` |
| `globalErrorHandler` | `middlewares/global-error.ts` | Maps `AppError` and generic errors → JSON response |

### Project Structure

```
src/
├── app.ts                   # Express app setup
├── server.ts                # Server bootstrap
├── config/
│   ├── index.ts             # All env vars (typed)
│   ├── prisma.ts            # (legacy reference)
│   ├── redis.ts             # IORedis connection
│   ├── firebase.ts          # Firebase Admin SDK init
│   ├── logger.ts            # Winston logger
│   └── mail-config.ts       # Nodemailer transporter
├── middlewares/
│   ├── auth-middleware.ts
│   ├── validation.ts
│   └── global-error.ts
├── routes/v1/               # Route definitions
├── controllers/             # Request handlers (thin layer)
├── services/                # All business logic
├── models/
│   └── index.ts             # All Mongoose models
├── socket/
│   └── server.ts            # Socket.IO server
├── validations/             # Zod schemas per domain
└── utils/
    ├── errors/AppError.ts
    └── notification/
        ├── job.ts           # Enqueue FCM jobs
        └── worker.ts        # BullMQ worker
```

### Response Shape

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "message": "Human-readable error" }
```

---

## Frontend

**Location:** `parensure/`

### Project Structure

```
app/
├── _layout.tsx              # Root layout — font loading, auth guard, session restore
├── (auth)/
│   ├── _layout.tsx          # Auth stack navigator
│   ├── onboarding.tsx
│   ├── login.tsx / login-email.tsx / login-otp.tsx
│   ├── register.tsx + register-*.tsx  (multi-step registration)
│   ├── verify-email-code.tsx / verify-otp.tsx
│   ├── complete-profile.tsx / profile-completed.tsx
│   └── success.tsx
└── (app)/
    ├── _layout.tsx          # Custom bottom tab bar (role-aware)
    ├── index.tsx            # Home / Dashboard
    ├── health.tsx           # Health metrics (CARE_RECEIVER)
    ├── alerts.tsx           # Alerts list (CAREGIVER)
    ├── carecircle.tsx       # Care Circle — team view + management
    ├── profile.tsx
    ├── caregiver-detail.tsx # Caregiver profile + role/permissions (primary only)
    ├── manage-carecircle.tsx
    ├── manage-receiver.tsx
    ├── add-care-receiver.tsx
    ├── invite-member.tsx
    ├── chat.tsx             # Conversation list
    ├── chat-room.tsx        # Individual conversation
    ├── add-task.tsx / task-detail.tsx
    ├── add-appointment.tsx / appointment-detail.tsx
    ├── add-medication.tsx / add-medication-manual.tsx
    ├── scan-medication.tsx / medication-success.tsx / medication.tsx
    ├── alert-detail.tsx
    ├── heart-rate-check.tsx / stability-check.tsx
    ├── insights.tsx / activity.tsx
    ├── edit-profile.tsx / personal-information.tsx
    └── change-language.tsx

lib/
├── api/
│   ├── client.ts            # Axios instance + interceptors
│   ├── auth.ts
│   ├── caregiver.ts
│   ├── careReceiver.ts
│   ├── chat.ts
│   ├── alert.ts
│   ├── notification.ts
│   ├── firm.ts
│   └── invite.ts
├── store/
│   └── authStore.ts         # Zustand store
├── types/
│   └── index.ts             # All shared TypeScript types
└── utils/
    ├── storage.ts           # Secure + async storage helpers
    ├── taskCache.ts
    └── appointmentCache.ts

components/
├── CaregiverDashboard.tsx
├── CareReceiverDashboard.tsx
├── ProfileSidebar.tsx
└── ui/
    ├── ScreenWrapper.tsx
    ├── Button.tsx
    ├── Input.tsx
    ├── OTPInput.tsx
    └── GradientBackground.tsx
```

### Tab Layout (Role-Aware)

| Role | Left tabs | FAB items | Right tabs |
|---|---|---|---|
| `CARE_RECEIVER` | Home, Health | Create task, Add Appointment, Add medication, Add Care Giver | Care Circle, Profile |
| `CAREGIVER` | Home, Care Circle | Create task, Add Appointment, Add medication, Add Care Recipient | Alerts, Profile |
| `FIRM_ADMIN` | Home, Care Circle | Add Appointment, Add medication, Add Care Recipient | Alerts, Profile |

### State Management (Zustand — `authStore`)

| State | Type | Description |
|---|---|---|
| `user` | `User \| null` | Authenticated user object |
| `token` | `string \| null` | JWT token |
| `isAuthenticated` | `boolean` | Session status |
| `isLoading` | `boolean` | Initial session restore in progress |
| `activeRole` | `AccountType \| null` | Currently active role context |

| Action | Description |
|---|---|
| `setAuth(user, token)` | Persist user + token to secure storage |
| `updateUser(user)` | Patch user fields |
| `setActiveRole(role)` | Switch role context |
| `syncProfile()` | Fetch latest profile from server |
| `logout()` | Clear all auth data from storage and state |
| `restoreSession()` | Restore token + user from device storage on startup |

### API Client

`lib/api/client.ts` — Axios instance with:
- Base URL from `EXPO_PUBLIC_API_URL`
- Request interceptor: injects `Authorization: Bearer <token>` from secure storage
- Response interceptor: unwraps errors, triggers logout on 401

---

## Data Models

> **ERD version:** v8. All models are MongoDB/Mongoose defined in `src/models/index.ts`.

### Entity Relationship Overview

```
USER ──────────────┬──── CARE_RECEIVER ────────────────────────────────┐
                   │         │                                          │
                   │         │  primaryCaregiverId                      │
                   │         ▼                                          │
                   ├──── CAREGIVER_PROFILE ◄── FIRM_AFFILIATION ◄── FIRM
                   │         │
                   └──── FIRM (adminUserId)
                             │
           ┌─────────────────┼───────────────────┐
           │                 │                   │
           ▼                 ▼                   ▼
      CAREGIVER_INVITE   FIRM_INVITE       CARE_BOOKING
      (CR → CG)          (Firm → CG)      (CR ↔ CG, with role)

── Care activity (linked directly to CareReceiver + CaregiverProfile) ──

RECURRENCE_RULE ──┬──► CARE_TASK
                  ├──► CARE_MEDICATION
                  └──► CARE_APPOINTMENT
```

**Key design principle (ERD v8):** Care activities (`CareTask`, `CareMedication`, `CareAppointment`) are linked directly to a `CareReceiver` and the caregiver who created them. They are **not** routed through `CareBooking`. This decouples content creation from the booking/invite lifecycle and allows medications to be managed as a first-class entity separate from general tasks.

---

### User
```
fullName, email, phone, passwordHash, passwordSet
accountType: CARE_RECEIVER | CAREGIVER | FIRM_ADMIN
linkedAccountTypes[]
dateOfBirth, gender, relationship
country, state, city, homeAddress, timezone
profileImageKey
isEmailVerified, isProfileComplete
isOnline, lastSeen, lastLoginAt
```

### CareReceiver
```
userId (→ User, unique)
primaryCaregiverId (→ CaregiverProfile)
medicalNotes, address, emergencyContact
```

### CaregiverProfile
```
userId (→ User, unique)
certifications, hourlyRate, bio, rating
verificationStatus: PENDING | VERIFIED | REJECTED
```

### Firm
```
adminUserId (→ User, unique)
firmName, registrationNo
status: PENDING | ACTIVE | SUSPENDED
```

### FirmAffiliation
```
caregiverProfileId (→ CaregiverProfile)
firmId (→ Firm)
isActiveContext (boolean — profile switcher)
status: ACTIVE | INACTIVE
joinedAt
```

### CareBooking ← care circle membership
```
careReceiverId (→ CareReceiver)
caregiverProfileId (→ CaregiverProfile)
firmAffiliationId? (→ FirmAffiliation)
firmId? (→ Firm)
caregiverRole: PRIMARY_CAREGIVER | PROFESSIONAL_CAREGIVER |
               FAMILY_OBSERVER | FRIEND_NEIGHBOR | EMERGENCY_CONTACT
isPrimary (boolean)
status: PENDING | ACTIVE | COMPLETED | CANCELLED
startDate, endDate
```
> CareBooking defines **who is on the care team** and their role. It does not own tasks, medications, or appointments.

### CaregiverInvite
```
careReceiverId (→ CareReceiver)
caregiverProfileId (→ CaregiverProfile)
isFirstInvite (boolean — sets primaryCaregiverId when accepted)
status: PENDING | ACCEPTED | DECLINED
sentAt, acceptedAt
```

### FirmInvite
```
firmId (→ Firm)
caregiverProfileId? (→ CaregiverProfile)
inviteeEmail
inviteType: EXISTING_USER | NEW_VIA_EMAIL
status: PENDING | ACCEPTED | DECLINED
```

---

### RecurrenceRule ← shared scheduling entity (ERD v8)
```
frequency: ONE_TIME | DAILY | WEEKLY | CUSTOM
interval (int — every N days/weeks)
daysOfWeek (string — e.g. "MON,WED,FRI")
startDate, endDate
maxOccurrences (int)
```
> One `RecurrenceRule` is shared by `CareTask`, `CareMedication`, and `CareAppointment`. Creating a recurring item creates one rule and one activity document that references it. Individual occurrence state (done/not done) is tracked on the activity itself.

### CareTask (ERD v8 — replaces Task)
```
careReceiverId (→ CareReceiver)
createdByCaregiverId (→ CaregiverProfile)
recurrenceRuleId (→ RecurrenceRule)
title, subtitle
taskType: EXERCISE | HEALTH | CHECK_IN | OTHER
scheduledTime (timestamp)
priority: LOW | NORMAL | HIGH
isDone (boolean)
attachments[] (S3 keys)
```
> Previously `Task` held medication as a category. Medication is now its own model (`CareMedication`). Tasks no longer reference a `bookingId`.

### CareMedication (ERD v8 — new first-class model)
```
careReceiverId (→ CareReceiver)
createdByCaregiverId (→ CaregiverProfile)
recurrenceRuleId (→ RecurrenceRule)
title, dosage
scheduledTime (timestamp)
note (text)
isDone (boolean)
```
> Separated from tasks so medication history, dosage tracking, and OCR scanning have a dedicated entity without mixing with general care tasks.

### CareAppointment (ERD v8 — replaces Appointment)
```
careReceiverId (→ CareReceiver)
createdByCaregiverId (→ CaregiverProfile)
recurrenceRuleId (→ RecurrenceRule)
title, appointeeName
appointmentTime (timestamp)
place
```
> No longer references `bookingId`. Provider contact details (`providerPhone`) moved to `appointeeName` + `place`.

---

### Alert
```
careReceiverId, caregiverProfileId
type: SOS_TRIGGERED | FALL_DETECTED | MISSED_MEDICATION |
      LOW_ACTIVITY | UPCOMING_MEDICATION
severity: CRITICAL | ATTENTION_NEEDED
status: ACTIVE | CHECKED_IN | RESOLVED
title, message, metadata (JSON)
```

### Chat models
```
Conversation            — timestamps only
ConversationParticipant — conversationId, userId (unique pair)
Message                 — conversationId, senderId, content, isRead
```

### Supporting models
```
OtpCode      — userId, code, type, expiresAt, used
Notification — userId, title, body, type, isRead, data (JSON)
Device       — userId, fcmToken (unique, for FCM push)
```

---

### Model Comparison: Before → After ERD v8

| Old model | ERD v8 model | Key change |
|---|---|---|
| `Task` (with medication category) | `CareTask` | Medication removed; no bookingId |
| *(task medication category)* | `CareMedication` | Promoted to own model |
| `Appointment` | `CareAppointment` | No bookingId; simpler fields |
| *(inline scheduledTimes[])* | `RecurrenceRule` | Dedicated scheduling entity |
| `CarePlan` | *(removed)* | Superseded by RecurrenceRule |

---

## API Reference

Base path: `/api/v1`

### Auth `/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register/care-receiver` | No | Register care receiver |
| POST | `/register/caregiver` | No | Register caregiver |
| POST | `/register/firm` | No | Register firm admin |
| POST | `/set-password` | No | Set password (firm invite flow) |
| POST | `/send-otp` | No | Send email verification OTP |
| POST | `/verify-email` | No | Verify OTP |
| POST | `/login` | No | Password login → JWT |
| POST | `/send-login-otp` | No | Send login OTP |
| POST | `/verify-login-otp` | No | Verify login OTP → JWT |
| POST | `/forgot-password` | No | Request password reset |
| POST | `/verify-reset-code` | No | Verify reset code |
| POST | `/reset-password` | No | Set new password |
| GET | `/profile` | Yes | Get authenticated user profile |
| PATCH | `/profile` | Yes | Update profile |
| GET | `/profile-image-url` | Yes | Get S3 presigned upload URL |
| PATCH | `/profile-image` | Yes | Save uploaded image key |
| PATCH | `/change-password` | Yes | Change password |
| POST | `/device` | Yes | Register FCM token |
| DELETE | `/device` | Yes | Remove FCM token |
| POST | `/add-profile` | Yes | Link additional account type |
| DELETE | `/account` | Yes | Delete account |

### Care Receiver `/care-receiver` (CARE_RECEIVER)
| Method | Path | Description |
|---|---|---|
| GET | `/profile` | Get profile |
| PATCH | `/profile` | Update profile |
| GET | `/caregivers/search` | Search verified caregivers |
| GET | `/invites` | List sent caregiver invites |
| GET | `/my-caregivers` | List accepted caregivers |
| POST | `/add-caregiver` | Directly link a caregiver |
| POST | `/invite/email` | Invite non-registered caregiver |
| POST | `/sos` | Trigger SOS alert |

### Caregiver `/caregiver` (CAREGIVER)
| Method | Path | Description |
|---|---|---|
| GET | `/profile` | Profile + firm affiliations |
| PATCH | `/profile` | Update profile |
| GET | `/invites` | Received caregiver + firm invites |
| GET | `/context` | Active context (individual / firm) |
| POST | `/context/switch` | Switch context |
| GET | `/bookings` | Assigned care bookings |
| GET | `/care-receivers/search` | Search care receivers |
| POST | `/care-receivers/add` | Add care receiver |
| GET | `/care-receivers/:id/team` | Get care receiver's full team |
| PATCH | `/care-receivers/:id/transfer-primary` | Transfer primary caregiver role |
| PATCH | `/care-receivers/:id/members/:bookingId/role` | Update member role (primary only) |
| DELETE | `/bookings/:bookingId` | Remove caregiver from circle |
| POST | `/care-receivers/invite` | Send care team invite by email |

### Firm `/firm` (FIRM_ADMIN)
| Method | Path | Description |
|---|---|---|
| GET | `/profile` | Firm profile |
| PATCH | `/profile` | Update firm profile |
| GET | `/caregivers` | Affiliated caregivers |
| POST | `/invite/existing` | Invite existing caregiver |
| POST | `/invite/email` | Invite new caregiver by email |
| GET | `/invites` | Sent invites |

### Invites `/invite`
| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/caregiver` | CARE_RECEIVER | Send invite to caregiver |
| PATCH | `/caregiver/:id/respond` | CAREGIVER | Accept / decline caregiver invite |
| PATCH | `/firm/:id/respond` | CAREGIVER | Accept / decline firm invite |

### Chat `/chat`
| Method | Path | Description |
|---|---|---|
| POST | `/conversations` | Get or create 1-on-1 conversation |
| GET | `/conversations` | List all conversations |
| GET | `/conversations/:id/messages` | Get messages |
| PATCH | `/conversations/:id/read` | Mark as read |
| POST | `/conversations/:id/messages` | Send message (REST fallback) |

### Task `/task` → `CareTask`
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/upload-url` | CAREGIVER | S3 presigned upload URL for attachments |
| POST | `/` | CAREGIVER, CARE_RECEIVER | Create task (+ optional RecurrenceRule) |
| GET | `/` | CAREGIVER | Get tasks by `careReceiverId` |
| GET | `/mine` | CARE_RECEIVER | Own tasks |
| PATCH | `/:taskId/status` | CAREGIVER | Mark complete / cancel |
| PATCH | `/:taskId` | CAREGIVER | Update task details |

> Body for create: `{ careReceiverId, title, subtitle?, taskType, scheduledTime, priority, recurrence?: { frequency, interval?, daysOfWeek?, startDate, endDate?, maxOccurrences? } }`

### Medication `/medication` → `CareMedication`
| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/` | CAREGIVER, CARE_RECEIVER | Create medication (+ optional RecurrenceRule) |
| GET | `/` | CAREGIVER | Get medications by `careReceiverId` |
| GET | `/mine` | CARE_RECEIVER | Own medications |
| PATCH | `/:medicationId/status` | CAREGIVER | Mark as taken / skip |
| PATCH | `/:medicationId` | CAREGIVER | Update medication details |

> Body for create: `{ careReceiverId, title, dosage, scheduledTime, note?, recurrence? }`

### Appointment `/appointment` → `CareAppointment`
| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/` | CAREGIVER, CARE_RECEIVER | Create appointment (+ optional RecurrenceRule) |
| GET | `/` | CAREGIVER | List appointments by `careReceiverId` |
| GET | `/mine` | CARE_RECEIVER | Own appointments |
| PATCH | `/:appointmentId` | CAREGIVER | Update appointment |
| PATCH | `/:appointmentId/status` | CAREGIVER | Complete / cancel |

> Body for create: `{ careReceiverId, title, appointeeName, appointmentTime, place, recurrence? }`

### Alert `/alert`
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/` | CAREGIVER | All alerts (filterable by status) |
| PATCH | `/:id/check-in` | CAREGIVER | Check in on alert |
| PATCH | `/:id/resolve` | CAREGIVER | Resolve alert |

### Notification `/notification`
| Method | Path | Description |
|---|---|---|
| GET | `/` | All notifications |
| PATCH | `/read-all` | Mark all read |
| PATCH | `/:id/read` | Mark one read |

### Media `/media`
| Method | Path | Description |
|---|---|---|
| POST | `/scan-medication` | Send base64 image → Gemini OCR → medication details |

---

## Real-Time Layer

Socket.IO runs on the same HTTP server. Clients authenticate via JWT on connection.

```
socket.handshake.auth.token → verified → userId attached
```

### Room Naming
Conversation rooms are deterministic:
```
[userId1, userId2].sort().join('-')
```

### Events

| Event | Direction | Payload | Description |
|---|---|---|---|
| `user_online` | server → all | `{ userId }` | User connected |
| `user_offline` | server → all | `{ userId }` | User disconnected |
| `join_room` | client → server | `{ roomId }` | Join conversation room |
| `exit_room` | client → server | `{ roomId }` | Leave conversation room |
| `send_message` | client → server | `{ conversation_id, sender_id, receiver_id, message }` | Send message |
| `new_message` | server → room | message object | Incoming message broadcast |
| `is_new_message` | client → server | `{ userId }` | Check unread status |
| `has_unread_message` | server → client | `{ hasUnread: boolean }` | Unread response |
| `error` | server → client | `{ message }` | Error response |

---

## Notification System

```
Event occurs (SOS, new message, etc.)
        ↓
addNotificationJob(payload) → BullMQ queue (Redis)
        ↓
notification worker (separate process)
        ↓
Firebase Admin SDK → FCM → device push notification
        ↓
Notification record stored in MongoDB
```

Worker is started separately:
```bash
npm run worker:notification
```

`NotificationJob` payload shape:
```ts
{
  userId: string;
  title: string;
  body: string;
  data: Record<string, string>;   // must be string values for FCM
}
```

---

## Auth Flows

### 1. Care Receiver Registration
```
POST /auth/register/care-receiver
  → OTP sent to email
  → POST /auth/verify-email { code }
  → CareReceiver profile auto-created
  → JWT returned
```

### 2. Caregiver Registration
```
POST /auth/register/caregiver
  → OTP sent to email
  → POST /auth/verify-email { code }
  → CaregiverProfile created (verificationStatus: PENDING)
  → Visible to care receivers after Parensure verification
```

### 3. Firm Registration
```
POST /auth/register/firm
  → OTP verify
  → Firm record created
```

### 4. Firm-Invited Caregiver
```
Firm admin → POST /firm/invite/email { email }
  → User pre-created (passwordSet: false)
  → Email sent with app link + FirmInvite.id as token
  → User opens app → POST /auth/set-password { token, password }
  → FirmAffiliation created on accept
```

### 5. Care Receiver → Caregiver Invite
```
CARE_RECEIVER: POST /invite/caregiver { caregiverProfileId }
  → CaregiverInvite created (isFirstInvite if no prior caregivers)
CAREGIVER: PATCH /invite/caregiver/:id/respond { status: ACCEPTED }
  → CareBooking created (records membership + role in care circle)
  → If isFirstInvite → CareReceiver.primaryCaregiverId set
  → Caregiver can now create CareTask / CareMedication / CareAppointment
    for that CareReceiver (linked by careReceiverId, not bookingId)
```

### 6. Firm → Existing Caregiver Invite
```
FIRM_ADMIN: POST /firm/invite/existing { caregiverProfileId }
CAREGIVER: PATCH /invite/firm/:id/respond { status: ACCEPTED }
  → FirmAffiliation created
```

### 7. Context Switch (Caregiver)
```
POST /caregiver/context/switch { firmAffiliationId: string | null }
  → null = individual context
  → string = firm context (updates isActiveContext on FirmAffiliation)
```

---

## Role System

### Account Types
| Type | Description |
|---|---|
| `CARE_RECEIVER` | Care recipient — manages their own circle, invites caregivers |
| `CAREGIVER` | Individual caregiver — accepts invites, manages tasks/appointments |
| `FIRM_ADMIN` | Manages a firm — invites caregivers, links them to care receivers |

### Care Circle Roles (CareBooking.caregiverRole)
| Role | Description |
|---|---|
| `PRIMARY_CAREGIVER` | Full management rights — can change roles, remove members |
| `PROFESSIONAL_CAREGIVER` | Standard caregiver access |
| `FAMILY_OBSERVER` | Read-only observer |
| `FRIEND_NEIGHBOR` | Informal helper |
| `EMERGENCY_CONTACT` | Receives emergency alerts |

### Capability-Based Authorization

All endpoints enforce discrete capabilities regardless of UI state. The UI hides disallowed actions, but the backend always enforces independently.

**Files:**
- `src/utils/capabilities.ts` — all capability types + `ROLE_CAPABILITIES` map
- `src/middlewares/require-capability.ts` — `requireCapability(...caps)` middleware

**Two-layer enforcement on every protected route:**
```
authenticate        → verifies JWT, attaches req.userId + req.accountType
requireRole(...)    → coarse gate: account type must match (used at router level)
requireCapability(...)  → fine gate: specific capability must be granted for this action
```

**Capability → Role mapping:**

| Capability | CARE_RECEIVER | CAREGIVER | FIRM_ADMIN |
|---|---|---|---|
| `INVITE_CAREGIVER` | ✓ | | |
| `INVITE_CAREGIVER_BY_EMAIL` | ✓ | | |
| `RESPOND_CAREGIVER_INVITE` | | ✓ | |
| `RESPOND_FIRM_INVITE` | | ✓ | |
| `INVITE_FIRM_MEMBER` | | | ✓ |
| `VIEW_MY_CAREGIVERS` | ✓ | | |
| `ADD_CAREGIVER` | ✓ | | |
| `TRIGGER_SOS` | ✓ | | |
| `VIEW_CARE_CIRCLE` | | ✓ | |
| `MANAGE_CARE_CIRCLE` | | ✓ | |
| `SWITCH_CONTEXT` | | ✓ | |
| `CREATE_TASK` | ✓ | ✓ | |
| `MANAGE_TASK` | | ✓ | |
| `VIEW_TASKS` | | ✓ | |
| `VIEW_OWN_TASKS` | ✓ | | |
| `UPLOAD_TASK_ATTACHMENT` | | ✓ | |
| `CREATE_APPOINTMENT` | ✓ | ✓ | |
| `MANAGE_APPOINTMENT` | | ✓ | |
| `VIEW_APPOINTMENTS` | | ✓ | |
| `VIEW_OWN_APPOINTMENTS` | ✓ | | |
| `VIEW_ALERTS` | | ✓ | |
| `CONFIGURE_ALERTS` | | ✓ | |
| `SCAN_MEDICATION` | ✓ | ✓ | |
| `SEND_MESSAGE` | ✓ | ✓ | ✓ |
| `READ_MESSAGES` | ✓ | ✓ | ✓ |
| `READ_NOTIFICATIONS` | ✓ | ✓ | ✓ |
| `MANAGE_FIRM` | | | ✓ |

**Usage:**
```ts
// Single capability
router.post('/task', requireCapability('CREATE_TASK'), handler)

// Multiple — ALL must be present
router.patch('/task/:id', requireCapability('MANAGE_TASK'), handler)

// Error response when missing:
// 403 { success: false, message: "Forbidden: missing capabilities [CREATE_TASK]" }
```

**Additional service-layer enforcement:**
- `MANAGE_CARE_CIRCLE` capability is a prerequisite, but the service also checks `isPrimary === true` on the `CareBooking` before allowing role changes or member removal
- Content (`CareTask`, `CareMedication`, `CareAppointment`) is scoped by `careReceiverId` — service verifies an active booking exists before allowing creation

---

## Storage & Media

### Profile Images
```
GET /auth/profile-image-url → presigned S3 PUT URL
Client uploads directly to S3
PATCH /auth/profile-image { key } → saves key to User.profileImageKey
```

### Task Attachments
```
GET /task/upload-url?filename=&mimeType= → presigned S3 PUT URL
Client uploads → POST /task with attachments: [key, ...]
```

### Medication Scan
```
Client captures image → base64 encode
POST /media/scan-medication { image: base64, mimeType }
  → Gemini Vision API → extracts name, dosage, rxNumber, instructions
  → Returns structured medication data
```

---

## AI Integration

| Feature | Provider | Input | Output |
|---|---|---|---|
| Medication OCR | Google Gemini | Base64 image | `{ name, dosage, rxNumber, instructions }` |

The Gemini call is wrapped in a 60-second timeout on the axios client side.

---

## Environment Variables

### Backend (`parensure-backend/.env`)
```env
PORT=8000
NODE_ENV=development

# JWT
JWT_SECRET=
JWT_EXPIRES_IN=7d

# MongoDB
MONGODB_URI=mongodb://localhost:27017/parensure

# Redis
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=

# Email (SMTP)
SMTP_USER=
SMTP_PASSWORD=
EMAIL_HOST=
EMAIL_PORT=
EMAIL_FROM=
SUPPORT_EMAIL=

# AWS S3
REGION=
ACCESS_KEY_ID=
SECRET_ACCESS_KEY=
BUCKET_NAME=

# Firebase (FCM)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# App
APP_URL=
GEMINI_API_KEY=
```

### Frontend (`parensure/.env`)
```env
EXPO_PUBLIC_API_URL=https://<backend-host>/api/v1
```

---

## Running the Project

### Backend
```bash
cd parensure-backend
npm install
npm run dev                    # API server (port 8000)
npm run worker:notification    # BullMQ notification worker (separate terminal)
```

### Frontend
```bash
cd parensure
npm install
npx expo start
```
