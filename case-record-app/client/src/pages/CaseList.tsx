import React, { useEffect, useState } from 'react';
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
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Analytics as AnalyticsIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { useCases } from '../hooks/useCases';
import { useNotification } from '../contexts/NotificationContext';
import StatusChip from '../components/common/StatusChip';
import FieldUpdateIndicator from '../components/common/FieldUpdateIndicator';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { CaseRecord, CaseStatus, CrisisType, Priority, RiskLevel } from '../types';

const CaseList: React.FC = () => {
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
  } = useCases();

  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  useEffect(() => {
    fetchCases({
      page: 1,
      limit: 10,
      ...filters,
    });
  }, [filters, fetchCases]);

  const handleSearch = () => {
    setFilters({ ...filters, search: searchTerm });
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setFilters({ ...filters, search: undefined });
  };

  const handleFilterChange = (field: string, value: any) => {
    setFilters({ ...filters, [field]: value || undefined });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this case?')) {
      try {
        await deleteCase(id);
        showSuccess('Case deleted successfully');
      } catch (error) {
        showError('Failed to delete case');
      }
    }
  };

  const handleAnalyze = async (id: string) => {
    try {
      await analyzeCase(id);
      showSuccess('Case analyzed successfully');
    } catch (error) {
      showError('Failed to analyze case');
    }
  };

  const columns: GridColDef[] = [
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
        />,
        <GridActionsCellItem
          icon={
            <Tooltip title="Delete Case">
              <DeleteIcon />
            </Tooltip>
          }
          label="Delete"
          onClick={() => handleDelete(params.id as string)}
          showInMenu
        />,
      ],
    },
  ];

  if (loading && !cases.length) {
    return <LoadingSpinner message="Loading cases..." />;
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
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <IconButton onClick={handleSearch} size="small">
                <SearchIcon />
              </IconButton>
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
          onPaginationModelChange={(model: any) => {
            fetchCases({
              ...filters,
              page: model.page + 1,
              limit: model.pageSize,
            });
          }}
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

export default CaseList;
