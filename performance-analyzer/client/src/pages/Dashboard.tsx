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
} from '@mui/material';
import {
  Speed as SpeedIcon,
  AccessTime as TimeIcon,
  Psychology as ConfidenceIcon,
  TrendingUp as EfficiencyIcon,
  ThumbUp as AcceptanceIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import { analyticsService } from '../services/api';

interface OverviewData {
  totalCases: number;
  averageProcessingTime: number;
  totalTimeSavedHours: number;
  averageConfidence: number;
  fieldsAnalyzed: number;
  fieldsUpdated: number;
  userAcceptanceRate: number;
  errorCount: number;
  efficiency: number;
}

interface CrisisTypeData {
  _id: string;
  count: number;
  avgProcessingTime: number;
  avgConfidence: number;
  timeSaved: number;
}

const Dashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState('24h');
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [crisisTypes, setCrisisTypes] = useState<CrisisTypeData[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [overviewResponse, timeSeriesResponse] = await Promise.all([
        analyticsService.getOverview(timeRange),
        analyticsService.getTimeSeries('processingTime', 'hour', timeRange)
      ]);

      setOverview(overviewResponse.data.overview);
      setCrisisTypes(overviewResponse.data.crisisTypes);
      setTimeSeriesData(timeSeriesResponse.data.data);
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
  }> = ({ title, value, icon, color, subtitle }) => (
    <Card elevation={2}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" color={color}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ color, fontSize: 40 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Performance Dashboard
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
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
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={2}>
          <MetricCard
            title="Total Cases"
            value={overview?.totalCases || 0}
            icon={<SpeedIcon />}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <MetricCard
            title="Avg Processing Time"
            value={`${overview?.averageProcessingTime || 0}ms`}
            icon={<TimeIcon />}
            color="info.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <MetricCard
            title="Time Saved"
            value={`${overview?.totalTimeSavedHours || 0}h`}
            icon={<TimeIcon />}
            color="success.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <MetricCard
            title="Avg Confidence"
            value={`${overview?.averageConfidence || 0}%`}
            icon={<ConfidenceIcon />}
            color="warning.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <MetricCard
            title="Efficiency"
            value={`${overview?.efficiency || 0}%`}
            icon={<EfficiencyIcon />}
            color="secondary.main"
            subtitle={`${overview?.fieldsUpdated}/${overview?.fieldsAnalyzed} fields`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <MetricCard
            title="User Acceptance"
            value={`${overview?.userAcceptanceRate || 0}%`}
            icon={<AcceptanceIcon />}
            color="success.main"
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Processing Time Trend */}
        <Grid item xs={12} md={8}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Processing Time Trend
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
                      formatter={(value: any) => [`${value}ms`, 'Processing Time']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#1976d2" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Crisis Types Distribution */}
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Cases by Crisis Type
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={crisisTypes}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ _id, count }) => `${_id}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {crisisTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Crisis Type Performance Table */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance by Crisis Type
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #ddd' }}>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Crisis Type</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Cases</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Avg Processing Time</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Avg Confidence</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Time Saved (h)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crisisTypes.map((type, index) => (
                      <tr key={type._id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px' }}>{type._id}</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>{type.count}</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          {Math.round(type.avgProcessingTime)}ms
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          {Math.round(type.avgConfidence * 100)}%
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          {Math.round(type.timeSaved / (1000 * 60 * 60) * 100) / 100}
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
    </Box>
  );
};

export default Dashboard;
