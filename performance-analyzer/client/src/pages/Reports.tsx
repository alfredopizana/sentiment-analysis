import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Assessment as ReportIcon,
  TrendingUp as ROIIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

import { reportsService } from '../services/api';

const Reports: React.FC = () => {
  const [summaryReport, setSummaryReport] = useState<any>(null);
  const [roiReport, setROiReport] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hourlyRate, setHourlyRate] = useState(25);
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryResponse, roiResponse] = await Promise.all([
        reportsService.getSummary(startDate, endDate),
        reportsService.getROI(hourlyRate, timeRange)
      ]);

      setSummaryReport(summaryResponse.data);
      setROiReport(roiResponse.data);
    } catch (err) {
      setError('Failed to fetch reports');
      console.error('Reports error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    try {
      const response = await reportsService.exportData(format, startDate, endDate);
      
      if (format === 'csv') {
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'performance_data.csv';
        link.click();
        window.URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'performance_data.json';
        link.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export data');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Performance Reports
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Controls */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            size="small"
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            size="small"
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={2}>
          <TextField
            fullWidth
            size="small"
            label="Hourly Rate ($)"
            type="number"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(Number(e.target.value))}
          />
        </Grid>
        <Grid item xs={12} sm={2}>
          <FormControl fullWidth size="small">
            <InputLabel>ROI Period</InputLabel>
            <Select
              value={timeRange}
              label="ROI Period"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 90 Days</MenuItem>
              <MenuItem value="1y">Last Year</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={2}>
          <Button
            fullWidth
            variant="contained"
            onClick={fetchReports}
            startIcon={<ReportIcon />}
          >
            Generate
          </Button>
        </Grid>
      </Grid>

      {/* Export Buttons */}
      <Box mb={3}>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={() => handleExport('csv')}
          sx={{ mr: 1 }}
        >
          Export CSV
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={() => handleExport('json')}
        >
          Export JSON
        </Button>
      </Box>

      {/* Executive Summary */}
      {summaryReport && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  📊 Executive Summary
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Report Period: {new Date(summaryReport.reportPeriod.startDate).toLocaleDateString()} - {new Date(summaryReport.reportPeriod.endDate).toLocaleDateString()} ({summaryReport.reportPeriod.durationDays} days)
                </Typography>
                
                <Grid container spacing={2} mt={2}>
                  <Grid item xs={12} sm={6} md={2}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="primary">
                        {summaryReport.executiveSummary.totalCasesProcessed}
                      </Typography>
                      <Typography variant="body2">Cases Processed</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="success.main">
                        {summaryReport.executiveSummary.totalTimeSavedHours}h
                      </Typography>
                      <Typography variant="body2">Time Saved</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="info.main">
                        {summaryReport.executiveSummary.averageConfidenceScore}%
                      </Typography>
                      <Typography variant="body2">Avg Confidence</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="warning.main">
                        {summaryReport.executiveSummary.overallEfficiency}%
                      </Typography>
                      <Typography variant="body2">Efficiency</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="secondary.main">
                        {summaryReport.executiveSummary.userAcceptanceRate}%
                      </Typography>
                      <Typography variant="body2">User Acceptance</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="error.main">
                        {summaryReport.executiveSummary.errorRate}%
                      </Typography>
                      <Typography variant="body2">Error Rate</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ROI Analysis */}
      {roiReport && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={8}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  💰 Return on Investment Analysis
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Cost Savings
                    </Typography>
                    <Typography variant="h5" color="success.main">
                      ${roiReport.financial.costSavings}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      System Costs
                    </Typography>
                    <Typography variant="h5" color="error.main">
                      ${roiReport.financial.systemCosts}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Net Savings
                    </Typography>
                    <Typography variant="h5" color="primary">
                      ${roiReport.financial.netSavings}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      ROI Percentage
                    </Typography>
                    <Typography variant="h5" color="secondary.main">
                      {roiReport.financial.roiPercentage}%
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  ⚡ Efficiency Metrics
                </Typography>
                <Box>
                  <Typography variant="body2" gutterBottom>
                    <strong>Time Reduction:</strong> {roiReport.efficiency.timeReduction}%
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Cost per Case:</strong> ${roiReport.efficiency.costPerCase}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Savings per Case:</strong> ${roiReport.efficiency.savingsPerCase}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Total Cases:</strong> {roiReport.metrics.totalCases}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Daily Trends */}
      {summaryReport?.dailyTrends && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📈 Daily Performance Trends
                </Typography>
                <Box height={300}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={summaryReport.dailyTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="cases" 
                        stroke="#1976d2" 
                        name="Cases"
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="avgConfidence" 
                        stroke="#00C49F" 
                        name="Avg Confidence (%)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Crisis Type Performance */}
      {summaryReport?.crisisTypeBreakdown && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🎯 Performance by Crisis Type
                </Typography>
                <Box height={300}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summaryReport.crisisTypeBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="crisisType" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="efficiency" fill="#1976d2" name="Efficiency (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Recommendations */}
      {summaryReport?.recommendations && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  💡 Recommendations
                </Typography>
                <Box>
                  {summaryReport.recommendations.map((recommendation: string, index: number) => (
                    <Chip
                      key={index}
                      label={recommendation}
                      variant="outlined"
                      sx={{ m: 0.5 }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default Reports;
