import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  google_id: string;
  email: string;
  name: string;
  profile_picture: string;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/status`, {
        credentials: 'include',
        cache: 'no-store', // Prevent caching on Safari
        headers: {
          'Accept': 'application/json',
        },
      });
      const data = await response.json();
      
      if (data.authenticated) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check for auth success parameter (from OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('auth');
    
    if (authSuccess === 'success') {
      // Remove the parameter from URL
      window.history.replaceState({}, '', window.location.pathname);
      
      // On iOS, we need to delay the auth check slightly to ensure
      // the session cookie is properly set after OAuth redirect
      setTimeout(() => {
        checkAuth();
      }, 300);
    } else {
      checkAuth();
    }
  }, []);

  const login = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store', // Prevent caching on mobile
      });
      setUser(null);
      
      // Clear any cached data
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
      
      // Redirect to Google logout to clear Google OAuth session on mobile
      // This ensures the user is fully logged out from Google
      const googleLogoutUrl = 'https://accounts.google.com/Logout';
      
      // Open Google logout in a hidden iframe to clear Google session
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = googleLogoutUrl;
      document.body.appendChild(iframe);
      
      // Wait for Google logout, then redirect
      setTimeout(() => {
        document.body.removeChild(iframe);
        window.location.href = '/';
      }, 500);
    } catch (error) {
      console.error('Logout failed:', error);
      setUser(null);
      window.location.href = '/';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
