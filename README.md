# Parent Care App - React Native Frontend

A React Native mobile app for managing elderly parents' care, schedules, and health information.

## Features

- Onboarding flow
- User registration with profile picture upload
- OTP verification
- Email/password login
- Home dashboard with empty state
- Tab navigation (Dashboard, Caregivers, Medication, Health)

## Tech Stack

- React Native
- Expo Router for navigation
- NativeWind (Tailwind CSS)
- TypeScript
- Zustand for state management
- React Hook Form + Zod for form validation
- Axios for API calls
- AsyncStorage for persistence

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

The `.env` file is configured to point to the local backend:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
```

**Note:** For iOS simulator, use `http://localhost:3000/api/v1`
For Android emulator, use `http://10.0.2.2:3000/api/v1`

### 3. Start the Backend

First, make sure the backend is running:

```bash
cd ../mobile-movie-backend
npm run dev
```

### 4. Start the Expo App

```bash
npx expo start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code for physical device

## Project Structure

```
app/
├── (auth)/              # Authentication screens
│   ├── onboarding.tsx   # Welcome screen
│   ├── login.tsx        # Login form
│   ├── register.tsx     # Registration form
│   ├── verify-otp.tsx   # OTP verification
│   └── success.tsx      # Success confirmation
├── (app)/               # Main app screens
│   ├── index.tsx        # Home dashboard
│   ├── caregivers.tsx   # Caregivers tab
│   ├── medication.tsx   # Medication tab
│   └── health.tsx       # Health tab
├── _layout.tsx          # Root layout
└── index.tsx            # Entry point

components/
├── ui/
│   ├── Button.tsx       # Reusable button
│   ├── Input.tsx        # Form input
│   ├── OTPInput.tsx     # 4-digit OTP input
│   └── GradientBackground.tsx
└── ScreenWrapper.tsx    # Screen layout wrapper

lib/
├── api/
│   ├── client.ts        # Axios client
│   └── auth.ts          # Auth API methods
├── store/
│   └── authStore.ts     # Zustand auth store
├── utils/
│   ├── storage.ts       # AsyncStorage wrapper
│   └── validation.ts    # Zod schemas
└── types/
    └── index.ts         # TypeScript types
```

## Testing the App

### Complete Registration Flow:

1. Open the app → Onboarding screen
2. Tap "LET'S GET STARTED"
3. Tap "Create Account"
4. Fill in registration form:
   - Add profile picture (optional)
   - Enter name, pronouns, phone numbers, email, password
5. Tap "Next"
6. Check backend console for OTP (e.g., "🔐 OTP for +1234567890: 1234")
7. Enter the 4-digit OTP
8. Tap "Verify"
9. See success screen
10. Redirected to home dashboard

### Login Flow:

1. Open app → Tap "Login"
2. Enter email and password from registration
3. Tap "Continue"
4. Redirected to home dashboard

### Features to Test:

- Profile picture upload using camera/gallery
- Form validation (try invalid email, short password, etc.)
- OTP resend with countdown timer
- Logout functionality
- Tab navigation between screens
- Session persistence (close and reopen app)

## Common Issues

### Backend Connection Issues

If the app can't connect to the backend:

**iOS Simulator:**
- Use `http://localhost:3000/api/v1`

**Android Emulator:**
- Use `http://10.0.2.2:3000/api/v1` instead of localhost
- Update `.env` file: `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api/v1`

**Physical Device:**
- Backend and device must be on the same network
- Use your computer's local IP (e.g., `http://192.168.1.100:3000/api/v1`)
- Update `.env` file with the correct IP

### OTP Not Working

- Check backend console for the OTP code
- OTP expires in 5 minutes
- Use "Send me new code?" to get a fresh OTP

### Image Picker Not Working

- Grant permissions when prompted
- iOS Simulator: Use Simulator's photo library (drag and drop images)
- Android Emulator: Use device's Downloads folder

## Next Steps

- Add actual elderly people image to onboarding screen
- Implement "Add Loved One" functionality
- Build caregivers management
- Add medication tracking
- Implement health monitoring
- Add push notifications
- Integrate real SMS service for OTP
- Add forgot password flow

## Production Checklist

- [ ] Update API URL to production server
- [ ] Add proper error boundaries
- [ ] Implement crash reporting (Sentry)
- [ ] Add analytics (Firebase, Mixpanel)
- [ ] Optimize images and bundle size
- [ ] Add app icons and splash screens
- [ ] Configure deep linking
- [ ] Test on multiple devices
- [ ] Add accessibility features
- [ ] Implement biometric authentication
