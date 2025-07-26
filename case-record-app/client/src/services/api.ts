import axios from 'axios';
import {
  CaseRecord,
  CaseFormData,
  ApiResponse,
  PaginatedResponse,
  CrisisType,
  CaseStatus,
  Priority,
  RiskLevel
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface GetCasesParams {
  page?: number;
  limit?: number;
  status?: CaseStatus;
  crisisType?: CrisisType;
  priority?: Priority;
  riskLevel?: RiskLevel;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const caseApi = {
  // Get all cases with filtering and pagination
  getCases: async (params: GetCasesParams = {}): Promise<PaginatedResponse<CaseRecord>> => {
    const response = await api.get('/cases', { params });
    return response.data;
  },

  // Get a specific case by ID
  getCaseById: async (id: string): Promise<ApiResponse<CaseRecord>> => {
    const response = await api.get(`/cases/${id}`);
    return response.data;
  },

  // Create a new case
  createCase: async (caseData: CaseFormData): Promise<ApiResponse<CaseRecord>> => {
    const response = await api.post('/cases', caseData);
    return response.data;
  },

  // Update an existing case
  updateCase: async (id: string, caseData: Partial<CaseFormData>): Promise<ApiResponse<CaseRecord>> => {
    const response = await api.put(`/cases/${id}`, caseData);
    return response.data;
  },

  // Delete a case
  deleteCase: async (id: string): Promise<ApiResponse> => {
    const response = await api.delete(`/cases/${id}`);
    return response.data;
  },

  // Analyze case with sentiment analysis
  analyzeCase: async (id: string): Promise<ApiResponse<CaseRecord>> => {
    const response = await api.post(`/cases/${id}/analyze`);
    return response.data;
  },

  // Get case statistics
  getCaseStats: async (): Promise<ApiResponse<any>> => {
    const response = await api.get('/cases/stats');
    return response.data;
  },
};

export const utilityApi = {
  // Get available crisis types
  getCrisisTypes: async (): Promise<ApiResponse<any[]>> => {
    const response = await api.get('/crisis-types');
    return response.data;
  },

  // Health check
  healthCheck: async (): Promise<ApiResponse> => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;
