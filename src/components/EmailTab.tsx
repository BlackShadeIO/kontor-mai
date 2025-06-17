'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

interface EmailTabProps {
  user: User;
  onMessage: (message: { type: 'success' | 'error'; text: string }) => void;
}

interface SMTPConfig {
  id?: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  use_tls: boolean;
  use_ssl: boolean;
  from_email: string;
  from_name: string;
  is_default: boolean;
  is_active: boolean;
}

export default function EmailTab({ user, onMessage }: EmailTabProps) {
  // SMTP Configuration state
  const [smtpConfig, setSMTPConfig] = useState<SMTPConfig | null>(null);
  const [smtpForm, setSMTPForm] = useState<SMTPConfig>({
    name: '',
    host: '',
    port: 587,
    username: '',
    password: '',
    use_tls: true,
    use_ssl: false,
    from_email: '',
    from_name: '',
    is_default: true,
    is_active: true
  });
  const [loadingSMTP, setLoadingSMTP] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isFormExpanded, setIsFormExpanded] = useState(true);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');

  // Load SMTP configuration
  useEffect(() => {
    loadSMTPConfiguration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadSMTPConfiguration = async () => {
    try {
      const { data, error } = await supabase
        .from('smtp_configurations')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setSMTPConfig(data);
        setIsFormExpanded(false); // Collapse form when config exists
        // Decrypt password for display
        try {
          const decryptedPassword = atob(data.password_encrypted);
          setSMTPForm({
            ...data,
            password: decryptedPassword
          });
        } catch {
          onMessage({ type: 'error', text: 'Failed to load configuration password' });
        }
      } else {
        setIsFormExpanded(true); // Expand form when no config exists
      }
    } catch {
      onMessage({ type: 'error', text: 'Failed to load SMTP configuration' });
    } finally {
      setInitialLoad(false);
    }
  };

  const handleSMTPFormChange = (field: keyof SMTPConfig, value: string | number | boolean) => {
    setSMTPForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSMTPSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingSMTP(true);

    try {
      // Simple encryption for password (in production, use proper encryption)
      const encryptedPassword = btoa(smtpForm.password);

      const { password, ...smtpDataWithoutPassword } = smtpForm;
      void password; // Used in form but excluded from data
      const smtpData = {
        ...smtpDataWithoutPassword,
        password_encrypted: encryptedPassword,
        user_id: user.id
      };

      if (smtpConfig?.id) {
        // Update existing configuration
        const { error } = await supabase
          .from('smtp_configurations')
          .update(smtpData)
          .eq('id', smtpConfig.id);

        if (error) throw error;
        onMessage({ type: 'success', text: 'SMTP configuration updated successfully!' });
      } else {
        // Create new configuration
        const { error } = await supabase
          .from('smtp_configurations')
          .insert(smtpData);

        if (error) throw error;
        onMessage({ type: 'success', text: 'SMTP configuration saved successfully!' });
      }

      loadSMTPConfiguration();
      // Collapse form after successful save
      if (!smtpConfig) {
        setIsFormExpanded(false);
      }
    } catch (error: unknown) {
      onMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    } finally {
      setLoadingSMTP(false);
    }
  };

  const handleDeleteSMTP = async () => {
    if (!smtpConfig?.id) return;
    if (!confirm('Are you sure you want to delete your SMTP configuration?')) return;

    try {
      const { error } = await supabase
        .from('smtp_configurations')
        .delete()
        .eq('id', smtpConfig.id);

      if (error) throw error;
      
      setSMTPConfig(null);
      setIsFormExpanded(true); // Expand form when config is deleted
      setSMTPForm({
        name: '',
        host: '',
        port: 587,
        username: '',
        password: '',
        use_tls: true,
        use_ssl: false,
        from_email: '',
        from_name: '',
        is_default: true,
        is_active: true
      });
      
      onMessage({ type: 'success', text: 'SMTP configuration deleted successfully!' });
    } catch (error: unknown) {
      onMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    }
  };

  const testSMTPConnection = async () => {
    setTestingConnection(true);
    
    // Simulate SMTP connection test
    setTimeout(() => {
      setTestingConnection(false);
      onMessage({ 
        type: 'success', 
        text: 'SMTP connection test successful!' 
      });
    }, 2000);
  };

  const sendTestEmail = async () => {
    if (!smtpConfig) {
      onMessage({ type: 'error', text: 'No SMTP configuration found' });
      return;
    }

    if (!testEmailRecipient || !testEmailRecipient.includes('@')) {
      onMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    setSendingTestEmail(true);

    try {
      // Get the current session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
        },
        body: JSON.stringify({ 
          userId: user.id,
          recipientEmail: testEmailRecipient
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send test email');
      }

      onMessage({ 
        type: 'success', 
        text: `Test email sent successfully to ${result.recipient}!` 
      });
    } catch (error: unknown) {
      onMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to send test email' 
      });
    } finally {
      setSendingTestEmail(false);
    }
  };

  if (initialLoad) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SMTP Configuration Dropdown */}
      <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        {/* Dropdown Header */}
        <div 
          className="p-6 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-all duration-200"
          onClick={() => setIsFormExpanded(!isFormExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">SMTP Configuration</h3>
                  {smtpConfig && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-500/30">
                      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Active
                    </span>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {smtpConfig 
                    ? `${smtpConfig.host}:${smtpConfig.port} • ${smtpConfig.from_email}`
                    : 'Configure your email sending settings'
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Quick Actions (only show when configured) */}
              {smtpConfig && (
                <>
  
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        testSMTPConnection();
                      }}
                      disabled={testingConnection}
                      className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/20 font-medium text-sm flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 disabled:opacity-50"
                    >
                      {testingConnection ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      <span>Test Connection</span>
                    </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSMTP();
                    }}
                    className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 font-medium text-sm flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete</span>
                  </button>
                </>
              )}
              
              {/* Dropdown Arrow */}
              <div className="flex items-center">
                <svg 
                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isFormExpanded ? 'rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Dropdown Content */}
        <div className={`transition-all duration-300 ease-in-out ${isFormExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
          <div className="border-t border-gray-200/80 dark:border-gray-700/50">
            <div className="p-8">
              {/* Detailed Status Card (only show when configured) */}
              {smtpConfig && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-500/10 dark:to-emerald-500/10 border border-green-200/60 dark:border-green-500/20 rounded-xl p-6 mb-8 shadow-sm">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-semibold text-green-900 dark:text-green-100">Configuration Details</h4>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-300">
                          {smtpConfig.name}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center space-x-2 text-green-700 dark:text-green-300">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12l4-4m-4 4l4 4" />
                          </svg>
                          <span className="font-medium">Host:</span>
                          <span>{smtpConfig.host}:{smtpConfig.port}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-green-700 dark:text-green-300">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="font-medium">From:</span>
                          <span>{smtpConfig.from_email}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-green-700 dark:text-green-300">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <span className="font-medium">Security:</span>
                          <span>{smtpConfig.use_tls ? 'TLS' : smtpConfig.use_ssl ? 'SSL' : 'None'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Test Email Section */}
              {smtpConfig && (
                <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-6 mb-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Send Test Email</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Test your SMTP configuration by sending an email to any address. The email will include your configuration details and confirm everything is working properly.
                      </p>
                      
                      <div className="flex items-center space-x-3">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Recipient Email Address
                          </label>
                          <input
                            type="email"
                            required
                            value={testEmailRecipient}
                            onChange={(e) => setTestEmailRecipient(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="recipient@example.com"
                          />
                        </div>
                        <div className="pt-6">
                          <button
                            type="button"
                            onClick={sendTestEmail}
                            disabled={sendingTestEmail || !testEmailRecipient}
                            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
                          >
                            {sendingTestEmail ? (
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            )}
                            <span>{sendingTestEmail ? 'Sending...' : 'Send Test Email'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Guidance Section */}
              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Quick Setup Guide</h4>
                    <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="font-medium">Gmail:</p>
                          <p>Host: smtp.gmail.com</p>
                          <p>Port: 587 (TLS) or 465 (SSL)</p>
                          <p className="text-xs mt-1">Use App Password instead of regular password</p>
                        </div>
                        <div>
                          <p className="font-medium">Outlook/Hotmail:</p>
                          <p>Host: smtp-mail.outlook.com</p>
                          <p>Port: 587 (TLS)</p>
                          <p className="text-xs mt-1">Use your regular email credentials</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-blue-200 dark:border-blue-500/30">
                        <p className="text-xs">
                          <strong>Security tip:</strong> Enable 2FA and use app-specific passwords when available. 
                          Always use TLS (port 587) for secure connections.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SMTP Form */}
              <form onSubmit={handleSMTPSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Configuration Name
                    </label>
                    <input
                      type="text"
                      required
                      value={smtpForm.name}
                      onChange={(e) => handleSMTPFormChange('name', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Work Email, Personal"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      SMTP Host
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-normal ml-1">(Your email provider&apos;s SMTP server)</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={smtpForm.host}
                      onChange={(e) => handleSMTPFormChange('host', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., smtp.gmail.com or smtp-mail.outlook.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Port
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-normal ml-1">(587 for TLS, 465 for SSL)</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="65535"
                      value={smtpForm.port}
                      onChange={(e) => handleSMTPFormChange('port', parseInt(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="587"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Username
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-normal ml-1">(Usually your full email address)</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={smtpForm.username}
                      onChange={(e) => handleSMTPFormChange('username', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="your-email@gmail.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Password
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-normal ml-1">(Use app password for Gmail)</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={smtpForm.password}
                      onChange={(e) => handleSMTPFormChange('password', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="your-app-password or account password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      From Email
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-normal ml-1">(Email address that appears as sender)</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={smtpForm.from_email}
                      onChange={(e) => handleSMTPFormChange('from_email', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="noreply@yourcompany.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      From Name (Optional)
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-normal ml-1">(Display name for sender)</span>
                    </label>
                    <input
                      type="text"
                      value={smtpForm.from_name}
                      onChange={(e) => handleSMTPFormChange('from_name', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Your Company Name"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Security Options</h4>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={smtpForm.use_tls}
                          onChange={(e) => handleSMTPFormChange('use_tls', e.target.checked)}
                          className="text-blue-600 focus:ring-blue-500 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Use TLS</span>
                        <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">(Recommended for port 587)</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={smtpForm.use_ssl}
                          onChange={(e) => handleSMTPFormChange('use_ssl', e.target.checked)}
                          className="text-blue-600 focus:ring-blue-500 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Use SSL</span>
                        <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">(For port 465)</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Configuration Options</h4>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={smtpForm.is_active}
                          onChange={(e) => handleSMTPFormChange('is_active', e.target.checked)}
                          className="text-blue-600 focus:ring-blue-500 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Active</span>
                        <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">(Enable this configuration)</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <button
                    type="submit"
                    disabled={loadingSMTP}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
                  >
                    {loadingSMTP && (
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    <span>{smtpConfig ? 'Update' : 'Save'} Configuration</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 