import { supabase } from './supabase';

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  ip_address?: string;
  user_agent?: string;
  device_info?: {
    browser?: string;
    os?: string;
    device?: string;
    detection_version?: string;
  };
  location_info?: {
    ip?: string;
    city?: string;
    region?: string;
    country?: string;
    country_code?: string;
    timezone?: string;
    latitude?: number;
    longitude?: number;
    isp?: string;
    accuracy?: number;
    locale?: string;
    detected_via?: string;
  };
  is_active: boolean;
  last_activity: string;
  created_at: string;
  expires_at: string;
}

class SessionManager {
  private currentSessionToken: string | null = null;
  private initializationInProgress: boolean = false;
  private readonly DETECTION_VERSION = '2.0'; // Increment this to force session refresh

  // Generate a unique session token
  private generateSessionToken(): string {
    return crypto.randomUUID() + '-' + Date.now() + '-' + Math.random().toString(36).substring(2);
  }

  // Parse user agent to get device info
  private parseUserAgent(userAgent: string) {
    console.log('Parsing user agent:', userAgent);
    
    const browser = this.getBrowser(userAgent);
    const os = this.getOS(userAgent);
    const device = this.getDevice(userAgent);
    
    console.log('Detected:', { browser, os, device });
    
    return { browser, os, device };
  }

  private getBrowser(userAgent: string): string {
    // More comprehensive browser detection
    if (userAgent.includes('Edg/')) return 'Microsoft Edge';
    if (userAgent.includes('OPR/') || userAgent.includes('Opera/')) return 'Opera';
    if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) return 'Chrome';
    if (userAgent.includes('Firefox/')) return 'Firefox';
    if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) return 'Safari';
    if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) return 'Internet Explorer';
    return 'Unknown Browser';
  }

  private getOS(userAgent: string): string {
    // More comprehensive OS detection
    if (userAgent.includes('Windows NT 10.0')) return 'Windows 10/11';
    if (userAgent.includes('Windows NT 6.3')) return 'Windows 8.1';
    if (userAgent.includes('Windows NT 6.2')) return 'Windows 8';
    if (userAgent.includes('Windows NT 6.1')) return 'Windows 7';
    if (userAgent.includes('Windows NT')) return 'Windows';
    if (userAgent.includes('Mac OS X 10_15')) return 'macOS Catalina+';
    if (userAgent.includes('Mac OS X 10_14')) return 'macOS Mojave';
    if (userAgent.includes('Mac OS X 10_13')) return 'macOS High Sierra';
    if (userAgent.includes('Mac OS X')) return 'macOS';
    if (userAgent.includes('iPhone OS') || userAgent.includes('iOS')) return 'iOS';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('Linux') && userAgent.includes('X11')) return 'Linux';
    if (userAgent.includes('Ubuntu')) return 'Ubuntu';
    if (userAgent.includes('CrOS')) return 'Chrome OS';
    return 'Unknown OS';
  }

  private getDevice(userAgent: string): string {
    console.log('Detecting device from user agent:', userAgent);
    
    // More specific device detection - check for specific mobile/tablet indicators first
    if (userAgent.includes('iPhone')) {
      console.log('Detected: iPhone');
      return 'iPhone';
    }
    if (userAgent.includes('iPad')) {
      console.log('Detected: iPad');
      return 'iPad';
    }
    if (userAgent.includes('Android') && userAgent.includes('Mobile')) {
      console.log('Detected: Android Phone');
      return 'Android Phone';
    }
    if (userAgent.includes('Android') && !userAgent.includes('Mobile')) {
      console.log('Detected: Android Tablet');
      return 'Android Tablet';
    }
    
    // Check for desktop operating systems (these should be desktop even if "Mobile" appears elsewhere)
    if (userAgent.includes('Windows NT') || 
        userAgent.includes('Mac OS X') || 
        userAgent.includes('Macintosh') ||
        (userAgent.includes('Linux') && userAgent.includes('X11'))) {
      console.log('Detected: Desktop (based on OS)');
      return 'Desktop';
    }
    
    // Only classify as mobile device if it has mobile indicators but no desktop OS
    if ((userAgent.includes('Mobile') || userAgent.includes('mobi')) && 
        !userAgent.includes('Windows NT') && 
        !userAgent.includes('Mac OS X') && 
        !userAgent.includes('Macintosh')) {
      console.log('Detected: Mobile Device');
      return 'Mobile Device';
    }
    
    if (userAgent.includes('Tablet') || userAgent.includes('tablet')) {
      console.log('Detected: Tablet');
      return 'Tablet';
    }
    
    console.log('Detected: Desktop (default)');
    return 'Desktop';
  }

  // Get real location info using IP geolocation API
  private async getLocationInfo(): Promise<Record<string, unknown>> {
    try {
      // Use ipapi.co for free geolocation (1000 requests/month)
      const response = await fetch('https://ipapi.co/json/');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.reason || 'API error');
      }

      return {
        ip: data.ip,
        city: data.city || 'Unknown City',
        region: data.region || 'Unknown Region',
        country: data.country_name || 'Unknown Country',
        country_code: data.country_code,
        timezone: data.timezone,
        latitude: data.latitude,
        longitude: data.longitude,
        isp: data.org
      };
    } catch (error) {
      console.warn('Failed to get location info:', error);
      
      // Fallback: try to get basic info from browser if geolocation permission exists
      try {
        if (navigator.geolocation) {
          return await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                resolve({
                  city: 'Location detected',
                  country: 'Via Browser',
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy
                });
              },
              () => {
                // Fallback to basic detection
                resolve(this.getBasicLocationFallback());
              },
              { timeout: 5000 }
            );
          });
        }
      } catch (geoError) {
        console.warn('Geolocation failed:', geoError);
      }
      
      // Final fallback
      return this.getBasicLocationFallback();
    }
  }

  private getBasicLocationFallback() {
    // Basic fallback using timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const locale = navigator.language || 'en-US';
    
    return {
      city: 'Unknown City',
      country: 'Unknown Country',
      timezone: timezone,
      locale: locale,
      detected_via: 'Browser fallback'
    };
  }

  // Create a new session
  async createSession(userId: string, ipAddress?: string): Promise<string> {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`Creating session for user: ${userId} (attempt ${attempts})`);
        
        const sessionToken = this.generateSessionToken();
        const userAgent = navigator.userAgent;
        const deviceInfo = this.parseUserAgent(userAgent);
        const locationInfo = await this.getLocationInfo();

        const sessionData = {
          user_id: userId,
          session_token: sessionToken,
          ip_address: ipAddress,
          user_agent: userAgent,
          device_info: {
            ...deviceInfo,
            detection_version: this.DETECTION_VERSION
          },
          location_info: locationInfo,
          is_active: true
        };

        console.log('Session data:', sessionData);

        const { data, error } = await supabase
          .from('user_sessions')
          .insert(sessionData)
          .select()
          .single();

        if (error) {
          console.error('Supabase insert error:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          console.error('Error details:', error.details);
          
          // If it's a unique constraint violation, try again with new token
          if (error.code === '23505' && attempts < maxAttempts) {
            console.log('Session token conflict, retrying...');
            continue;
          }
          
          throw error;
        }

        console.log('Session created successfully:', data);

        this.currentSessionToken = sessionToken;
        
        // Store in localStorage for persistence (client-side only)
        if (typeof window !== 'undefined') {
          localStorage.setItem('sessionToken', sessionToken);
        }
        
        return sessionToken;
      } catch (error) {
        console.error(`Failed to create session (attempt ${attempts}):`, error);
        console.error('Error type:', typeof error);
        console.error('Error constructor:', error?.constructor?.name);
        if (error instanceof Error) {
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
        
        if (attempts >= maxAttempts) {
          console.error('Max attempts reached, throwing error');
          throw error;
        }
        
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 100 * attempts));
      }
    }
    
    throw new Error('Failed to create session after maximum attempts');
  }

  // Update session activity
  async updateActivity(): Promise<void> {
    if (!this.currentSessionToken) return;

    try {
      await supabase
        .from('user_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('session_token', this.currentSessionToken);
    } catch (error) {
      console.error('Failed to update session activity:', error);
    }
  }

  // Get all active sessions for current user
  async getUserSessions(): Promise<UserSession[]> {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('is_active', true)
        .order('last_activity', { ascending: false });

      if (error) {
        console.error('Supabase select error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('Failed to get user sessions:', error);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      return [];
    }
  }

  // Revoke a specific session
  async revokeSession(sessionId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('revoke_session', { session_id: sessionId });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to revoke session:', error);
      return false;
    }
  }

  // Revoke all other sessions except current
  async revokeAllOtherSessions(): Promise<number> {
    if (!this.currentSessionToken) return 0;

    try {
      const { data, error } = await supabase
        .rpc('revoke_all_other_sessions', { 
          current_session_token: this.currentSessionToken 
        });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Failed to revoke other sessions:', error);
      return 0;
    }
  }

  // Test Supabase connectivity
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing Supabase connection...');
      
      // Simple query to test connectivity
      const { error } = await supabase
        .from('user_sessions')
        .select('count')
        .limit(1);

      if (error) {
        console.error('Connection test failed:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        return false;
      }

      console.log('Supabase connection successful');
      return true;
    } catch (error) {
      console.error('Connection test error:', error);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      return false;
    }
  }

  // Force refresh session with updated device detection
  async forceRefreshSession(userId: string): Promise<void> {
    console.log('Force refreshing session with updated device detection...');
    
    // Clear current session completely
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sessionToken');
    }
    this.currentSessionToken = null;
    this.initializationInProgress = false;
    
    // Revoke any existing sessions for this user that are outdated
    try {
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('user_id', userId)
        .is('device_info->detection_version', null);
      console.log('Revoked sessions without detection version');
    } catch (error) {
      console.warn('Failed to revoke old sessions:', error);
    }
    
    // Create fresh session with correct device detection
    await this.initializeSession(userId);
  }

  // Initialize session on app load
  async initializeSession(userId: string): Promise<void> {
    try {
      console.log('Initializing session for user:', userId);
      
      // Check if initialization is already in progress
      if (this.initializationInProgress) {
        console.log('Session initialization already in progress, skipping...');
        return;
      }

      // Check if we already have a valid session
      if (this.currentSessionToken) {
        console.log('Session already initialized, skipping...');
        return;
      }
      
      // Check if localStorage is available (client-side only)
      if (typeof window === 'undefined') {
        console.log('Server-side rendering, skipping session initialization');
        return;
      }
      
      // Validate userId
      if (!userId) {
        console.error('No userId provided for session initialization');
        return;
      }

      // Set flag to prevent concurrent initializations
      this.initializationInProgress = true;

      // Test connection first
      const connectionOk = await this.testConnection();
      if (!connectionOk) {
        console.warn('Supabase connection failed, skipping session initialization');
        return;
      }
      
      // Get stored session token
      const storedToken = localStorage.getItem('sessionToken');
      
      if (storedToken) {
        console.log('Found stored session token, validating...');
        // Check if session is still valid
        const { data, error } = await supabase
          .from('user_sessions')
          .select('*')
          .eq('session_token', storedToken)
          .eq('is_active', true)
          .single();

        if (!error && data) {
          console.log('Existing session is valid, checking device info...');
          console.log('Current session device info:', data.device_info);
          console.log('Current session user agent:', data.user_agent);
          
          // Check if device info looks incorrect or is outdated
          const deviceInfo = data.device_info;
          const currentUserAgent = navigator.userAgent;
          
          const needsUpdate = !deviceInfo || 
                            !deviceInfo.detection_version ||
                            deviceInfo.detection_version !== this.DETECTION_VERSION ||
                            deviceInfo.device === 'Mobile Device' || 
                            deviceInfo.device === 'Android Phone' ||
                            deviceInfo.device === 'Android Tablet' ||
                            (data.user_agent !== currentUserAgent) ||
                            (!currentUserAgent.includes('Android') && deviceInfo.device?.includes('Android'));
          
          console.log('Need session update?', needsUpdate);
          console.log('Reasons:', {
            noDeviceInfo: !deviceInfo,
            noVersion: !deviceInfo?.detection_version,
            wrongVersion: deviceInfo?.detection_version !== this.DETECTION_VERSION,
            mobileDevice: deviceInfo?.device === 'Mobile Device',
            androidPhone: deviceInfo?.device === 'Android Phone',
            androidTablet: deviceInfo?.device === 'Android Tablet',
            userAgentChanged: data.user_agent !== currentUserAgent,
            wrongAndroid: (!currentUserAgent.includes('Android') && deviceInfo?.device?.includes('Android'))
          });
          
          if (needsUpdate) {
            console.log('Device info needs updating, creating fresh session...');
            // Revoke old session and create new one
            await supabase
              .from('user_sessions')
              .update({ is_active: false })
              .eq('id', data.id);
            localStorage.removeItem('sessionToken');
            this.currentSessionToken = null;
            await this.createSession(userId);
            return;
          }
          
          this.currentSessionToken = storedToken;
          await this.updateActivity();
          return;
        } else {
          console.log('Existing session is invalid:', error);
          localStorage.removeItem('sessionToken');
        }
      }

      // Create new session if none exists or invalid
      console.log('Creating new session...');
      await this.createSession(userId);
    } catch (error) {
      console.error('Error initializing session:', error);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
    } finally {
      // Always clear the flag when done
      this.initializationInProgress = false;
    }
  }

  // Clean up on logout
  async cleanup(): Promise<void> {
    console.log('Cleaning up session...');
    
    if (this.currentSessionToken) {
      try {
        await this.revokeSession(this.currentSessionToken);
      } catch (error) {
        console.warn('Failed to revoke session during cleanup:', error);
      }
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sessionToken');
      }
      
      this.currentSessionToken = null;
    }
    
    // Reset initialization flag
    this.initializationInProgress = false;
    console.log('Session cleanup complete');
  }

  // Get current session token
  getCurrentSessionToken(): string | null {
    return this.currentSessionToken;
  }
}

export const sessionManager = new SessionManager();

// Make available in browser console for debugging
if (typeof window !== 'undefined') {
  (window as typeof window & { sessionManager: SessionManager }).sessionManager = sessionManager;
  console.log('sessionManager available in console for debugging');
} 