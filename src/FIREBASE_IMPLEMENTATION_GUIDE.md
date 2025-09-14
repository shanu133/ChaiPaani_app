# ChaiPaani - Firebase Backend Implementation Guide

This comprehensive guide will help you implement a complete Firebase backend for the ChaiPaani expense-splitting application as an alternative to Supabase.

## 📋 Table of Contents
1. [Project Setup](#project-setup)
2. [Firebase Configuration](#firebase-configuration)
3. [Authentication Setup](#authentication-setup)
4. [Firestore Database Structure](#firestore-database-structure)
5. [Security Rules](#security-rules)
6. [Cloud Functions](#cloud-functions)
7. [Frontend Integration](#frontend-integration)
8. [Google OAuth Setup](#google-oauth-setup)
9. [Real-time Features](#real-time-features)
10. [Storage Setup](#storage-setup)
11. [Push Notifications](#push-notifications)
12. [Security Best Practices](#security-best-practices)

## 🚀 Project Setup

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Google Analytics (optional)
4. Note down your project configuration

### 2. Install Firebase SDK
```bash
npm install firebase
npm install -g firebase-tools  # For deployment and functions
```

### 3. Environment Variables
Create `.env.local` file:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Firebase Configuration
Create `lib/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize messaging (with feature detection)
export const getMessagingInstance = async () => {
  const supported = await isSupported();
  return supported ? getMessaging(app) : null;
};

export default app;
```

## 🔐 Authentication Setup

### 1. Enable Authentication Providers
In Firebase Console:
- Go to Authentication > Sign-in method
- Enable Email/Password and Google providers

### 2. Create Auth Service
Create `lib/auth-service.ts`:

```typescript
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  User,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from './firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const authService = {
  // Sign up with email and password
  signUp: async (email: string, password: string, displayName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile
      await updateProfile(userCredential.user, { displayName });
      
      // Create user document in Firestore
      await createUserProfile(userCredential.user, { displayName });
      
      return { user: userCredential.user, error: null };
    } catch (error: any) {
      return { user: null, error: error.message };
    }
  },

  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { user: userCredential.user, error: null };
    } catch (error: any) {
      return { user: null, error: error.message };
    }
  },

  // Sign in with Google
  signInWithGoogle: async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // Create or update user profile
      await createUserProfile(result.user);
      
      return { user: result.user, error: null };
    } catch (error: any) {
      return { user: null, error: error.message };
    }
  },

  // Sign out
  signOut: async () => {
    try {
      await firebaseSignOut(auth);
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  // Get current user
  getCurrentUser: () => auth.currentUser,

  // Listen to auth state changes
  onAuthStateChanged: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  }
};

// Helper function to create user profile in Firestore
const createUserProfile = async (user: User, additionalData: any = {}) => {
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    const { displayName, email, photoURL } = user;
    const createdAt = new Date();
    
    try {
      await setDoc(userRef, {
        displayName,
        email,
        photoURL,
        createdAt,
        updatedAt: createdAt,
        ...additionalData
      });
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  }
  
  return userRef;
};
```

## 🗄️ Firestore Database Structure

### Collection Structure

```
users/
├── {userId}/
│   ├── uid: string
│   ├── email: string
│   ├── displayName: string
│   ├── photoURL: string
│   ├── createdAt: timestamp
│   └── updatedAt: timestamp

groups/
├── {groupId}/
│   ├── name: string
│   ├── description: string
│   ├── createdBy: string (userId)
│   ├── category: string
│   ├── imageUrl: string
│   ├── currency: string
│   ├── createdAt: timestamp
│   ├── updatedAt: timestamp
│   └── members: {
│       └── {userId}: {
│           role: 'admin' | 'member'
│           joinedAt: timestamp
│       }
│   }

expenses/
├── {expenseId}/
│   ├── groupId: string
│   ├── payerId: string
│   ├── description: string
│   ├── amount: number
│   ├── category: string
│   ├── notes: string
│   ├── receiptUrl: string
│   ├── expenseDate: timestamp
│   ├── createdAt: timestamp
│   ├── updatedAt: timestamp
│   └── splits: {
│       └── {userId}: {
│           amount: number
│           isSettled: boolean
│           settledAt: timestamp
│       }
│   }

settlements/
├── {settlementId}/
│   ├── groupId: string
│   ├── payerId: string
│   ├── receiverId: string
│   ├── amount: number
│   ├── description: string
│   └── settledAt: timestamp

notifications/
├── {notificationId}/
│   ├── userId: string
│   ├── type: string
│   ├── title: string
│   ├── message: string
│   ├── data: object
│   ├── isRead: boolean
│   └── createdAt: timestamp
```

### Initialize Database Service
Create `lib/db-service.ts`:

```typescript
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { db } from './firebase';

export const dbService = {
  // Groups
  createGroup: async (groupData: any, userId: string) => {
    try {
      const groupRef = await addDoc(collection(db, 'groups'), {
        ...groupData,
        createdBy: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        members: {
          [userId]: {
            role: 'admin',
            joinedAt: serverTimestamp()
          }
        }
      });
      return { id: groupRef.id, error: null };
    } catch (error: any) {
      return { id: null, error: error.message };
    }
  },

  getUserGroups: async (userId: string) => {
    try {
      const q = query(
        collection(db, 'groups'),
        where(`members.${userId}`, '!=', null)
      );
      const snapshot = await getDocs(q);
      const groups = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { groups, error: null };
    } catch (error: any) {
      return { groups: [], error: error.message };
    }
  },

  getGroupDetails: async (groupId: string) => {
    try {
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      if (groupDoc.exists()) {
        return { group: { id: groupDoc.id, ...groupDoc.data() }, error: null };
      } else {
        return { group: null, error: 'Group not found' };
      }
    } catch (error: any) {
      return { group: null, error: error.message };
    }
  },

  addMemberToGroup: async (groupId: string, userId: string) => {
    try {
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        [`members.${userId}`]: {
          role: 'member',
          joinedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  // Expenses
  createExpense: async (expenseData: any) => {
    try {
      return await runTransaction(db, async (transaction) => {
        const expenseRef = doc(collection(db, 'expenses'));
        
        transaction.set(expenseRef, {
          ...expenseData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        return expenseRef.id;
      });
    } catch (error: any) {
      throw new Error(error.message);
    }
  },

  getGroupExpenses: async (groupId: string) => {
    try {
      const q = query(
        collection(db, 'expenses'),
        where('groupId', '==', groupId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const expenses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { expenses, error: null };
    } catch (error: any) {
      return { expenses: [], error: error.message };
    }
  },

  getUserExpenses: async (userId: string, limitCount: number = 20) => {
    try {
      const q = query(
        collection(db, 'expenses'),
        where('payerId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      const expenses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { expenses, error: null };
    } catch (error: any) {
      return { expenses: [], error: error.message };
    }
  },

  // Settlements
  createSettlement: async (settlementData: any) => {
    try {
      const settlementRef = await addDoc(collection(db, 'settlements'), {
        ...settlementData,
        settledAt: serverTimestamp()
      });
      return { id: settlementRef.id, error: null };
    } catch (error: any) {
      return { id: null, error: error.message };
    }
  },

  // Notifications
  createNotification: async (notificationData: any) => {
    try {
      const notificationRef = await addDoc(collection(db, 'notifications'), {
        ...notificationData,
        isRead: false,
        createdAt: serverTimestamp()
      });
      return { id: notificationRef.id, error: null };
    } catch (error: any) {
      return { id: null, error: error.message };
    }
  },

  getUserNotifications: async (userId: string) => {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { notifications, error: null };
    } catch (error: any) {
      return { notifications: [], error: error.message };
    }
  },

  markNotificationAsRead: async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        isRead: true
      });
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  }
};
```

## 🛡️ Security Rules

Create Firestore Security Rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read and write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Groups rules
    match /groups/{groupId} {
      allow read: if request.auth != null && 
        request.auth.uid in resource.data.members;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.createdBy;
      allow update: if request.auth != null && 
        request.auth.uid in resource.data.members &&
        resource.data.members[request.auth.uid].role == 'admin';
      allow delete: if request.auth != null && 
        request.auth.uid == resource.data.createdBy;
    }
    
    // Expenses rules
    match /expenses/{expenseId} {
      allow read: if request.auth != null && 
        request.auth.uid in get(/databases/$(database)/documents/groups/$(resource.data.groupId)).data.members;
      allow create: if request.auth != null && 
        request.auth.uid in get(/databases/$(database)/documents/groups/$(request.resource.data.groupId)).data.members;
      allow update: if request.auth != null && 
        (request.auth.uid == resource.data.payerId || 
         request.auth.uid in get(/databases/$(database)/documents/groups/$(resource.data.groupId)).data.members);
      allow delete: if request.auth != null && 
        request.auth.uid == resource.data.payerId;
    }
    
    // Settlements rules
    match /settlements/{settlementId} {
      allow read: if request.auth != null && 
        (request.auth.uid == resource.data.payerId || 
         request.auth.uid == resource.data.receiverId);
      allow create: if request.auth != null && 
        (request.auth.uid == request.resource.data.payerId || 
         request.auth.uid == request.resource.data.receiverId);
    }
    
    // Notifications rules
    match /notifications/{notificationId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

## ☁️ Cloud Functions

### 1. Initialize Cloud Functions
```bash
firebase init functions
```

### 2. Create Expense Calculation Function
Create `functions/src/index.ts`:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// Function to calculate balances when expense is created
export const calculateBalances = functions.firestore
  .document('expenses/{expenseId}')
  .onCreate(async (snap, context) => {
    const expense = snap.data();
    const { groupId, splits } = expense;
    
    try {
      // Update group balance summary
      const groupRef = db.collection('groups').doc(groupId);
      const batch = db.batch();
      
      // Calculate net balances for each user
      for (const [userId, splitData] of Object.entries(splits as any)) {
        const userBalanceRef = groupRef.collection('balances').doc(userId);
        batch.set(userBalanceRef, {
          totalOwed: admin.firestore.FieldValue.increment(splitData.amount),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
      
      // Update payer's balance
      const payerBalanceRef = groupRef.collection('balances').doc(expense.payerId);
      batch.set(payerBalanceRef, {
        totalPaid: admin.firestore.FieldValue.increment(expense.amount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      await batch.commit();
      
      // Send notifications to split members
      await sendExpenseNotifications(expense, splits);
      
    } catch (error) {
      console.error('Error calculating balances:', error);
    }
  });

// Function to send notifications
const sendExpenseNotifications = async (expense: any, splits: any) => {
  const batch = db.batch();
  
  for (const [userId, splitData] of Object.entries(splits as any)) {
    if (userId !== expense.payerId) {
      const notificationRef = db.collection('notifications').doc();
      batch.set(notificationRef, {
        userId,
        type: 'expense_added',
        title: 'New Expense Added',
        message: `You owe ₹${splitData.amount} for "${expense.description}"`,
        data: {
          expenseId: expense.id,
          groupId: expense.groupId,
          amount: splitData.amount
        },
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  }
  
  await batch.commit();
};

// Function to handle group invitations
export const sendGroupInvitation = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { groupId, email } = data;
  
  try {
    // Find user by email
    const userQuery = await db.collection('users').where('email', '==', email).get();
    
    if (userQuery.empty) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }
    
    const userDoc = userQuery.docs[0];
    const userId = userDoc.id;
    
    // Create notification
    await db.collection('notifications').add({
      userId,
      type: 'group_invitation',
      title: 'Group Invitation',
      message: `You've been invited to join a group`,
      data: { groupId },
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error sending invitation:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send invitation');
  }
});

// Function to calculate optimal settlements
export const calculateSettlements = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { groupId } = data;
  
  try {
    // Get all balances for the group
    const balancesSnapshot = await db.collection('groups').doc(groupId).collection('balances').get();
    
    const balances: { [userId: string]: number } = {};
    
    balancesSnapshot.forEach(doc => {
      const data = doc.data();
      const netBalance = (data.totalPaid || 0) - (data.totalOwed || 0);
      if (netBalance !== 0) {
        balances[doc.id] = netBalance;
      }
    });
    
    // Calculate optimal settlements using greedy algorithm
    const settlements = calculateOptimalSettlements(balances);
    
    return { settlements };
  } catch (error) {
    console.error('Error calculating settlements:', error);
    throw new functions.https.HttpsError('internal', 'Failed to calculate settlements');
  }
});

// Helper function for settlement calculation
function calculateOptimalSettlements(balances: { [userId: string]: number }) {
  const creditors: Array<{ userId: string; amount: number }> = [];
  const debtors: Array<{ userId: string; amount: number }> = [];
  
  // Separate creditors and debtors
  for (const [userId, balance] of Object.entries(balances)) {
    if (balance > 0) {
      creditors.push({ userId, amount: balance });
    } else if (balance < 0) {
      debtors.push({ userId, amount: -balance });
    }
  }
  
  const settlements: Array<{ from: string; to: string; amount: number }> = [];
  
  // Greedy approach to minimize number of transactions
  let i = 0, j = 0;
  while (i < creditors.length && j < debtors.length) {
    const credit = creditors[i].amount;
    const debt = debtors[j].amount;
    const settled = Math.min(credit, debt);
    
    settlements.push({
      from: debtors[j].userId,
      to: creditors[i].userId,
      amount: settled
    });
    
    creditors[i].amount -= settled;
    debtors[j].amount -= settled;
    
    if (creditors[i].amount === 0) i++;
    if (debtors[j].amount === 0) j++;
  }
  
  return settlements;
}
```

### 3. Deploy Functions
```bash
firebase deploy --only functions
```

## 📱 Real-time Features

### Real-time Expense Updates
Create `hooks/useRealtimeExpenses.ts`:

```typescript
import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useRealtimeExpenses(groupId: string) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;

    const q = query(
      collection(db, 'expenses'),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const expensesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setExpenses(expensesList);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [groupId]);

  return { expenses, loading, error };
}
```

### Real-time Notifications
Create `hooks/useRealtimeNotifications.ts`:

```typescript
import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setNotifications(notificationsList);
      setUnreadCount(notificationsList.filter(n => !n.isRead).length);
    });

    return () => unsubscribe();
  }, [user]);

  return { notifications, unreadCount };
}
```

## 📂 Storage Setup

### 1. Enable Firebase Storage
In Firebase Console:
- Go to Storage
- Get started and set up security rules

### 2. Storage Service
Create `lib/storage-service.ts`:

```typescript
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

export const storageService = {
  uploadReceipt: async (file: File, expenseId: string) => {
    try {
      const storageRef = ref(storage, `receipts/${expenseId}/${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return { url: downloadURL, error: null };
    } catch (error: any) {
      return { url: null, error: error.message };
    }
  },

  uploadAvatar: async (file: File, userId: string) => {
    try {
      const storageRef = ref(storage, `avatars/${userId}/${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return { url: downloadURL, error: null };
    } catch (error: any) {
      return { url: null, error: error.message };
    }
  },

  deleteFile: async (path: string) => {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  }
};
```

## 🔔 Push Notifications

### 1. Enable Cloud Messaging
In Firebase Console:
- Go to Cloud Messaging
- Generate Web Push certificates

### 2. Setup Service Worker
Create `public/firebase-messaging-sw.js`:

```javascript
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
```

### 3. Messaging Service
Create `lib/messaging-service.ts`:

```typescript
import { getToken, onMessage } from 'firebase/messaging';
import { getMessagingInstance } from './firebase';

export const messagingService = {
  requestPermission: async () => {
    try {
      const messaging = await getMessagingInstance();
      if (!messaging) return { token: null, error: 'Messaging not supported' };

      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messaging, {
          vapidKey: 'your-vapid-key'
        });
        return { token, error: null };
      } else {
        return { token: null, error: 'Permission denied' };
      }
    } catch (error: any) {
      return { token: null, error: error.message };
    }
  },

  onMessage: async (callback: (payload: any) => void) => {
    const messaging = await getMessagingInstance();
    if (!messaging) return;

    onMessage(messaging, callback);
  }
};
```

## 🛡️ Security Best Practices

### 1. Environment Variables
- Use environment variables for all Firebase config
- Never expose sensitive keys in client code
- Use different projects for development/production

### 2. Security Rules
- Write restrictive Firestore rules
- Test rules thoroughly
- Use Firebase Rules Playground

### 3. Authentication
- Implement proper email verification
- Use secure password requirements
- Add rate limiting for auth operations

### 4. Data Validation
- Validate all inputs on client and server
- Use Firebase Admin SDK for server-side operations
- Implement proper error handling

## 🚀 Deployment

### 1. Build and Deploy
```bash
# Build your app
npm run build

# Deploy to Firebase Hosting
firebase deploy
```

### 2. Setup Firebase Hosting
```bash
firebase init hosting
```

### 3. Configure Hosting
Update `firebase.json`:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

## 📊 Analytics and Monitoring

### 1. Enable Analytics
In Firebase Console:
- Enable Google Analytics
- Set up conversion events

### 2. Add Performance Monitoring
```bash
npm install firebase/performance
```

```typescript
import { getPerformance } from 'firebase/performance';
import app from './firebase';

const perf = getPerformance(app);
```

## 🆘 Troubleshooting

### Common Issues:
- **CORS errors**: Check Firebase hosting configuration
- **Security rules blocking**: Review and test your rules
- **Real-time not working**: Check network and rule permissions
- **Functions not deploying**: Verify Node.js version compatibility

This comprehensive Firebase implementation provides a robust, scalable backend for ChaiPaani with real-time features, push notifications, and proper security measures.