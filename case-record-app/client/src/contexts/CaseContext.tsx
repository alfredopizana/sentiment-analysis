import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { CaseRecord, CaseStatus, CrisisType, Priority, RiskLevel } from '../types';

interface CaseState {
  cases: CaseRecord[];
  currentCase: CaseRecord | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    status?: CaseStatus;
    crisisType?: CrisisType;
    priority?: Priority;
    riskLevel?: RiskLevel;
    search?: string;
  };
}

type CaseAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CASES'; payload: { cases: CaseRecord[]; pagination: any } }
  | { type: 'SET_CURRENT_CASE'; payload: CaseRecord | null }
  | { type: 'ADD_CASE'; payload: CaseRecord }
  | { type: 'UPDATE_CASE'; payload: CaseRecord }
  | { type: 'DELETE_CASE'; payload: string }
  | { type: 'SET_FILTERS'; payload: Partial<CaseState['filters']> }
  | { type: 'CLEAR_FILTERS' };

const initialState: CaseState = {
  cases: [],
  currentCase: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  },
  filters: {},
};

const caseReducer = (state: CaseState, action: CaseAction): CaseState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_CASES':
      return {
        ...state,
        cases: action.payload.cases,
        pagination: action.payload.pagination,
        loading: false,
        error: null,
      };
    
    case 'SET_CURRENT_CASE':
      return { ...state, currentCase: action.payload, loading: false, error: null };
    
    case 'ADD_CASE':
      return {
        ...state,
        cases: [action.payload, ...state.cases],
        pagination: { ...state.pagination, total: state.pagination.total + 1 },
      };
    
    case 'UPDATE_CASE':
      return {
        ...state,
        cases: state.cases.map(c => c._id === action.payload._id ? action.payload : c),
        currentCase: state.currentCase?._id === action.payload._id ? action.payload : state.currentCase,
      };
    
    case 'DELETE_CASE':
      return {
        ...state,
        cases: state.cases.filter(c => c._id !== action.payload),
        pagination: { ...state.pagination, total: state.pagination.total - 1 },
        currentCase: state.currentCase?._id === action.payload ? null : state.currentCase,
      };
    
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    
    case 'CLEAR_FILTERS':
      return { ...state, filters: {} };
    
    default:
      return state;
  }
};

interface CaseContextType {
  state: CaseState;
  dispatch: React.Dispatch<CaseAction>;
}

const CaseContext = createContext<CaseContextType | undefined>(undefined);

export const CaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(caseReducer, initialState);

  return (
    <CaseContext.Provider value={{ state, dispatch }}>
      {children}
    </CaseContext.Provider>
  );
};

export const useCaseContext = () => {
  const context = useContext(CaseContext);
  if (context === undefined) {
    throw new Error('useCaseContext must be used within a CaseProvider');
  }
  return context;
};
