import axios from "axios";
import type {
  AuthResponse,
  Certificate,
  CreateCertificateDto,
  LoginCredentials,
  RegisterData,
  AuditLog,
} from "../types";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) throw new Error("No refresh token");

        const { data } = await axios.post<AuthResponse>("/api/auth/refresh", {
          refreshToken,
        });

        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (credentials: LoginCredentials) => {
    const { data } = await api.post<AuthResponse>("/auth/login", credentials);
    return data;
  },

  register: async (registerData: RegisterData) => {
    const { data } = await api.post<AuthResponse>(
      "/auth/register",
      registerData
    );
    return data;
  },

  logout: async () => {
    await api.post("/auth/logout");
  },

  getProfile: async () => {
    const { data } = await api.get("/auth/me");
    return data;
  },
};

// Certificates API
export const certificatesApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => {
    const { data } = await api.get<{
      certificates: Certificate[];
      total: number;
    }>("/certificates", { params });
    return data;
  },

  getById: async (id: string) => {
    const { data } = await api.get<Certificate>(`/certificates/${id}`);
    return data;
  },

  create: async (dto: CreateCertificateDto) => {
    const { data } = await api.post<Certificate>("/certificates", dto);
    return data;
  },

  update: async (id: string, metadata: Record<string, unknown>) => {
    const { data } = await api.put<Certificate>(`/certificates/${id}`, {
      metadata,
    });
    return data;
  },

  revoke: async (id: string, reason: string) => {
    const { data } = await api.delete<Certificate>(`/certificates/${id}`, {
      data: { reason },
    });
    return data;
  },

  renew: async (id: string) => {
    const { data } = await api.post<Certificate>(`/certificates/${id}/renew`);
    return data;
  },

  download: async (id: string) => {
    const { data } = await api.get<{
      certificate: string;
      serialNumber: string;
    }>(`/certificates/${id}/download`);
    return data;
  },

  getPrivateKey: async (id: string) => {
    const { data } = await api.get<{ privateKey: string }>(
      `/certificates/${id}/private-key`
    );
    return data;
  },
};

// Audit API
export const auditApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    resourceType?: string;
  }) => {
    const { data } = await api.get<{ logs: AuditLog[]; total: number }>(
      "/audit",
      { params }
    );
    return data;
  },
};

export default api;
