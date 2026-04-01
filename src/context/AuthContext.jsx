import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';
import { subscribeUserProfile } from '../firebase/profile';
import { EncryptionPrompt } from '../components/EncryptionPrompt';
import { setGlobalEncryptionKey, getCachedEncryptionKey, clearCachedEncryptionKey } from '../utils/encryption';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [encryptionKey, setEncryptionKey] = useState(null);

  useEffect(() => {
    let unsubProfile = null;
    let currentUid = null;
    
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser?.uid) {
        currentUid = firebaseUser.uid;
        if (unsubProfile) unsubProfile();
        unsubProfile = subscribeUserProfile(firebaseUser.uid, (data) => {
          setProfile(data);
          
          if (data?.encryptionSetup) {
            const cachedKey = getCachedEncryptionKey(firebaseUser.uid);
            if (cachedKey) {
              setGlobalEncryptionKey(cachedKey);
              setEncryptionKey(cachedKey);
            }
          }
          
          setLoading(false);
        });
      } else {
        if (currentUid) {
          clearCachedEncryptionKey(currentUid);
          currentUid = null;
        }
        setProfile(null);
        setEncryptionKey(null); // Clear key on logout
        setGlobalEncryptionKey(null); // Clear global DEK
        setLoading(false);
        if (unsubProfile) unsubProfile();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const handleUnlock = (key) => {
    setGlobalEncryptionKey(key);
    setEncryptionKey(key);
  };

  const value = { user, profile, loading, encryptionKey };

  // Only demand encryption unlock if user is fully logged in and profile is loaded
  const needsUnlock = user && profile !== null && !encryptionKey;

  return (
    <AuthContext.Provider value={value}>
      {needsUnlock ? <EncryptionPrompt user={user} profile={profile} onUnlock={handleUnlock} /> : children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
