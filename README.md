# ChaiPaani - Bill Splitting App

A modern, full-featured expense splitting application built with React, TypeScript, Vite, and Supabase. Split bills effortlessly with friends and keep track of who owes what!

## ✨ Features

- **🔐 Authentication**: Email/password and Google OAuth sign-in
- **👥 Group Management**: Create and manage expense groups
- **💰 Expense Tracking**: Add expenses with automatic splitting
- **📊 Balance Calculation**: Real-time balance updates and settlements
- **📱 Responsive Design**: Works perfectly on desktop and mobile
- **🔒 Secure**: Row Level Security (RLS) protects all user data
- **⚡ Real-time**: Live updates for expenses and balances
- **🎨 Modern UI**: Beautiful interface with Tailwind CSS and Radix UI

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier available)

### 1. Clone and Install

```bash
git clone <your-github-repo-url>
cd bill-splitting-app
npm install
```

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project credentials
3. Copy `.env.example` to `.env.local` and fill in your credentials:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Database Setup

Run the SQL script in your Supabase SQL Editor:

1. Copy the entire SQL script from `src/SUPABASE_IMPLEMENTATION_GUIDE.md`
2. Paste it into your Supabase SQL Editor
3. Execute the script to create all tables, functions, and security policies

### 4. Authentication Setup

In your Supabase dashboard:

1. Go to Authentication > Settings
2. Enable Email provider
3. (Optional) Configure Google OAuth:
   - Go to Authentication > Providers
   - Enable Google provider
   - Add your Google OAuth credentials

### 5. Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` to see your app!

## 📁 Project Structure

```
src/
├── components/           # React components
│   ├── ui/              # Reusable UI components (Radix UI)
│   ├── auth-page.tsx    # Authentication page
│   ├── groups-page.tsx  # Groups management
│   ├── dashboard.tsx    # Main dashboard
│   └── ...
├── lib/                 # Utilities and services
│   ├── supabase.ts      # Supabase client configuration
│   ├── supabase-service.ts # API service functions
│   └── ...
├── assets/              # Static assets
└── styles/              # Global styles
```

## 🗄️ Database Schema

The application uses the following main tables:

- **profiles**: User information (linked to auth.users)
- **groups**: Expense groups with metadata
- **group_members**: Junction table for group membership
- **expenses**: Individual expense records
- **expense_splits**: How expenses are split among members
- **settlements**: Payment settlements between users
- **notifications**: User notifications
- **activities**: Activity feed for groups

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repo to Vercel
3. Add environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

### Other Platforms

The app can be deployed to any static hosting service:
- Netlify
- GitHub Pages
- AWS S3 + CloudFront
- etc.

## 🔒 Security Features

- **Row Level Security (RLS)**: Users can only access their own data
- **Authentication Required**: All data operations require valid auth
- **Secure API Keys**: Environment variables for sensitive data
- **Input Validation**: Client and server-side validation
- **SQL Injection Protection**: Parameterized queries

## 🎯 Key Technologies

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Radix UI
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **State Management**: React hooks
- **Icons**: Lucide React
- **Notifications**: Sonner

## 📱 Features Overview

### Authentication
- Email/password registration and login
- Google OAuth integration
- Password reset functionality
- Secure session management

### Group Management
- Create groups with custom names and categories
- Invite members via email
- View group statistics and balances
- Real-time member updates

### Expense Tracking
- Add expenses with descriptions and categories
- Automatic splitting among group members
- Receipt upload support (future feature)
- Expense editing and deletion

### Balance Management
- Real-time balance calculations
- Settlement tracking
- Payment reminders
- Balance history

### Real-time Features
- Live expense updates
- Instant notifications
- Real-time balance changes
- Activity feed updates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit: `git commit -m 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Original UI design from Figma
- Built with modern React best practices
- Powered by Supabase for backend services
- UI components from Radix UI

## 📞 Support

If you have any questions or need help:

1. Check the Supabase documentation
2. Review the implementation guide in `src/SUPABASE_IMPLEMENTATION_GUIDE.md`
3. Open an issue on GitHub

---

**Happy splitting! 🎉**

## 🔥 Firebase Hosting

This app can be deployed to Firebase Hosting as a static SPA.

Setup:
- Ensure Firebase CLI is installed and you’re logged in: `npm i -g firebase-tools` then `firebase login`.
- Update `.firebaserc` with your Firebase project id.
- Confirm `firebase.json` points `public` to `build` and rewrites all routes to `/index.html`.

Deploy:
1. Build the app: `npm run build` (emits to `build/`).
2. Preview locally (optional): `firebase emulators:start --only hosting`.
3. Deploy: `firebase deploy --only hosting`.

Environment:
- Supabase env vars use Vite prefixes (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). Set these before building for production, or in your CI.