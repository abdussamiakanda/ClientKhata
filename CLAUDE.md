# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ClientKhata is a single-page application for tracking client work and payments, built with React (Vite), Firebase (Firestore + Authentication), and modular CSS. The app allows users to manage clients, jobs, and payments, with features including:

- Client management with contact information
- Job tracking with status flow: Pending → Ongoing → Delivered → Paid
- Payment recording per job with partial payments support
- Invoice generation and email sending capabilities
- AI-powered job hunting feature

## Key Technologies

- **Frontend**: React 18, Vite, React Router DOM
- **State Management**: Context API (AuthContext, ThemeContext, SettingsContext)
- **Backend**: Firebase Firestore + Authentication
- **UI Components**: Lucide React icons, custom components with modular CSS
- **Security**: End-to-end encryption with key derivation for invoices

## Code Structure

The codebase follows a component-based architecture in the `src` directory:

- `components/` - Reusable UI components organized by function
- `firebase/` - Firebase configuration and data access utilities
- `context/` - React Context providers for auth, theme, and settings
- `utils/` - Utility functions for formatting, encryption, date handling
- `hooks/` - Custom React hooks
- `schema/` - Validation schemas

## Important Files

### Main Entry Points:
- `src/main.jsx` - Application entry point
- `src/App.jsx` - Main routing and layout configuration

### Firebase Integration:
- `src/firebase/config.js` - Firebase initialization and exports
- `src/context/AuthContext.jsx` - Authentication state management
- `src/firebase/profile.js` - User profile handling

### Core Components:
- `src/components/Layout/Layout.jsx` - Main application layout with sidebar navigation
- `src/components/ProtectedRoute.jsx` - Route protection for authenticated users
- `src/components/SendInvoiceModal/SendInvoiceModal.jsx` - Invoice generation and email sending

## Development Commands

- `npm run dev` – Start development server at http://localhost:5173
- `npm run build` – Create production build in `dist/` directory
- `npm run preview` – Preview the production build locally
- `npm run deploy` – Build and deploy to Firebase Hosting

## Authentication Flow

The app uses Firebase Authentication with Google sign-in only. The authentication context manages:
1. User state monitoring with `onAuthStateChanged`
2. Profile data subscription for user settings
3. Encryption key management for secure data handling
4. Protected routes that require authentication

## Data Model

### Firestore Collections:

1. **clients** - Client information (name, contact details, etc.)
2. **payments** - Job tracking with status flow and timestamps
3. **payment_records** - Individual payment entries per job

## Security Features

- End-to-end encryption for sensitive data
- Encrypted invoice generation with key derivation
- Protected routes that require authentication
- Secure handling of API keys through environment variables

## Environment Setup

The app requires Firebase configuration in `.env` file with:
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN  
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID
- VITE_API_URL (for email sending)
- VITE_API_KEY (API key for email service)

## Testing

No explicit testing framework is configured in the provided codebase, but the structure supports unit testing of components and utilities.

## Deployment

The app can be deployed to Firebase Hosting using:
1. `npm install -g firebase-tools` (once)
2. `firebase login` (once)  
3. `firebase use --add` (to link project)
4. `npm run deploy` (builds and deploys)
