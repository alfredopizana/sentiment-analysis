import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Memory as MemoryIcon,
  Speed as CpuIcon,
  Storage as DiskIcon,
  NetworkCheck as NetworkIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { metricsService, healthService } from '../services/api';

const SystemHealth: React.FC = () => {
  const [systemMetrics, setSystemMetrics] = useState<any>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSystemHealth();
    const interval = setInterval(fetchSystemHealth, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSystemHealth = async () => {
    try {
      setError(null);

      const [metricsResponse, healthResponse] = await Promise.all([
        metricsService.getLatestSystemMetrics(),
        healthService.check()
      ]);

      setSystemMetrics(metricsResponse.data);
      setHealthStatus(healthResponse.data);
    } catch (err) {
      setError('Failed to fetch system health data');
      console.error('System health error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'error';
    if (value >= thresholds.warning) return 'warning';
    return 'success';
  };

  const getHealthStatus = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'Critical';
    if (value >= thresholds.warning) return 'Warning';
    return 'Good';
  };

  const MetricCard: React.FC<{
    title: string;
    value: number;
    unit: string;
    icon: React.ReactNode;
    thresholds: { warning: number; critical: number };
  }> = ({ title, value, unit, icon, thresholds }) => {
    const color = getHealthColor(value, thresholds);
    const status = getHealthStatus(value, thresholds);

    return (
      <Card elevation={2}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6">{title}</Typography>
            <Box sx={{ color: `${color}.main`, fontSize: 30 }}>
              {icon}
            </Box>
          </Box>
          
          <Typography variant="h4" color={`${color}.main`} gutterBottom>
            {Math.round(value)}{unit}
          </Typography>
          
          <LinearProgress
            variant="determinate"
            value={Math.min(value, 100)}
            color={color}
            sx={{ mb: 1 }}
          />
          
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Chip
              label={status}
              color={color}
              size="small"
              icon={status === 'Good' ? <SuccessIcon /> : <ErrorIcon />}
            />
            <Typography variant="body2" color="textSecondary">
              Max: 100{unit}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        System Health Monitor
      </Typography>

      {/* Health Status */}
      {healthStatus && (
        <Alert 
          severity="success" 
          sx={{ mb: 3 }}
          icon={<CheckCircle />}
        >
          System Status: {healthStatus.status} - Last Updated: {new Date(healthStatus.timestamp).toLocaleString()}
        </Alert>
      )}

      {/* System Metrics */}
      {systemMetrics && (
        <>
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="CPU Usage"
                value={systemMetrics.cpuUsagePercent}
                unit="%"
                icon={<CpuIcon />}
                thresholds={{ warning: 70, critical: 90 }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Memory Usage"
                value={systemMetrics.memoryUsagePercent}
                unit="%"
                icon={<MemoryIcon />}
                thresholds={{ warning: 80, critical: 95 }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Disk Usage"
                value={systemMetrics.diskUsagePercent}
                unit="%"
                icon={<DiskIcon />}
                thresholds={{ warning: 85, critical: 95 }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="h6">API Health</Typography>
                    <NetworkIcon sx={{ color: 'primary.main', fontSize: 30 }} />
                  </Box>
                  
                  <Typography variant="h4" color="primary.main" gutterBottom>
                    {Math.round((1 - systemMetrics.errorRate) * 100)}%
                  </Typography>
                  
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Success Rate
                  </Typography>
                  
                  <Box>
                    <Typography variant="body2">
                      Total Requests: {systemMetrics.totalRequests}
                    </Typography>
                    <Typography variant="body2">
                      Failed: {systemMetrics.failedRequests}
                    </Typography>
                    <Typography variant="body2">
                      Avg Response: {Math.round(systemMetrics.averageResponseTime)}ms
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Performance Metrics */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} md={6}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    🚀 Processing Performance
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Throughput
                      </Typography>
                      <Typography variant="h5" color="primary">
                        {Math.round(systemMetrics.casesProcessedPerHour)} cases/hour
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Avg Processing Time
                      </Typography>
                      <Typography variant="h5" color="info.main">
                        {Math.round(systemMetrics.averageProcessingTime)}ms
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Model Version
                      </Typography>
                      <Typography variant="body1">
                        {systemMetrics.modelVersion}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Error Rate
                      </Typography>
                      <Typography variant="body1" color={systemMetrics.errorRate > 0.05 ? 'error.main' : 'success.main'}>
                        {Math.round(systemMetrics.errorRate * 100)}%
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    📊 Queue Status
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Queue Length
                      </Typography>
                      <Typography variant="h5" color="warning.main">
                        {systemMetrics.queueLength || 0}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Avg Wait Time
                      </Typography>
                      <Typography variant="h5" color="secondary.main">
                        {Math.round(systemMetrics.queueWaitTime || 0)}ms
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Box mt={2}>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                          Queue Status
                        </Typography>
                        <Chip
                          label={systemMetrics.queueLength > 10 ? 'High Load' : 'Normal'}
                          color={systemMetrics.queueLength > 10 ? 'warning' : 'success'}
                          variant="outlined"
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* System Alerts */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    🚨 System Alerts
                  </Typography>
                  <Box>
                    {systemMetrics.cpuUsagePercent > 90 && (
                      <Alert severity="error" sx={{ mb: 1 }}>
                        Critical: CPU usage is at {Math.round(systemMetrics.cpuUsagePercent)}%
                      </Alert>
                    )}
                    {systemMetrics.memoryUsagePercent > 95 && (
                      <Alert severity="error" sx={{ mb: 1 }}>
                        Critical: Memory usage is at {Math.round(systemMetrics.memoryUsagePercent)}%
                      </Alert>
                    )}
                    {systemMetrics.errorRate > 0.1 && (
                      <Alert severity="warning" sx={{ mb: 1 }}>
                        Warning: High error rate detected ({Math.round(systemMetrics.errorRate * 100)}%)
                      </Alert>
                    )}
                    {systemMetrics.queueLength > 20 && (
                      <Alert severity="warning" sx={{ mb: 1 }}>
                        Warning: High queue length ({systemMetrics.queueLength} items)
                      </Alert>
                    )}
                    {systemMetrics.cpuUsagePercent < 70 && 
                     systemMetrics.memoryUsagePercent < 80 && 
                     systemMetrics.errorRate < 0.05 && (
                      <Alert severity="success">
                        All systems operating normally
                      </Alert>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default SystemHealth;
