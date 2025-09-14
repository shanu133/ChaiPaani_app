# ChaiPaani Development Guidelines

## Overview
ChaiPaani is a friendly expense-splitting tool with an Indian cultural theme. This document outlines the design system, development guidelines, and backend setup instructions.

## Design System

### Brand Colors
- **Primary**: #315CAD (Deep blue) - For main buttons, accent colors, and primary text
- **Secondary**: #D07C49 (Warm terracotta) - For highlights, secondary buttons, and accent elements
- **Background**: #F5F5F5 (Off-white) - Main page background
- **Surface**: #FFFFFF (Pure white) - For cards and elevated surfaces
- **Text Primary**: #2C3E50 (Dark blue-gray) - Main text content
- **Text Secondary**: #5A6C7D (Medium gray) - Secondary text and labels
- **Text Muted**: #8B9CAD (Light gray) - Placeholder and muted text

### Typography
- **Font Family**: Inter (Google Fonts)
- **Base Font Size**: 16px
- Use system default font weights and sizes unless specifically overriding
- Maintain consistent hierarchy with semantic heading tags

### Component Guidelines
- Use minimalistic design with subtle gradients and shadows
- Maintain 12px border radius for consistency (--radius: 0.75rem)
- Button sizes should be consistent with the design system
- Use the brand color palette for component variations
- Ensure responsive design across all screen sizes

### Currency Display
- Always use Indian Rupee (₹) symbol instead of dollar signs
- Format numbers with proper localization (e.g., ₹1,200 not ₹1200)

## Backend Setup Instructions

### Option 1: Supabase Setup

#### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your Project URL and anon public API key from Settings > API

#### 2. Database Schema
Create the following tables in your Supabase project:

```sql
-- Users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  full_name VARCHAR,
  avatar_url VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Groups table
CREATE TABLE groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  category VARCHAR DEFAULT 'general',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group members table
CREATE TABLE group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Expenses table
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR DEFAULT 'INR',
  paid_by UUID REFERENCES users(id),
  receipt_url VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expense splits table
CREATE TABLE expense_splits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  settled BOOLEAN DEFAULT FALSE
);
```

#### 3. Authentication Setup
1. Enable Google OAuth in Supabase Auth settings
2. Add your Google OAuth credentials
3. Set up Row Level Security (RLS) policies for data protection

#### 4. Environment Variables
Create a `.env.local` file:
```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Option 2: Firebase Setup

#### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project and enable Firestore Database

#### 2. Firestore Schema
Create the following collections:

- `users/{userId}` - User profiles
- `groups/{groupId}` - Group information
- `groups/{groupId}/members/{userId}` - Group membership
- `groups/{groupId}/expenses/{expenseId}` - Expenses within groups
- `expenses/{expenseId}/splits/{userId}` - Individual expense splits

#### 3. Authentication Setup
1. Enable Google Authentication in Firebase Auth
2. Set up security rules for Firestore

#### 4. Environment Variables
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
```

## OCR Receipt Scanning

### Implementation Options

#### Option 1: Google Cloud Vision API
```javascript
// Install: npm install @google-cloud/vision
import vision from '@google-cloud/vision';

const client = new vision.ImageAnnotatorClient({
  keyFilename: 'path/to/service-account-key.json'
});

async function extractReceiptText(imageBuffer) {
  const [result] = await client.textDetection(imageBuffer);
  const detections = result.textAnnotations;
  return detections[0]?.description || '';
}
```

#### Option 2: Tesseract.js (Client-side)
```javascript
// Install: npm install tesseract.js
import Tesseract from 'tesseract.js';

async function extractReceiptText(imageFile) {
  const { data: { text } } = await Tesseract.recognize(imageFile, 'eng');
  return text;
}
```

#### Option 3: Azure Computer Vision
```javascript
// Install: npm install @azure/cognitiveservices-computervision
// Use Azure Computer Vision Read API for text extraction
```

### Receipt Processing Pipeline
1. **Image Capture**: Use device camera or file upload
2. **Preprocessing**: Enhance image quality, adjust contrast
3. **OCR Processing**: Extract text using chosen OCR service
4. **Text Parsing**: Use regex patterns to extract amounts, dates, items
5. **Smart Suggestions**: Present extracted data for user confirmation
6. **Manual Override**: Allow users to edit extracted information

### Sample Receipt Parser
```javascript
function parseReceiptText(text) {
  // Extract total amount
  const totalMatch = text.match(/total\s*:?\s*₹?\s*(\d+(?:\.\d{2})?)/i);
  const amount = totalMatch ? parseFloat(totalMatch[1]) : null;
  
  // Extract date
  const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
  const date = dateMatch ? new Date(dateMatch[1]) : new Date();
  
  // Extract merchant name (usually first line)
  const lines = text.split('\n').filter(line => line.trim());
  const merchantName = lines[0]?.trim() || 'Unknown Merchant';
  
  return { amount, date, merchantName };
}
```

## UI/UX Guidelines

### Button Overflow Prevention
- Use `min-w-0` class to prevent button text overflow
- Add `truncate` class to button text spans when needed
- Use `flex-shrink-0` for icons to prevent compression
- Consider responsive text sizes (text-xs on mobile, text-sm on desktop)

### Logo Sizing
- Mobile logos: h-17 (68px)
- Desktop logos: h-22 (88px)
- Footer logos: h-10 (40px)
- Maintain consistent aspect ratios across all screen sizes

### Color Usage in Components
- Use alternating color schemes in feature grids
- Apply subtle gradients with brand colors
- Use `bg-gradient-to-br from-primary/5 to-primary/10` for subtle backgrounds
- Maintain accessibility with sufficient color contrast

## Security Considerations

### Data Protection
- Never store sensitive financial data in plain text
- Use encrypted connections for all API calls
- Implement proper authentication and authorization
- Follow GDPR compliance for user data

### API Security
- Use environment variables for all API keys
- Implement rate limiting for OCR services
- Validate and sanitize all user inputs
- Use HTTPS for all communications

## Development Workflow

1. **Frontend First**: Build complete UI with mock data
2. **Backend Integration**: Connect to chosen backend service
3. **Authentication**: Implement Google OAuth login
4. **Data Persistence**: Set up database operations
5. **OCR Integration**: Add receipt scanning functionality
6. **Testing**: Comprehensive testing across devices
7. **Deployment**: Deploy with proper environment configuration

## Performance Optimization

- Lazy load images and non-critical components
- Implement proper caching strategies
- Optimize bundle size with tree shaking
- Use image optimization for receipt processing
- Implement offline functionality where possible

Remember: ChaiPaani is designed to strengthen relationships, not strain them. Every feature should prioritize user experience and cultural sensitivity.