import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Skeleton,
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Analytics as AnalyticsIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';

import { useOptimizedCases } from '../hooks/useOptimizedCases';
import { useNotification } from '../contexts/NotificationContext';
import StatusChip from '../components/common/StatusChip';
import FieldUpdateIndicator from '../components/common/FieldUpdateIndicator';
import { CaseStatus, CrisisType, Priority, RiskLevel } from '../types';

const OptimizedCaseList: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const {
    cases,
    loading,
    pagination,
    filters,
    fetchCases,
    deleteCase,
    analyzeCase,
    setFilters,
    clearFilters,
  } = useOptimizedCases();

  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [localLoading, setLocalLoading] = useState<Record<string, boolean>>({});

  // Debounced search to prevent excessive API calls
  const debouncedSearch = useMemo(
    () => debounce((term: string) => {
      setFilters({ ...filters, search: term || undefined });
    }, 500),
    [filters, setFilters]
  );

  // Initial data fetch - only runs once
  useEffect(() => {
    fetchCases({
      page: 1,
      limit: 10,
      ...filters,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once

  // Handle filter changes - debounced to prevent excessive calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchCases({
        page: 1,
        limit: pagination.limit,
        ...filters,
      });
    }, 300);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]); // Only depend on filters

  // Handle search input changes
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    debouncedSearch('');
  }, [debouncedSearch]);

  const handleFilterChange = useCallback((field: string, value: any) => {
    setFilters({ ...filters, [field]: value || undefined });
  }, [filters, setFilters]);

  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('Are you sure you want to delete this case?')) {
      setLocalLoading(prev => ({ ...prev, [`delete-${id}`]: true }));
      try {
        await deleteCase(id);
        showSuccess('Case deleted successfully');
      } catch (error) {
        showError('Failed to delete case');
      } finally {
        setLocalLoading(prev => ({ ...prev, [`delete-${id}`]: false }));
      }
    }
  }, [deleteCase, showSuccess, showError]);

  const handleAnalyze = useCallback(async (id: string) => {
    setLocalLoading(prev => ({ ...prev, [`analyze-${id}`]: true }));
    try {
      await analyzeCase(id);
      showSuccess('Case analyzed successfully');
    } catch (error) {
      showError('Failed to analyze case');
    } finally {
      setLocalLoading(prev => ({ ...prev, [`analyze-${id}`]: false }));
    }
  }, [analyzeCase, showSuccess, showError]);

  const handlePaginationChange = useCallback((model: any) => {
    fetchCases({
      ...filters,
      page: model.page + 1,
      limit: model.pageSize,
    });
  }, [filters, fetchCases]);

  // Memoized columns to prevent recreation on every render
  const columns: GridColDef[] = useMemo(() => [
    {
      field: 'caseNumber',
      headerName: 'Case Number',
      width: 150,
      renderCell: (params) => (
        <Button
          variant="text"
          onClick={() => navigate(`/cases/${params.row._id}`)}
          sx={{ textTransform: 'none' }}
        >
          {params.value}
        </Button>
      ),
    },
    {
      field: 'personalInfo',
      headerName: 'Name',
      width: 200,
      valueGetter: (params) => 
        `${params.row.personalInfo.firstName} ${params.row.personalInfo.lastName}`,
    },
    {
      field: 'crisisType',
      headerName: 'Crisis Type',
      width: 150,
      valueFormatter: (params) => 
        params.value.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <StatusChip status={params.value} type="status" />
      ),
    },
    {
      field: 'priority',
      headerName: 'Priority',
      width: 120,
      renderCell: (params) => (
        <StatusChip status={params.value} type="priority" />
      ),
    },
    {
      field: 'riskLevel',
      headerName: 'Risk Level',
      width: 130,
      valueGetter: (params) => params.row.assessment.riskLevel,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" gap={1}>
          <StatusChip status={params.value} type="risk" />
          <FieldUpdateIndicator
            fieldPath="assessment.riskLevel"
            fieldUpdates={params.row.fieldUpdates || []}
          />
        </Box>
      ),
    },
    {
      field: 'sentimentScore',
      headerName: 'Sentiment',
      width: 100,
      valueGetter: (params) => params.row.assessment.sentimentScore,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="body2">
            {params.value ? params.value.toFixed(2) : 'N/A'}
          </Typography>
          {params.value && (
            <FieldUpdateIndicator
              fieldPath="assessment.sentimentScore"
              fieldUpdates={params.row.fieldUpdates || []}
            />
          )}
        </Box>
      ),
    },
    {
      field: 'updatedAt',
      headerName: 'Last Updated',
      width: 150,
      valueFormatter: (params) => 
        new Date(params.value).toLocaleDateString(),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 150,
      getActions: (params) => [
        <GridActionsCellItem
          icon={
            <Tooltip title="View Details">
              <ViewIcon />
            </Tooltip>
          }
          label="View"
          onClick={() => navigate(`/cases/${params.id}`)}
        />,
        <GridActionsCellItem
          icon={
            <Tooltip title="Edit Case">
              <EditIcon />
            </Tooltip>
          }
          label="Edit"
          onClick={() => navigate(`/cases/${params.id}/edit`)}
        />,
        <GridActionsCellItem
          icon={
            <Tooltip title="Analyze with AI">
              <AnalyticsIcon />
            </Tooltip>
          }
          label="Analyze"
          onClick={() => handleAnalyze(params.id as string)}
          disabled={localLoading[`analyze-${params.id}`]}
        />,
        <GridActionsCellItem
          icon={
            <Tooltip title="Delete Case">
              <DeleteIcon />
            </Tooltip>
          }
          label="Delete"
          onClick={() => handleDelete(params.id as string)}
          disabled={localLoading[`delete-${params.id}`]}
          showInMenu
        />,
      ],
    },
  ], [navigate, handleAnalyze, handleDelete, localLoading]);

  // Loading skeleton for better UX
  const LoadingSkeleton = () => (
    <Box>
      <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={120} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={400} />
    </Box>
  );

  if (loading && !cases.length) {
    return <LoadingSkeleton />;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Cases</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/cases/new')}
        >
          New Case
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <Box display="flex" gap={1}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search cases..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              {searchTerm && (
                <IconButton onClick={handleClearSearch} size="small">
                  <ClearIcon />
                </IconButton>
              )}
            </Box>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status || ''}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {Object.values(CaseStatus).map((status: string) => (
                  <MenuItem key={status} value={status}>
                    {status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Crisis Type</InputLabel>
              <Select
                value={filters.crisisType || ''}
                label="Crisis Type"
                onChange={(e) => handleFilterChange('crisisType', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {Object.values(CrisisType).map((type: string) => (
                  <MenuItem key={type} value={type}>
                    {type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Priority</InputLabel>
              <Select
                value={filters.priority || ''}
                label="Priority"
                onChange={(e) => handleFilterChange('priority', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {Object.values(Priority).map((priority: string) => (
                  <MenuItem key={priority} value={priority}>
                    {priority.replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Risk Level</InputLabel>
              <Select
                value={filters.riskLevel || ''}
                label="Risk Level"
                onChange={(e) => handleFilterChange('riskLevel', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {Object.values(RiskLevel).map((risk: string) => (
                  <MenuItem key={risk} value={risk}>
                    {risk.replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={1}>
            <Button
              variant="outlined"
              onClick={clearFilters}
              size="small"
              fullWidth
            >
              Clear
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Data Grid */}
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={cases}
          columns={columns}
          getRowId={(row: any) => row._id}
          loading={loading}
          pagination
          paginationMode="server"
          rowCount={pagination.total}
          paginationModel={{
            page: pagination.page - 1,
            pageSize: pagination.limit,
          }}
          onPaginationModelChange={handlePaginationChange}
          pageSizeOptions={[5, 10, 25, 50]}
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
          }}
        />
      </Paper>
    </Box>
  );
};

export default OptimizedCaseList;
