import { useCallback, useRef, useMemo } from 'react';
import { useCaseContext } from '../contexts/CaseContext';
import { useNotification } from '../contexts/NotificationContext';
import { optimizedCaseApi as caseApi, GetCasesParams } from '../services/optimizedApi';
import { CaseFormData, CaseRecord } from '../types';

// Cache for API responses to prevent unnecessary requests
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

const getCacheKey = (params: GetCasesParams): string => {
  return JSON.stringify(params);
};

const isCacheValid = (timestamp: number): boolean => {
  return Date.now() - timestamp < CACHE_DURATION;
};

export const useOptimizedCases = () => {
  const { state, dispatch } = useCaseContext();
  const { showSuccess, showError } = useNotification();
  
  // Use refs to prevent unnecessary re-renders
  const lastFetchParams = useRef<GetCasesParams>({});
  const isLoadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Memoized selectors to prevent unnecessary re-renders
  const memoizedState = useMemo(() => ({
    cases: state.cases,
    currentCase: state.currentCase,
    loading: state.loading,
    error: state.error,
    pagination: state.pagination,
    filters: state.filters,
  }), [state]);

  const fetchCases = useCallback(async (params: GetCasesParams = {}) => {
    // Prevent duplicate requests
    const paramsKey = getCacheKey(params);
    const lastParamsKey = getCacheKey(lastFetchParams.current);
    
    if (isLoadingRef.current && paramsKey === lastParamsKey) {
      return;
    }

    // Check cache first
    const cached = apiCache.get(paramsKey);
    if (cached && isCacheValid(cached.timestamp)) {
      dispatch({
        type: 'SET_CASES',
        payload: {
          cases: cached.data.data || [],
          pagination: cached.data.pagination || state.pagination,
        },
      });
      return;
    }

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    isLoadingRef.current = true;
    lastFetchParams.current = params;

    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await caseApi.getCases({
        ...params,
        signal: abortControllerRef.current.signal,
      });

      // Cache the response
      apiCache.set(paramsKey, {
        data: response,
        timestamp: Date.now(),
      });

      dispatch({
        type: 'SET_CASES',
        payload: {
          cases: response.data || [],
          pagination: response.pagination || state.pagination,
        },
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return; // Request was cancelled, don't show error
      }
      
      const message = error.response?.data?.message || 'Failed to fetch cases';
      dispatch({ type: 'SET_ERROR', payload: message });
      showError(message);
    } finally {
      isLoadingRef.current = false;
      abortControllerRef.current = null;
    }
  }, [dispatch, showError, state.pagination]);

  const fetchCaseById = useCallback(async (id: string) => {
    const cacheKey = `case-${id}`;
    const cached = apiCache.get(cacheKey);
    
    if (cached && isCacheValid(cached.timestamp)) {
      dispatch({ type: 'SET_CURRENT_CASE', payload: cached.data });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await caseApi.getCaseById(id);
      if (response.data) {
        // Cache the individual case
        apiCache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now(),
        });
        
        dispatch({ type: 'SET_CURRENT_CASE', payload: response.data });
      } else {
        throw new Error('No case data received');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch case';
      dispatch({ type: 'SET_ERROR', payload: message });
      showError(message);
    }
  }, [dispatch, showError]);

  const createCase = useCallback(async (caseData: CaseFormData): Promise<CaseRecord> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await caseApi.createCase(caseData);
      if (response.data) {
        dispatch({ type: 'ADD_CASE', payload: response.data });
        showSuccess('Case created successfully');
        
        // Clear cache to ensure fresh data on next fetch
        apiCache.clear();
        
        return response.data;
      } else {
        throw new Error('No case data received');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create case';
      dispatch({ type: 'SET_ERROR', payload: message });
      showError(message);
      throw error;
    }
  }, [dispatch, showSuccess, showError]);

  const updateCase = useCallback(async (id: string, caseData: Partial<CaseFormData>): Promise<CaseRecord> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await caseApi.updateCase(id, caseData);
      if (response.data) {
        dispatch({ type: 'UPDATE_CASE', payload: response.data });
        showSuccess('Case updated successfully');
        
        // Update cache for this specific case
        const cacheKey = `case-${id}`;
        apiCache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now(),
        });
        
        // Clear list cache to ensure consistency
        apiCache.forEach((value, key) => {
          if (key.startsWith('{"page":') || key.startsWith('{"limit":')) {
            apiCache.delete(key);
          }
        });
        
        return response.data;
      } else {
        throw new Error('No case data received');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update case';
      dispatch({ type: 'SET_ERROR', payload: message });
      showError(message);
      throw error;
    }
  }, [dispatch, showSuccess, showError]);

  const deleteCase = useCallback(async (id: string) => {
    try {
      await caseApi.deleteCase(id);
      dispatch({ type: 'DELETE_CASE', payload: id });
      showSuccess('Case deleted successfully');
      
      // Clear relevant cache entries
      apiCache.delete(`case-${id}`);
      apiCache.forEach((value, key) => {
        if (key.startsWith('{"page":') || key.startsWith('{"limit":')) {
          apiCache.delete(key);
        }
      });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete case';
      showError(message);
      throw error;
    }
  }, [dispatch, showSuccess, showError]);

  const analyzeCase = useCallback(async (id: string): Promise<CaseRecord> => {
    // Don't set global loading for analysis - it's a background operation
    try {
      const response = await caseApi.analyzeCase(id);
      if (response.data) {
        dispatch({ type: 'UPDATE_CASE', payload: response.data });
        showSuccess('Case analyzed successfully');
        
        // Update cache
        const cacheKey = `case-${id}`;
        apiCache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now(),
        });
        
        return response.data;
      } else {
        throw new Error('No case data received');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to analyze case';
      showError(message);
      throw error;
    }
  }, [dispatch, showSuccess, showError]);

  const setFilters = useCallback((filters: any) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, [dispatch]);

  const clearFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_FILTERS' });
  }, [dispatch]);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, [dispatch]);

  const clearCache = useCallback(() => {
    apiCache.clear();
  }, []);

  return {
    // State (memoized to prevent unnecessary re-renders)
    ...memoizedState,

    // Actions
    fetchCases,
    fetchCaseById,
    createCase,
    updateCase,
    deleteCase,
    analyzeCase,
    setFilters,
    clearFilters,
    clearError,
    clearCache,
  };
};
