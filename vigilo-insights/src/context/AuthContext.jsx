import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("vigilo_token"));
  const [isLoading, setIsLoading] = useState(true); // true until initial /me check completes

  // On mount or token change: validate the token by calling /api/auth/me
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      setUser(null);
      return;
    }

    let cancelled = false;

    authAPI
      .me()
      .then((userData) => {
        if (!cancelled) {
          setUser(userData);
          localStorage.setItem("vigilo_user", JSON.stringify(userData));
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Token is invalid/expired
          localStorage.removeItem("vigilo_token");
          localStorage.removeItem("vigilo_user");
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback(async (email, password) => {
    const data = await authAPI.login(email, password);
    const { access_token, user: userData } = data;

    localStorage.setItem("vigilo_token", access_token);
    localStorage.setItem("vigilo_user", JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);

    return userData;
  }, []);

  const register = useCallback(async (formData) => {
    const data = await authAPI.register(formData);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("vigilo_token");
    localStorage.removeItem("vigilo_user");
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (profileData) => {
    const updatedUser = await authAPI.updateProfile(profileData);
    setUser(updatedUser);
    localStorage.setItem("vigilo_user", JSON.stringify(updatedUser));
    return updatedUser;
  }, []);

  const changePassword = useCallback(async (passwordData) => {
    return authAPI.changePassword(passwordData);
  }, []);

  const uploadImage = useCallback(async (formData) => {
    const updatedUser = await authAPI.uploadImage(formData);
    setUser(updatedUser);
    localStorage.setItem("vigilo_user", JSON.stringify(updatedUser));
    return updatedUser;
  }, []);

  const deleteAccount = useCallback(async (data) => {
    const response = await authAPI.deleteAccount(data);
    localStorage.removeItem("vigilo_token");
    localStorage.removeItem("vigilo_user");
    setToken(null);
    setUser(null);
    return response;
  }, []);

  const isAuthenticated = !!user && !!token;
  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        isAdmin,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        uploadImage,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
