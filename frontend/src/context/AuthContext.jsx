import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken, getToken } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Restore a session on load if a token is present.
  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    api.me()
      .then(({ data }) => { setUser(data.user); setModules(data.modules || []); })
      .catch(() => { setToken(''); })
      .finally(() => setLoading(false));
  }, []);

  async function loginWithGoogle(idToken) {
    const { data } = await api.login(idToken);
    setToken(data.token);
    const me = await api.me();
    setUser(me.data.user);
    setModules(me.data.modules || []);
    return me.data.user;
  }

  function logout() {
    setToken('');
    setUser(null);
    setModules([]);
  }

  return (
    <AuthContext.Provider value={{ user, modules, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
