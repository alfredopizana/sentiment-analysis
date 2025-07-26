import { useCallback } from 'react';
import { useCaseContext } from '../contexts/CaseContext';
import { useNotification } from '../contexts/NotificationContext';
import { caseApi, GetCasesParams } from '../services/api';
import { CaseFormData, CaseRecord } from '../types';

export const useCases = () => {
  const { state, dispatch } = useCaseContext();
  const { showSuccess, showError } = useNotification();

  const fetchCases = useCallback(async (params: GetCasesParams = {}) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await caseApi.getCases(params);
      dispatch({
        type: 'SET_CASES',
        payload: {
          cases: response.data || [],
          pagination: response.pagination || state.pagination,
        },
      });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch cases';
      dispatch({ type: 'SET_ERROR', payload: message });
      showError(message);
    }
  }, [dispatch, showError, state.pagination]);

  const fetchCaseById = useCallback(async (id: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await caseApi.getCaseById(id);
      if (response.data) {
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
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete case';
      showError(message);
      throw error;
    }
  }, [dispatch, showSuccess, showError]);

  const analyzeCase = useCallback(async (id: string): Promise<CaseRecord> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await caseApi.analyzeCase(id);
      if (response.data) {
        dispatch({ type: 'UPDATE_CASE', payload: response.data });
        showSuccess('Case analyzed successfully');
        return response.data;
      } else {
        throw new Error('No case data received');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to analyze case';
      dispatch({ type: 'SET_ERROR', payload: message });
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

  return {
    // State
    cases: state.cases,
    currentCase: state.currentCase,
    loading: state.loading,
    error: state.error,
    pagination: state.pagination,
    filters: state.filters,

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
  };
};
