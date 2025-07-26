import React, { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { useCases } from '../hooks/useCases';
import { caseApi } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusChip from '../components/common/StatusChip';
import { CaseStatus, Priority, RiskLevel } from '../types';

interface DashboardStats {
  totalCases: number;
  statusDistribution: Record<string, number>;
  crisisTypeDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  riskLevelDistribution: Record<string, number>;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { cases, fetchCases, loading } = useCases();
  const { showError } = useNotification();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetchCases({ limit: 5, sortBy: 'updatedAt', sortOrder: 'desc' });
    fetchStats();
  }, [fetchCases]);

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await caseApi.getCaseStats();
      setStats(response.data);
    } catch (error: any) {
      showError('Failed to fetch dashboard statistics');
    } finally {
      setStatsLoading(false);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    onClick?: () => void;
  }> = ({ title, value, icon, color, onClick }) => (
    <Card 
      sx={{ 
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { boxShadow: 4 } : {},
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="h2">
              {value}
            </Typography>
          </Box>
          <Box sx={{ color, fontSize: 40 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const getHighPriorityCases = () => {
    return cases.filter(c => 
      c.priority === Priority.HIGH || 
      c.priority === Priority.CRITICAL ||
      c.assessment.riskLevel === RiskLevel.HIGH ||
      c.assessment.riskLevel === RiskLevel.IMMINENT
    );
  };

  if (loading && !cases.length) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Cases"
            value={stats?.totalCases || 0}
            icon={<AssignmentIcon />}
            color="#1976d2"
            onClick={() => navigate('/cases')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="High Priority"
            value={stats?.priorityDistribution?.high || 0}
            icon={<WarningIcon />}
            color="#f57c00"
            onClick={() => navigate('/cases?priority=high')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Critical Risk"
            value={stats?.riskLevelDistribution?.imminent || 0}
            icon={<TrendingUpIcon />}
            color="#d32f2f"
            onClick={() => navigate('/cases?riskLevel=imminent')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Cases"
            value={(stats?.statusDistribution?.open || 0) + (stats?.statusDistribution?.in_progress || 0)}
            icon={<PeopleIcon />}
            color="#388e3c"
            onClick={() => navigate('/cases?status=open,in_progress')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Cases */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Recent Cases</Typography>
              <Button 
                variant="outlined" 
                size="small"
                onClick={() => navigate('/cases')}
              >
                View All
              </Button>
            </Box>
            {loading ? (
              <LoadingSpinner size={30} />
            ) : (
              <List>
                {cases.slice(0, 5).map((caseItem, index) => (
                  <React.Fragment key={`recent-${caseItem._id}-${index}`}>
                    <ListItem
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/cases/${caseItem._id}`)}
                    >
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1} component="div">
                            <Box component="span" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                              {caseItem.caseNumber}
                            </Box>
                            <StatusChip status={caseItem.status} type="status" />
                            <StatusChip status={caseItem.priority} type="priority" />
                          </Box>
                        }
                        secondary={
                          <Box component="div">
                            <Box component="div" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                              {caseItem.personalInfo.firstName} {caseItem.personalInfo.lastName}
                            </Box>
                            <Box component="div" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                              {new Date(caseItem.updatedAt).toLocaleDateString()}
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < cases.slice(0, 5).length - 1 && <Divider />}
                  </React.Fragment>
                ))}
                {cases.length === 0 && (
                  <ListItem key="no-recent-cases">
                    <ListItemText
                      primary="No cases found"
                      secondary="Create your first case to get started"
                    />
                  </ListItem>
                )}
              </List>
            )}
          </Paper>
        </Grid>

        {/* High Priority Cases */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              High Priority & Risk Cases
            </Typography>
            {loading ? (
              <LoadingSpinner size={30} />
            ) : (
              <List>
                {getHighPriorityCases().slice(0, 5).map((caseItem, index) => (
                  <React.Fragment key={`priority-${caseItem._id}-${index}`}>
                    <ListItem
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/cases/${caseItem._id}`)}
                    >
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1} component="div">
                            <Box component="span" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                              {caseItem.caseNumber}
                            </Box>
                            <StatusChip status={caseItem.priority} type="priority" />
                            <StatusChip status={caseItem.assessment.riskLevel} type="risk" />
                          </Box>
                        }
                        secondary={
                          <Box component="div">
                            <Box component="div" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                              {caseItem.personalInfo.firstName} {caseItem.personalInfo.lastName}
                            </Box>
                            <Box component="div" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                              {caseItem.crisisType.replace('_', ' ').toUpperCase()}
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < getHighPriorityCases().slice(0, 5).length - 1 && <Divider />}
                  </React.Fragment>
                ))}
                {getHighPriorityCases().length === 0 && (
                  <ListItem key="no-priority-cases">
                    <ListItemText
                      primary="No high priority cases"
                      secondary="All cases are currently low to medium priority"
                    />
                  </ListItem>
                )}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Statistics Overview */}
        {stats && !statsLoading && (
          <>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Cases by Status
                </Typography>
                <List dense>
                  {Object.entries(stats.statusDistribution).map(([status, count]) => (
                    <ListItem key={`status-${status}`}>
                      <ListItemText
                        primary={
                          <Box display="flex" justifyContent="space-between" alignItems="center" component="div">
                            <StatusChip status={status as CaseStatus} type="status" />
                            <Box component="span" sx={{ fontSize: '1.25rem', fontWeight: 600 }}>
                              {count}
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Crisis Types
                </Typography>
                <List dense>
                  {Object.entries(stats.crisisTypeDistribution).map(([type, count]) => (
                    <ListItem key={`crisis-${type}`}>
                      <ListItemText
                        primary={
                          <Box display="flex" justifyContent="space-between" alignItems="center" component="div">
                            <Box component="span" sx={{ fontSize: '0.875rem' }}>
                              {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Box>
                            <Box component="span" sx={{ fontSize: '1.25rem', fontWeight: 600 }}>
                              {count}
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
          </>
        )}
      </Grid>
    </Box>
  );
};

export default Dashboard;
