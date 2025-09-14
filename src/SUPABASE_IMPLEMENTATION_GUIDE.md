# ChaiPaani - Supabase Backend Implementation Guide

This comprehensive guide will help you implement a complete Supabase backend for the ChaiPaani expense-splitting application.

## 📋 Table of Contents
1. [Project Setup](#project-setup)
2. [Database Schema](#database-schema)
3. [Authentication Setup](#authentication-setup)
4. [Row Level Security (RLS)](#row-level-security-rls)
5. [Database Functions](#database-functions)
6. [Frontend Integration](#frontend-integration)
7. [Google OAuth Setup](#google-oauth-setup)
8. [API Endpoints](#api-endpoints)
9. [Real-time Features](#real-time-features)
10. [Security Best Practices](#security-best-practices)

## 🚀 Project Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project URL and anon key
4. Install Supabase client:

```bash
npm install @supabase/supabase-js
```

### 2. Environment Variables
Create `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Supabase Client Setup
Create `lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions (add these as you build your schema)
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'id' | 'created_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      groups: {
        Row: Group
        Insert: Omit<Group, 'id' | 'created_at'>
        Update: Partial<Omit<Group, 'id' | 'created_at'>>
      }
      expenses: {
        Row: Expense
        Insert: Omit<Expense, 'id' | 'created_at'>
        Update: Partial<Omit<Expense, 'id' | 'created_at'>>
      }
      // ... other tables
    }
  }
}
```

## 🗄️ Database Schema

Execute these SQL commands in your Supabase SQL editor:

### 1. Profiles Table (User Information)
```sql
-- Create profiles table
CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Groups Table
```sql
-- Create groups table
CREATE TABLE groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    category TEXT DEFAULT 'general',
    image_url TEXT,
    currency TEXT DEFAULT 'INR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3. Group Members Table (Junction Table)
```sql
-- Create group_members table
CREATE TABLE group_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);
```

### 4. Expenses Table
```sql
-- Create expenses table
CREATE TABLE expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
    payer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    category TEXT DEFAULT 'other',
    notes TEXT,
    receipt_url TEXT,
    expense_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 5. Expense Splits Table
```sql
-- Create expense_splits table
CREATE TABLE expense_splits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    is_settled BOOLEAN DEFAULT FALSE,
    settled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(expense_id, user_id)
);
```

### 6. Settlements Table
```sql
-- Create settlements table
CREATE TABLE settlements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
    payer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    description TEXT,
    settled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 7. Create Indexes for Performance
```sql
-- Create indexes for better query performance
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_expenses_group_id ON expenses(group_id);
CREATE INDEX idx_expenses_payer_id ON expenses(payer_id);
CREATE INDEX idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user_id ON expense_splits(user_id);
CREATE INDEX idx_settlements_group_id ON settlements(group_id);
```

## 🔐 Authentication Setup

### 1. Enable Email Auth
In Supabase Dashboard:
- Go to Authentication > Settings
- Enable Email provider
- Configure email templates

### 2. Auto-create Profile Trigger
```sql
-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call function on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 🛡️ Row Level Security (RLS)

Enable RLS and create policies:

### 1. Enable RLS on all tables
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
```

### 2. Create RLS Policies

```sql
-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Groups policies
CREATE POLICY "Users can view groups they are members of" ON groups
    FOR SELECT USING (
        id IN (
            SELECT group_id FROM group_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create groups" ON groups
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups" ON groups
    FOR UPDATE USING (
        id IN (
            SELECT group_id FROM group_members 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Group members policies
CREATE POLICY "Users can view group members of their groups" ON group_members
    FOR SELECT USING (
        group_id IN (
            SELECT group_id FROM group_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Group admins can manage members" ON group_members
    FOR ALL USING (
        group_id IN (
            SELECT group_id FROM group_members 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Expenses policies
CREATE POLICY "Users can view expenses in their groups" ON expenses
    FOR SELECT USING (
        group_id IN (
            SELECT group_id FROM group_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Group members can create expenses" ON expenses
    FOR INSERT WITH CHECK (
        group_id IN (
            SELECT group_id FROM group_members 
            WHERE user_id = auth.uid()
        )
    );

-- Expense splits policies
CREATE POLICY "Users can view splits for expenses in their groups" ON expense_splits
    FOR SELECT USING (
        expense_id IN (
            SELECT e.id FROM expenses e
            JOIN group_members gm ON e.group_id = gm.group_id
            WHERE gm.user_id = auth.uid()
        )
    );

-- Settlements policies
CREATE POLICY "Users can view settlements in their groups" ON settlements
    FOR SELECT USING (
        group_id IN (
            SELECT group_id FROM group_members 
            WHERE user_id = auth.uid()
        )
    );
```

## ⚙️ Database Functions

### 1. Function to Add Expense with Splits
```sql
CREATE OR REPLACE FUNCTION create_expense_with_splits(
    p_group_id UUID,
    p_description TEXT,
    p_amount DECIMAL,
    p_category TEXT,
    p_notes TEXT,
    p_splits JSONB
)
RETURNS UUID AS $$
DECLARE
    expense_id UUID;
    split_record RECORD;
    total_splits DECIMAL := 0;
BEGIN
    -- Verify user is member of the group
    IF NOT EXISTS (
        SELECT 1 FROM group_members 
        WHERE group_id = p_group_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'User is not a member of this group';
    END IF;

    -- Calculate total splits
    FOR split_record IN SELECT * FROM jsonb_to_recordset(p_splits) AS x(user_id UUID, amount DECIMAL)
    LOOP
        total_splits := total_splits + split_record.amount;
    END LOOP;

    -- Verify splits equal total amount
    IF total_splits != p_amount THEN
        RAISE EXCEPTION 'Split amounts do not equal total expense amount';
    END IF;

    -- Create expense
    INSERT INTO expenses (group_id, payer_id, description, amount, category, notes)
    VALUES (p_group_id, auth.uid(), p_description, p_amount, p_category, p_notes)
    RETURNING id INTO expense_id;

    -- Create splits
    FOR split_record IN SELECT * FROM jsonb_to_recordset(p_splits) AS x(user_id UUID, amount DECIMAL)
    LOOP
        INSERT INTO expense_splits (expense_id, user_id, amount)
        VALUES (expense_id, split_record.user_id, split_record.amount);
    END LOOP;

    RETURN expense_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Function to Calculate User Balance in Group
```sql
CREATE OR REPLACE FUNCTION get_user_balance_in_group(
    p_group_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE(
    total_paid DECIMAL,
    total_owed DECIMAL,
    net_balance DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH user_payments AS (
        SELECT COALESCE(SUM(amount), 0) as paid
        FROM expenses 
        WHERE group_id = p_group_id AND payer_id = p_user_id
    ),
    user_shares AS (
        SELECT COALESCE(SUM(es.amount), 0) as owed
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE e.group_id = p_group_id AND es.user_id = p_user_id
    )
    SELECT 
        up.paid,
        us.owed,
        (up.paid - us.owed) as net_balance
    FROM user_payments up, user_shares us;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Function to Get Group Balance Summary
```sql
CREATE OR REPLACE FUNCTION get_group_balance_summary(p_group_id UUID)
RETURNS TABLE(
    user_id UUID,
    user_name TEXT,
    total_paid DECIMAL,
    total_owed DECIMAL,
    net_balance DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.full_name,
        (SELECT * FROM get_user_balance_in_group(p_group_id, p.id))
    FROM profiles p
    JOIN group_members gm ON p.id = gm.user_id
    WHERE gm.group_id = p_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 🔗 Frontend Integration

### 1. Create Supabase Service Layer
Create `lib/supabase-service.ts`:

```typescript
import { supabase } from './supabase'

// Auth functions
export const authService = {
  signUp: async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    })
    return { data, error }
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  signInWithGoogle: async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    return { data, error }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  }
}

// Groups functions
export const groupService = {
  createGroup: async (name: string, description: string, category: string = 'general') => {
    const { data, error } = await supabase
      .from('groups')
      .insert([{ name, description, category }])
      .select()
      .single()
    
    if (data && !error) {
      // Add creator as admin member
      await supabase
        .from('group_members')
        .insert([{ group_id: data.id, user_id: (await authService.getCurrentUser())?.id, role: 'admin' }])
    }
    
    return { data, error }
  },

  getUserGroups: async () => {
    const { data, error } = await supabase
      .from('groups')
      .select(`
        *,
        group_members!inner(user_id, role),
        expenses(id)
      `)
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  getGroupDetails: async (groupId: string) => {
    const { data, error } = await supabase
      .from('groups')
      .select(`
        *,
        group_members(
          user_id,
          role,
          profiles(id, full_name, avatar_url, email)
        ),
        expenses(
          *,
          payer:profiles!payer_id(full_name, avatar_url),
          expense_splits(
            *,
            user:profiles!user_id(full_name)
          )
        )
      `)
      .eq('id', groupId)
      .single()
    
    return { data, error }
  },

  addMemberToGroup: async (groupId: string, email: string) => {
    // First find user by email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()
    
    if (profileError) return { data: null, error: profileError }
    
    const { data, error } = await supabase
      .from('group_members')
      .insert([{ group_id: groupId, user_id: profile.id }])
      .select()
    
    return { data, error }
  }
}

// Expenses functions
export const expenseService = {
  createExpense: async (
    groupId: string,
    description: string,
    amount: number,
    category: string,
    notes: string,
    splits: { user_id: string; amount: number }[]
  ) => {
    const { data, error } = await supabase.rpc('create_expense_with_splits', {
      p_group_id: groupId,
      p_description: description,
      p_amount: amount,
      p_category: category,
      p_notes: notes,
      p_splits: splits
    })
    
    return { data, error }
  },

  getRecentExpenses: async (limit: number = 20) => {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        payer:profiles!payer_id(full_name, avatar_url),
        group:groups!group_id(name),
        expense_splits(
          amount,
          user:profiles!user_id(full_name)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    return { data, error }
  },

  getUserBalance: async (groupId?: string) => {
    if (groupId) {
      const { data, error } = await supabase.rpc('get_user_balance_in_group', {
        p_group_id: groupId
      })
      return { data: data?.[0], error }
    }
    
    // Get overall balance across all groups
    const { data, error } = await supabase
      .from('expense_splits')
      .select(`
        amount,
        expense:expenses!inner(
          payer_id,
          group:groups!inner(
            group_members!inner(user_id)
          )
        )
      `)
    
    // Calculate balance (complex logic - consider using a database function)
    return { data, error }
  }
}
```

### 2. Update Your React Components

Example updated `AuthPage` component:

```typescript
import { useState } from 'react'
import { authService } from '../lib/supabase-service'

export function AuthPage({ onLogin, onBack }: AuthPageProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: ''
  })

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const { data, error } = await authService.signUp(
      formData.email,
      formData.password,
      formData.fullName
    )
    
    if (error) {
      console.error('Sign up error:', error.message)
      // Handle error (show toast, etc.)
    } else {
      console.log('Check your email for verification!')
      // Handle success
    }
    
    setLoading(false)
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const { data, error } = await authService.signIn(
      formData.email,
      formData.password
    )
    
    if (error) {
      console.error('Sign in error:', error.message)
    } else {
      onLogin()
    }
    
    setLoading(false)
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    const { data, error } = await authService.signInWithGoogle()
    
    if (error) {
      console.error('Google sign in error:', error.message)
    }
    
    setLoading(false)
  }

  // ... rest of component
}
```

## 🔐 Google OAuth Setup

### 1. Configure Google OAuth in Supabase
1. Go to Authentication > Providers in Supabase Dashboard
2. Enable Google provider
3. Add your Google OAuth credentials:

### 2. Get Google OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials > Create Credentials > OAuth 2.0 Client ID
5. Add authorized redirect URIs:
   - `https://your-project-ref.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback` (for development)

### 3. Create Auth Callback Handler
Create `pages/auth/callback.tsx` (Next.js) or handle in your router:

```typescript
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN') {
          router.push('/dashboard')
        }
      }
    )

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [router])

  return <div>Loading...</div>
}
```

## 📡 Real-time Features

### 1. Real-time Expense Updates
```typescript
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useRealtimeExpenses(groupId: string) {
  const [expenses, setExpenses] = useState([])

  useEffect(() => {
    // Subscribe to expense changes
    const subscription = supabase
      .channel('expenses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          console.log('Expense change:', payload)
          // Handle real-time updates
          if (payload.eventType === 'INSERT') {
            setExpenses(prev => [payload.new, ...prev])
          }
          // Handle UPDATE and DELETE similarly
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [groupId])

  return expenses
}
```

## 🛡️ Security Best Practices

### 1. Environment Variables
- Never expose service role key in client-side code
- Use environment variables for all sensitive data
- Different keys for development/production

### 2. RLS Policies
- Always enable RLS on tables with sensitive data
- Write restrictive policies - only allow what's necessary
- Test policies thoroughly

### 3. Input Validation
```typescript
// Example validation schema using Zod
import { z } from 'zod'

const expenseSchema = z.object({
  description: z.string().min(1).max(100),
  amount: z.number().positive(),
  category: z.string().min(1),
  splits: z.array(z.object({
    user_id: z.string().uuid(),
    amount: z.number().positive()
  }))
})

// Use in your API calls
export const createExpense = async (data: unknown) => {
  const validatedData = expenseSchema.parse(data)
  // Proceed with validated data
}
```

### 4. Rate Limiting
Implement rate limiting for API calls to prevent abuse.

## 🚀 Deployment Checklist

### Before Going Live:
- [ ] Set up production Supabase project
- [ ] Configure proper RLS policies
- [ ] Set up Google OAuth for production domain
- [ ] Test all authentication flows
- [ ] Set up proper error handling and logging
- [ ] Configure email templates
- [ ] Set up database backups
- [ ] Test real-time features
- [ ] Implement proper loading states
- [ ] Add input validation on all forms
- [ ] Test edge cases and error scenarios

## 📱 Next Steps

1. **Implement the database schema** in your Supabase project
2. **Set up authentication** with email and Google OAuth
3. **Create the service layer** functions for API calls
4. **Update your React components** to use real data
5. **Add real-time features** for live expense updates
6. **Implement proper error handling** and loading states
7. **Test thoroughly** before deploying

This implementation will give you a production-ready backend for ChaiPaani with proper security, real-time features, and scalability.

## 🆘 Troubleshooting

### Common Issues:
- **RLS blocking queries**: Check your policies are correctly written
- **Google OAuth not working**: Verify redirect URIs match exactly
- **Real-time not updating**: Check subscription setup and network connection
- **Database functions failing**: Check function syntax and parameter types

For more help, refer to the [Supabase documentation](https://supabase.com/docs) or reach out to the community.

## 📋 Quick Implementation Checklist

### Phase 1: Basic Setup (Week 1)
- [ ] Create Supabase project and get credentials
- [ ] Set up basic database schema (users, groups, group_members)
- [ ] Implement email authentication
- [ ] Create basic group CRUD operations
- [ ] Set up RLS policies for groups and users

### Phase 2: Core Features (Week 2)
- [ ] Complete expense and expense_splits tables
- [ ] Implement expense creation with splits
- [ ] Add balance calculation functions
- [ ] Create settlements table and functionality
- [ ] Implement real-time expense updates

### Phase 3: Advanced Features (Week 3)
- [ ] Set up Google OAuth
- [ ] Add push notifications system
- [ ] Implement file upload for receipts
- [ ] Create activity feed
- [ ] Add settlement optimization algorithms

### Phase 4: Polish & Deploy (Week 4)
- [ ] Comprehensive error handling
- [ ] Loading states and skeleton screens
- [ ] Email templates customization
- [ ] Performance optimization
- [ ] Production deployment

## 🎯 Non-Functional Features Implementation Plan

### Activity Feed Implementation
```sql
-- Create activities table for comprehensive logging
CREATE TABLE activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- 'expense_added', 'member_joined', 'settlement_made'
    description TEXT NOT NULL,
    metadata JSONB, -- Store additional data like expense_id, amount, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to log activities automatically
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $
BEGIN
    -- Log different types of activities based on table
    IF TG_TABLE_NAME = 'expenses' THEN
        INSERT INTO activities (user_id, group_id, activity_type, description, metadata)
        VALUES (
            NEW.payer_id,
            NEW.group_id,
            'expense_added',
            NEW.description || ' - ₹' || NEW.amount,
            jsonb_build_object('expense_id', NEW.id, 'amount', NEW.amount)
        );
    ELSIF TG_TABLE_NAME = 'group_members' THEN
        INSERT INTO activities (user_id, group_id, activity_type, description)
        VALUES (
            NEW.user_id,
            NEW.group_id,
            'member_joined',
            'Joined the group'
        );
    END IF;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER log_expense_activity AFTER INSERT ON expenses
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER log_member_activity AFTER INSERT ON group_members
    FOR EACH ROW EXECUTE FUNCTION log_activity();
```

### Notifications System Implementation
```sql
-- Create notifications table
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL, -- 'expense_added', 'payment_reminder', 'settlement_request'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Additional notification data
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to create notifications
CREATE OR REPLACE FUNCTION create_expense_notifications()
RETURNS TRIGGER AS $
DECLARE
    split_record RECORD;
    payer_name TEXT;
BEGIN
    -- Get payer name
    SELECT full_name INTO payer_name FROM profiles WHERE id = NEW.payer_id;
    
    -- Create notifications for all users involved in the split
    FOR split_record IN 
        SELECT * FROM expense_splits WHERE expense_id = NEW.id AND user_id != NEW.payer_id
    LOOP
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
            split_record.user_id,
            'expense_added',
            'New Expense Added',
            payer_name || ' paid ₹' || NEW.amount || ' for ' || NEW.description || '. You owe ₹' || split_record.amount,
            jsonb_build_object(
                'expense_id', NEW.id,
                'group_id', NEW.group_id,
                'amount', split_record.amount,
                'payer_id', NEW.payer_id
            )
        );
    END LOOP;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER create_expense_notifications_trigger 
    AFTER INSERT ON expenses
    FOR EACH ROW EXECUTE FUNCTION create_expense_notifications();
```

### Settings Page Implementation
```typescript
// Create settings service
export const settingsService = {
  updateProfile: async (updates: Partial<Profile>) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', (await authService.getCurrentUser())?.id)
      .select()
      .single()
    
    return { data, error }
  },

  updateNotificationPreferences: async (preferences: NotificationPreferences) => {
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: (await authService.getCurrentUser())?.id,
        ...preferences
      })
      .select()
      .single()
    
    return { data, error }
  },

  exportUserData: async () => {
    const userId = (await authService.getCurrentUser())?.id
    
    // Get all user data
    const [groups, expenses, settlements] = await Promise.all([
      supabase.from('groups').select('*').eq('created_by', userId),
      supabase.from('expenses').select('*').eq('payer_id', userId),
      supabase.from('settlements').select('*').or(`payer_id.eq.${userId},receiver_id.eq.${userId}`)
    ])
    
    return {
      groups: groups.data,
      expenses: expenses.data,
      settlements: settlements.data,
      exportDate: new Date().toISOString()
    }
  },

  deleteAccount: async () => {
    // This would typically be handled by a cloud function for data cleanup
    const { error } = await supabase.rpc('delete_user_account')
    return { error }
  }
}
```

## 🔧 Database Optimization Tips

### Indexing Strategy
```sql
-- Performance indexes for common queries
CREATE INDEX CONCURRENTLY idx_expenses_group_date ON expenses(group_id, expense_date DESC);
CREATE INDEX CONCURRENTLY idx_expense_splits_user_settled ON expense_splits(user_id, is_settled);
CREATE INDEX CONCURRENTLY idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX CONCURRENTLY idx_activities_group_date ON activities(group_id, created_at DESC);

-- Partial indexes for better performance
CREATE INDEX CONCURRENTLY idx_notifications_unread ON notifications(user_id, created_at DESC) 
WHERE is_read = FALSE;
```

### Backup Strategy
```sql
-- Regular backup function
CREATE OR REPLACE FUNCTION backup_user_data(p_user_id UUID)
RETURNS JSONB AS $
DECLARE
    user_data JSONB;
BEGIN
    SELECT jsonb_build_object(
        'profile', (SELECT row_to_json(p) FROM profiles p WHERE id = p_user_id),
        'groups', (SELECT array_agg(row_to_json(g)) FROM groups g 
                   JOIN group_members gm ON g.id = gm.group_id 
                   WHERE gm.user_id = p_user_id),
        'expenses', (SELECT array_agg(row_to_json(e)) FROM expenses e WHERE payer_id = p_user_id),
        'splits', (SELECT array_agg(row_to_json(es)) FROM expense_splits es WHERE user_id = p_user_id)
    ) INTO user_data;
    
    RETURN user_data;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;
```

This comprehensive implementation guide now includes everything you need to build a production-ready ChaiPaani application with Supabase backend!