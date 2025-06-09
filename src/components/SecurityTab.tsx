'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { sessionManager, UserSession } from '@/lib/sessionManager';

interface SecurityTabProps {
  user: User;
  onMessage: (message: { type: 'success' | 'error'; text: string }) => void;
}

export default function SecurityTab({ user, onMessage }: SecurityTabProps) {
  const [passwords, setPasswords] = useState({
    new: '',
    confirm: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
    strength: 0
  });
  const [showValidation, setShowValidation] = useState(false);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [revokingSession, setRevokingSession] = useState<string | null>(null);

  // Live password validation
  const validatePassword = (password: string) => {
    const validation = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      strength: 0
    };

    // Calculate strength score (0-100)
    let strength = 0;
    if (validation.length) strength += 20;
    if (validation.uppercase) strength += 15;
    if (validation.lowercase) strength += 15;
    if (validation.number) strength += 15;
    if (validation.special) strength += 20;
    
    // Bonus points for longer passwords
    if (password.length >= 12) strength += 10;
    if (password.length >= 16) strength += 5;

    validation.strength = Math.min(strength, 100);
    return validation;
  };

  const getStrengthColor = (strength: number) => {
    if (strength < 30) return 'bg-red-500';
    if (strength < 60) return 'bg-yellow-500';
    if (strength < 80) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthText = (strength: number) => {
    if (strength < 30) return 'Weak';
    if (strength < 60) return 'Fair';
    if (strength < 80) return 'Good';
    return 'Strong';
  };

  const handlePasswordInput = (value: string, field: 'new' | 'confirm') => {
    setPasswords(prev => ({ ...prev, [field]: value }));
    
    if (field === 'new') {
      const validation = validatePassword(value);
      setPasswordValidation(validation);
      setShowValidation(value.length > 0);
    }
  };

  useEffect(() => {
    // Only load sessions if user is authenticated
    if (user && user.id) {
      loadSessions();
    }
  }, [user]);

  const loadSessions = async () => {
    try {
      setLoadingSessions(true);
      
      // Double-check authentication before loading sessions
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.log('User not authenticated, skipping session load');
        setSessions([]);
        return;
      }

      // Test connection first
      const connectionOk = await sessionManager.testConnection();
      if (!connectionOk) {
        console.warn('Supabase connection failed, unable to load sessions');
        onMessage({ type: 'error', text: 'Unable to connect to session service. Session management temporarily unavailable.' });
        setSessions([]);
        return;
      }
      
      const userSessions = await sessionManager.getUserSessions();
      setSessions(userSessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      onMessage({ type: 'error', text: 'Failed to load sessions. Please try again later.' });
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwords.new !== passwords.confirm) {
      onMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordValidation.strength < 60) {
      onMessage({ type: 'error', text: 'Password is too weak. Please choose a stronger password.' });
      return;
    }

    setChangingPassword(true);

    try {
      console.log('Attempting to update password...');
      
      const { error } = await supabase.auth.updateUser({
        password: passwords.new
      });

      if (error) {
        console.error('Password update error:', error);
        throw error;
      }

      console.log('Password updated successfully');
      setPasswords({ new: '', confirm: '' });
      setPasswordValidation({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
        strength: 0
      });
      setShowValidation(false);
      onMessage({ 
        type: 'success', 
        text: 'Password updated successfully!' 
      });
    } catch (error: unknown) {
      console.error('Password change error:', error);
      
      // Handle specific error cases
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('Password should be at least')) {
        onMessage({ type: 'error', text: errorMessage });
      } else if (errorMessage.includes('same password')) {
        onMessage({ type: 'error', text: 'New password must be different from your current password' });
      } else if (errorMessage.includes('too weak')) {
        onMessage({ type: 'error', text: 'Password is too weak. Please choose a stronger password.' });
      } else if (errorMessage.includes('policy')) {
        onMessage({ type: 'error', text: 'Password does not meet security requirements' });
      } else {
        onMessage({ 
          type: 'error', 
          text: errorMessage || 'Failed to update password. Please try again.' 
        });
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSession(sessionId);
    try {
      const success = await sessionManager.revokeSession(sessionId);
      if (success) {
        onMessage({ type: 'success', text: 'Session revoked successfully' });
        await loadSessions(); // Refresh the list
      } else {
        onMessage({ type: 'error', text: 'Failed to revoke session' });
      }
    } catch {
      onMessage({ type: 'error', text: 'Failed to revoke session' });
    } finally {
      setRevokingSession(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    try {
      const revokedCount = await sessionManager.revokeAllOtherSessions();
      onMessage({ 
        type: 'success', 
        text: `${revokedCount} session${revokedCount !== 1 ? 's' : ''} revoked successfully` 
      });
      await loadSessions(); // Refresh the list
    } catch {
      onMessage({ type: 'error', text: 'Failed to revoke sessions' });
    }
  };

  const formatLastActivity = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  const getDeviceIcon = (device?: string) => {
    switch (device?.toLowerCase()) {
      case 'iphone':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case 'ipad':
      case 'android tablet':
      case 'tablet':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
          </svg>
        );
      case 'android phone':
      case 'mobile device':
      case 'mobile':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case 'desktop':
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  const isCurrentSession = (session: UserSession) => {
    return session.session_token === sessionManager.getCurrentSessionToken();
  };

  return (
    <div className="space-y-6">
      {/* Password Change */}
      <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Change Password</h3>
          <p className="text-gray-600 dark:text-gray-400">Update your account password</p>
        </div>
        
        <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={passwords.new}
              onChange={(e) => handlePasswordInput(e.target.value, 'new')}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter new password"
              required
            />
            
            {/* Live Password Validation */}
            {showValidation && (
              <div className="mt-3 space-y-3">
                {/* Strength Meter */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Password Strength</span>
                    <span className={`font-medium ${passwordValidation.strength < 30 ? 'text-red-500' : 
                      passwordValidation.strength < 60 ? 'text-yellow-500' : 
                      passwordValidation.strength < 80 ? 'text-blue-500' : 'text-green-500'}`}>
                      {getStrengthText(passwordValidation.strength)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(passwordValidation.strength)}`}
                      style={{ width: `${passwordValidation.strength}%` }}
                    ></div>
                  </div>
                </div>

                {/* Requirements Checklist */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      passwordValidation.length ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}>
                      {passwordValidation.length && (
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className={passwordValidation.length ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
                      At least 8 characters
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      passwordValidation.uppercase ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}>
                      {passwordValidation.uppercase && (
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className={passwordValidation.uppercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
                      One uppercase letter (A-Z)
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      passwordValidation.lowercase ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}>
                      {passwordValidation.lowercase && (
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className={passwordValidation.lowercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
                      One lowercase letter (a-z)
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      passwordValidation.number ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}>
                      {passwordValidation.number && (
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className={passwordValidation.number ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
                      One number (0-9)
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      passwordValidation.special ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}>
                      {passwordValidation.special && (
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className={passwordValidation.special ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
                      One special character (!@#$%^&*)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={passwords.confirm}
              onChange={(e) => handlePasswordInput(e.target.value, 'confirm')}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Confirm new password"
              required
            />
            
            {/* Password Confirmation Feedback */}
            {passwords.confirm && (
              <div className="mt-2">
                {passwords.new === passwords.confirm ? (
                  <div className="flex items-center space-x-2 text-xs text-green-600 dark:text-green-400">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Passwords match</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-xs text-red-500">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    <span>Passwords do not match</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={changingPassword || !passwords.new || !passwords.confirm || passwords.new !== passwords.confirm || passwordValidation.strength < 60}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              {changingPassword && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>Update Password</span>
            </button>
          </div>
        </form>
      </div>

      {/* Active Sessions */}
      <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Sessions</h3>
              <p className="text-gray-600 dark:text-gray-400">Manage your active login sessions</p>
            </div>
            {sessions.length > 1 && (
              <button
                onClick={handleRevokeAllOthers}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Revoke All Others
              </button>
            )}
          </div>
        </div>
        
        <div className="p-6">
          {loadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 dark:text-gray-400 mb-2">
                No active sessions found
              </div>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Sessions will appear here when session tracking is available
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div 
                  key={session.id} 
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    isCurrentSession(session)
                      ? 'border-green-200 bg-green-50 dark:border-green-500/20 dark:bg-green-500/10'
                      : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isCurrentSession(session)
                        ? 'bg-green-100 dark:bg-green-500/20'
                        : 'bg-blue-100 dark:bg-blue-500/20'
                    }`}>
                      <span className={isCurrentSession(session) ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}>
                        {getDeviceIcon(session.device_info?.device)}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {session.device_info?.browser || 'Unknown Browser'} on {session.device_info?.os || 'Unknown OS'}
                        </h4>
                        {isCurrentSession(session) && (
                          <span className="text-xs bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-400 px-2 py-1 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {session.device_info?.device} • {formatLastActivity(session.last_activity)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        📍 {session.location_info?.city}
                        {session.location_info?.region && `, ${session.location_info.region}`}
                        {session.location_info?.country && `, ${session.location_info.country}`}
                        {session.location_info?.timezone && (
                          <span className="ml-2 text-xs text-gray-500">
                            🕐 {session.location_info.timezone}
                          </span>
                        )}
                      </p>
                      {session.ip_address && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 font-mono">
                          🌐 IP: {session.ip_address}
                          {session.location_info?.isp && (
                            <span className="ml-2">• {session.location_info.isp}</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {isCurrentSession(session) ? (
                      <span className="text-sm text-green-600 dark:text-green-400 font-medium">Active</span>
                    ) : (
                      <button
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={revokingSession === session.id}
                        className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {revokingSession === session.id ? 'Revoking...' : 'Revoke'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 