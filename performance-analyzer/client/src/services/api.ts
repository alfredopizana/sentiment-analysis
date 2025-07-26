import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Analytics Service
export const analyticsService = {
  getOverview: (timeRange: string = '24h') =>
    api.get(`/analytics/overview?timeRange=${timeRange}`),
  
  getTimeSeries: (metric: string, interval: string, timeRange: string = '24h') =>
    api.get(`/analytics/time-series?metric=${metric}&interval=${interval}&timeRange=${timeRange}`),
  
  getEfficiency: (timeRange: string = '24h') =>
    api.get(`/analytics/efficiency?timeRange=${timeRange}`),
};

// Metrics Service
export const metricsService = {
  recordPerformance: (data: any) =>
    api.post('/metrics/performance', data),
  
  recordSystem: (data: any) =>
    api.post('/metrics/system', data),
  
  getCaseMetrics: (caseId: string) =>
    api.get(`/metrics/performance/${caseId}`),
  
  recordBulkPerformance: (metrics: any[]) =>
    api.post('/metrics/bulk-performance', { metrics }),
  
  updateAccuracyFeedback: (data: any) =>
    api.post('/metrics/accuracy-feedback', data),
  
  getLatestSystemMetrics: () =>
    api.get('/metrics/system/latest'),
};

// Reports Service
export const reportsService = {
  getSummary: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return api.get(`/reports/summary?${params.toString()}`);
  },
  
  getROI: (hourlyRate: number = 25, timeRange: string = '30d') =>
    api.get(`/reports/roi?hourlyRate=${hourlyRate}&timeRange=${timeRange}`),
  
  exportData: (format: string = 'csv', startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    params.append('format', format);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return api.get(`/reports/export?${params.toString()}`, {
      responseType: format === 'csv' ? 'blob' : 'json'
    });
  },
};

// Health Check
export const healthService = {
  check: () => api.get('/health'),
};

export default api;
