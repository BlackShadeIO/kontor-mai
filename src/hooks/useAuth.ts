import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { sessionManager } from '@/lib/sessionManager';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let initializationTimeout: NodeJS.Timeout;

    // Debounced session initialization
    const initializeSessionDebounced = (userId: string, delay: number = 100) => {
      clearTimeout(initializationTimeout);
      initializationTimeout = setTimeout(async () => {
        console.log('Initializing session (debounced)...');
        try {
          await sessionManager.initializeSession(userId);
        } catch (sessionError) {
          console.warn('Session initialization failed, continuing without session tracking:', sessionError);
        }
      }, delay);
    };

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        
        // Only initialize session if we have a valid authenticated user
        if (session?.user && session.access_token) {
          console.log('User is authenticated, initializing session...');
          initializeSessionDebounced(session.user.id, 0); // No delay for initial session
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN' && session?.user && session.access_token) {
          console.log('User signed in, creating session...');
          initializeSessionDebounced(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out, cleaning up session...');
          try {
            // Clean up session when user signs out
            await sessionManager.cleanup();
          } catch (sessionError) {
            console.warn('Session cleanup failed:', sessionError);
            // Don't throw error, just continue
          }
        }
      }
    );

    // Update activity periodically when user is active
    const activityInterval = setInterval(() => {
      // Get current user state to avoid closure issues
      supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
        if (currentUser) {
          sessionManager.updateActivity().catch(error => {
            console.warn('Failed to update session activity:', error);
            // Don't throw error, just continue
          });
        }
      });
    }, 60000); // Update every minute

    // Clean up on unmount
    return () => {
      clearTimeout(initializationTimeout);
      subscription.unsubscribe();
      clearInterval(activityInterval);
    };
  }, []); // Remove user dependency to prevent infinite loop

  const signOut = async () => {
    try {
      await sessionManager.cleanup();
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return {
    user,
    loading,
    signOut
  };
}; 