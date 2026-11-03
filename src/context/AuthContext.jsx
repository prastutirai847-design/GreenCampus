import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../services/authService.js';

const AuthContext = createContext(null);

/**
 * Session state for the prototype.
 *
 * `status` is 'loading' while the stored session is being checked, then either
 * 'authenticated' or 'anonymous'. Pages should render nothing workspace-related
 * until the check finishes so protected routes do not flash.
 */
export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, status: 'loading', error: null });

  const refresh = useCallback(async () => {
    try {
      const user = await authApi.getCurrentUser();
      setState({ user, status: user ? 'authenticated' : 'anonymous', error: null });
      return user;
    } catch (error) {
      setState({
        user: null,
        status: 'anonymous',
        error: error instanceof Error ? error.message : 'Could not restore the session.',
      });
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const user = await authApi.getCurrentUser();
        if (active) setState({ user, status: user ? 'authenticated' : 'anonymous', error: null });
      } catch (error) {
        if (active) {
          setState({
            user: null,
            status: 'anonymous',
            error: error instanceof Error ? error.message : 'Could not restore the session.',
          });
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const user = await authApi.login(credentials);
    setState({ user, status: 'authenticated', error: null });
    return user;
  }, []);

  const register = useCallback(async (values) => {
    const user = await authApi.register(values);
    setState({ user, status: 'authenticated', error: null });
    return user;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setState({ user: null, status: 'anonymous', error: null });
  }, []);

  const completeCollegeSetup = useCallback(async () => {
    const user = await authApi.completeCollegeSetup();
    setState((previous) => ({ ...previous, user }));
    return user;
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      isAuthenticated: Boolean(state.user),
      login,
      register,
      logout,
      refresh,
      completeCollegeSetup,
    }),
    [state, login, register, logout, refresh, completeCollegeSetup],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider.');
  return context;
}
