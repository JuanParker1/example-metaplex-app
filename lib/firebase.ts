import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_FIREBASE_API,
  authDomain: 'example-metaplex.firebaseapp.com',
  projectId: 'example-metaplex',
  storageBucket: 'example-metaplex.appspot.com',
  messagingSenderId: '381161497660',
  appId: '1:381161497660:web:e46f040edf97f71e788f39',
};

export const app = initializeApp(firebaseConfig);
export const database = getFirestore(app);
