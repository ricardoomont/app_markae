import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@/types";
import { useLocalStorage } from "./useLocalStorage";

type CurrentUserContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  loading: boolean;
};

const CurrentUserContext = createContext<CurrentUserContextType | undefined>(undefined);

// Sample admin user
const sampleUsers: Record<string, User> = {
  "admin@example.com": {
    id: "1",
    name: "Admin",
    email: "admin@example.com",
    role: "admin",
    active: true,
  },
  "coord@example.com": {
    id: "2",
    name: "Coordenador",
    email: "coord@example.com",
    role: "coordinator",
    active: true,
    institutionId: "1",
  },
  "prof@example.com": {
    id: "3",
    name: "Professor",
    email: "prof@example.com",
    role: "teacher",
    active: true,
    institutionId: "1",
  },
  "aluno@example.com": {
    id: "4",
    name: "Aluno",
    email: "aluno@example.com",
    role: "student",
    active: true,
    institutionId: "1",
  },
};

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const [storedUser, setStoredUser] = useLocalStorage<User | null>("currentUser", null);
  const [user, setUser] = useState<User | null>(storedUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set loading to false once we've checked localStorage
    setLoading(false);
  }, []);

  // Keep localStorage and state in sync
  useEffect(() => {
    setStoredUser(user);
  }, [user, setStoredUser]);

  const login = async (email: string, password: string): Promise<User> => {
    setLoading(true);
    
    // This is just a mock login - would be replaced with real API call
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const foundUser = sampleUsers[email.toLowerCase()];
        if (foundUser && password === "password") {
          setUser(foundUser);
          setLoading(false);
          resolve(foundUser);
        } else {
          setLoading(false);
          reject(new Error("Credenciais inválidas"));
        }
      }, 800);
    });
  };

  const logout = () => {
    setUser(null);
  };

  const value = {
    user,
    setUser,
    login,
    logout,
    loading,
  };

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser() {
  const context = useContext(CurrentUserContext);
  if (context === undefined) {
    throw new Error("useCurrentUser must be used within a CurrentUserProvider");
  }
  return context;
}
