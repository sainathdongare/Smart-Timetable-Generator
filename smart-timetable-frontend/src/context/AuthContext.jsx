import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

const DEFAULT_ADMIN = {
  username: "admin",
  name: "Prof. Reva Patil",
  email: "reva.patil@ritindia.edu",
  department: "Department of Information Technology",
  role: "Department Administrator",
  avatar: "RP"
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("rit_admin_session");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const login = (username, password) => {
    const u = username.trim().toLowerCase();
    const p = password.trim();

    if (
      (u === "reva.patil@ritindia.edu" || u === "admin" || u === "ritadmin") &&
      (p === "123456" || p === "admin123" || p === "admin")
    ) {
      const sessionUser = {
        ...DEFAULT_ADMIN,
        loginTime: new Date().toISOString()
      };
      setUser(sessionUser);
      localStorage.setItem("rit_admin_session", JSON.stringify(sessionUser));
      return { success: true };
    }

    return {
      success: false,
      message: "Invalid administrator credentials. Please check your username and password."
    };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("rit_admin_session");
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
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
