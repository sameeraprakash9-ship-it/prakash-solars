import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    api.get('/auth/me')
      .then(({ data }) => setUser(data))
      .catch(error => {
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem('token');
        }
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const authenticate = async (endpoint, credentials) => {
    const { data } = await api.post(`/auth/${endpoint}`, credentials);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data.user;
  };

  const login = credentials => authenticate('login', credentials);
  const register = credentials => authenticate('register', credentials);
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
