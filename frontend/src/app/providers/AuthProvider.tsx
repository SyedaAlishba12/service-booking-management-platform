
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  apiClient,
  setAccessToken,
} from "@/utils/api_client";

import type {
  AuthResponse,
  RefreshResponse,
  User,
  UserUpdateRequest,
} from "@/types/auth";

interface SignupData {
  full_name: string;
  email: string;
  phone?: string;
  password: string;
  role: "CUSTOMER" | "PROVIDER";
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (data: SignupData) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (data: UserUpdateRequest) => Promise<User>;
  uploadProfileImage: (file: File) => Promise<User>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const response = await apiClient.post<RefreshResponse>(
        "/api/auth/refresh"
      );

      setAccessToken(response.access_token);
      setUser(response.user);

      return response.user;
    } catch {
      setAccessToken(null);
      setUser(null);

      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        await refreshUser();
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void restoreSession();

    return () => {
      mounted = false;
    };
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string): Promise<User> => {
      const response = await apiClient.post<AuthResponse>(
        "/api/auth/login",
        {
          email,
          password,
        }
      );

      setAccessToken(response.access_token);
      setUser(response.user);

      return response.user;
    },
    []
  );

  const signup = useCallback(
    async (data: SignupData): Promise<User> => {
      const response = await apiClient.post<User>(
        "/api/auth/signup",
        {
          full_name: data.full_name,
          email: data.email,
          phone: data.phone?.trim() || null,
          password: data.password,
          role: data.role,
        }
      );

      // Signup does not automatically log in the user.
      return response;
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiClient.post("/api/auth/logout");
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(
    async (data: UserUpdateRequest): Promise<User> => {
      const updatedUser = await apiClient.put<User>(
        "/api/users/me",
        data
      );

      setUser(updatedUser);

      return updatedUser;
    },
    []
  );

  const uploadProfileImage = useCallback(
    async (file: File): Promise<User> => {
      const formData = new FormData();
      formData.append("file", file);

      const result = await apiClient.upload<{
        profile_image_url: string;
      }>("/api/users/me/profile-image", formData);

      const updatedUser = await apiClient.get<User>(
        "/api/users/me"
      );

      setUser({
        ...updatedUser,
        profile_image_url: result.profile_image_url,
      });

      return {
        ...updatedUser,
        profile_image_url: result.profile_image_url,
      };
    },
    []
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      signup,
      logout,
      updateProfile,
      uploadProfileImage,
      refreshUser,
    }),
    [
      user,
      loading,
      login,
      signup,
      logout,
      updateProfile,
      uploadProfileImage,
      refreshUser,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
}