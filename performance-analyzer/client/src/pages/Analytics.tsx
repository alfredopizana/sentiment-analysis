import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
} from 'recharts';

import { analyticsService } from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

const Analytics: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [timeRange, setTimeRange] = useState('24h');
  const [metric, setMetric] = useState('processingTime');
  const [interval, setInterval] = useState('hour');
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [efficiencyData, setEfficiencyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange, metric, interval]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [timeSeriesResponse, efficiencyResponse] = await Promise.all([
        analyticsService.getTimeSeries(metric, interval, timeRange),
        analyticsService.getEfficiency(timeRange)
      ]);

      setTimeSeriesData(timeSeriesResponse.data.data);
      setEfficiencyData(efficiencyResponse.data);
    } catch (err) {
      setError('Failed to fetch analytics data');
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: number, metricType: string) => {
    switch (metricType) {
      case 'processingTime':
        return `${Math.round(value)}ms`;
      case 'confidence':
        return `${Math.round(value * 100)}%`;
      case 'timeSaved':
        return `${Math.round(value / (1000 * 60 * 60) * 100) / 100}h`;
      case 'throughput':
        return `${value} cases`;
      default:
        return value.toString();
    }
  };

  const getMetricLabel = (metricType: string) => {
    switch (metricType) {
      case 'processingTime':
        return 'Processing Time (ms)';
      case 'confidence':
        return 'Confidence Score';
      case 'timeSaved':
        return 'Time Saved (hours)';
      case 'throughput':
        return 'Cases Processed';
      default:
        return metricType;
    }
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
        Advanced Analytics
      </Typography>

      {/* Controls */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="1h">Last Hour</MenuItem>
              <MenuItem value="24h">Last 24 Hours</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Metric</InputLabel>
            <Select
              value={metric}
              label="Metric"
              onChange={(e) => setMetric(e.target.value)}
            >
              <MenuItem value="processingTime">Processing Time</MenuItem>
              <MenuItem value="confidence">Confidence Score</MenuItem>
              <MenuItem value="timeSaved">Time Saved</MenuItem>
              <MenuItem value="throughput">Throughput</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Interval</InputLabel>
            <Select
              value={interval}
              label="Interval"
              onChange={(e) => setInterval(e.target.value)}
            >
              <MenuItem value="hour">Hourly</MenuItem>
              <MenuItem value="day">Daily</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Time Series Analysis" />
          <Tab label="Efficiency Analysis" />
          <Tab label="Correlation Analysis" />
        </Tabs>
      </Box>

      {/* Time Series Analysis */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {getMetricLabel(metric)} Over Time
                </Typography>
                <Box height={400}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(value) => new Date(value).toLocaleString()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                        formatter={(value: any) => [formatValue(value, metric), getMetricLabel(metric)]}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#1976d2" 
                        fill="#1976d2"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Volume Distribution
                </Typography>
                <Box height={300}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                        formatter={(value: any) => [`${value} cases`, 'Volume']}
                      />
                      <Bar dataKey="count" fill="#00C49F" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance Trend
                </Typography>
                <Box height={300}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                        formatter={(value: any) => [formatValue(value, metric), getMetricLabel(metric)]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#FF8042" 
                        strokeWidth={3}
                        dot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Efficiency Analysis */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Efficiency by Crisis Type
                </Typography>
                <Box height={400}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={efficiencyData?.efficiencyByType || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="crisisType" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any) => [`${Math.round(value)}%`, 'Efficiency']}
                      />
                      <Bar dataKey="efficiency" fill="#1976d2" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Efficiency Summary
                </Typography>
                <Box>
                  <Typography variant="body1" gutterBottom>
                    <strong>Total Crisis Types:</strong> {efficiencyData?.summary?.totalTypes || 0}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Average Efficiency:</strong> {Math.round(efficiencyData?.summary?.avgEfficiency || 0)}%
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Best Performing:</strong> {efficiencyData?.summary?.bestPerforming || 'N/A'}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Total Time Saved:</strong> {Math.round(efficiencyData?.summary?.totalTimeSaved || 0)}h
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Detailed Performance by Crisis Type
                </Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #ddd' }}>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Crisis Type</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Cases</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Efficiency</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Avg Confidence</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Avg Processing Time</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Time Saved (h)</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>User Acceptance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(efficiencyData?.efficiencyByType || []).map((type: any, index: number) => (
                        <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '12px' }}>{type.crisisType}</td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>{type.cases}</td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            {Math.round(type.efficiency)}%
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            {Math.round(type.avgConfidence)}%
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            {Math.round(type.avgProcessingTime)}ms
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            {Math.round(type.timeSavedHours * 100) / 100}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            {Math.round(type.userAcceptance)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Correlation Analysis */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Processing Time vs Accuracy
                </Typography>
                <Box height={300}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart data={efficiencyData?.correlationData || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="processingTime" name="Processing Time" unit="ms" />
                      <YAxis dataKey="accuracy" name="Accuracy" unit="%" />
                      <Tooltip 
                        formatter={(value: any, name: string) => [
                          name === 'processingTime' ? `${value}ms` : `${value}%`,
                          name === 'processingTime' ? 'Processing Time' : 'Accuracy'
                        ]}
                      />
                      <Scatter dataKey="accuracy" fill="#1976d2" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Confidence vs Accuracy
                </Typography>
                <Box height={300}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart data={efficiencyData?.correlationData || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="confidence" name="Confidence" unit="%" />
                      <YAxis dataKey="accuracy" name="Accuracy" unit="%" />
                      <Tooltip 
                        formatter={(value: any, name: string) => [`${value}%`, 
                          name === 'confidence' ? 'Confidence' : 'Accuracy'
                        ]}
                      />
                      <Scatter dataKey="accuracy" fill="#00C49F" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
};

export default Analytics;
