import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  Psychology as ConfidenceIcon,
  TrendingUp as PerformanceIcon,
} from '@mui/icons-material';

import { metricsService } from '../services/api';

const CaseDetails: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const [caseMetrics, setCaseMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (caseId) {
      fetchCaseDetails();
    }
  }, [caseId]);

  const fetchCaseDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await metricsService.getCaseMetrics(caseId!);
      setCaseMetrics(response.data);
    } catch (err) {
      setError('Failed to fetch case details');
      console.error('Case details error:', err);
    } finally {
      setLoading(false);
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

  if (!caseMetrics) {
    return (
      <Alert severity="info">
        No metrics found for case ID: {caseId}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Case Analysis: {caseId}
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total Analyses
                  </Typography>
                  <Typography variant="h4" component="div" color="primary">
                    {caseMetrics.summary.totalAnalyses}
                  </Typography>
                </Box>
                <PerformanceIcon sx={{ color: 'primary.main', fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Avg Processing Time
                  </Typography>
                  <Typography variant="h4" component="div" color="info.main">
                    {Math.round(caseMetrics.summary.avgProcessingTime)}ms
                  </Typography>
                </Box>
                <TimeIcon sx={{ color: 'info.main', fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Avg Confidence
                  </Typography>
                  <Typography variant="h4" component="div" color="warning.main">
                    {Math.round(caseMetrics.summary.avgConfidence * 100)}%
                  </Typography>
                </Box>
                <ConfidenceIcon sx={{ color: 'warning.main', fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total Time Saved
                  </Typography>
                  <Typography variant="h4" component="div" color="success.main">
                    {Math.round(caseMetrics.summary.totalTimeSaved / (1000 * 60 * 60) * 100) / 100}h
                  </Typography>
                </Box>
                <TimeIcon sx={{ color: 'success.main', fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Metrics Table */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Analysis History
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Crisis Type</TableCell>
                      <TableCell align="right">Processing Time</TableCell>
                      <TableCell align="right">Text Length</TableCell>
                      <TableCell align="right">Fields Analyzed</TableCell>
                      <TableCell align="right">Fields Updated</TableCell>
                      <TableCell align="right">Confidence</TableCell>
                      <TableCell align="right">Time Saved</TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {caseMetrics.metrics.map((metric: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>
                          {new Date(metric.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={metric.crisisType} 
                            size="small" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {metric.processingTimeMs}ms
                        </TableCell>
                        <TableCell align="right">
                          {metric.textLength}
                        </TableCell>
                        <TableCell align="right">
                          {metric.fieldsAnalyzed}
                        </TableCell>
                        <TableCell align="right">
                          {metric.fieldsUpdated}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${Math.round(metric.confidenceScore * 100)}%`}
                            size="small"
                            color={
                              metric.confidenceScore > 0.8 ? 'success' :
                              metric.confidenceScore > 0.6 ? 'warning' : 'error'
                            }
                          />
                        </TableCell>
                        <TableCell align="right">
                          {Math.round(metric.timeSavedMs / (1000 * 60) * 100) / 100}min
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={metric.errors?.length > 0 ? 'Error' : 'Success'}
                            size="small"
                            color={metric.errors?.length > 0 ? 'error' : 'success'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Sentiment Analysis Results */}
        {caseMetrics.metrics[0]?.sentimentResults && (
          <Grid item xs={12}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Latest Sentiment Analysis Results
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Field</TableCell>
                        <TableCell>Original Value</TableCell>
                        <TableCell>Analyzed Value</TableCell>
                        <TableCell align="center">Sentiment</TableCell>
                        <TableCell align="right">Confidence</TableCell>
                        <TableCell align="right">Emotional Intensity</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {caseMetrics.metrics[0].sentimentResults.map((result: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {result.field}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="textSecondary">
                              {result.originalValue || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {result.analyzedValue}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={result.sentiment}
                              size="small"
                              color={
                                result.sentiment === 'positive' ? 'success' :
                                result.sentiment === 'negative' ? 'error' : 'default'
                              }
                            />
                          </TableCell>
                          <TableCell align="right">
                            {Math.round(result.confidence * 100)}%
                          </TableCell>
                          <TableCell align="right">
                            <Box display="flex" alignItems="center" justifyContent="flex-end">
                              <Typography variant="body2" mr={1}>
                                {Math.round(result.emotionalIntensity * 100)}%
                              </Typography>
                              <Box
                                sx={{
                                  width: 50,
                                  height: 8,
                                  backgroundColor: 'grey.300',
                                  borderRadius: 1,
                                  overflow: 'hidden'
                                }}
                              >
                                <Box
                                  sx={{
                                    width: `${result.emotionalIntensity * 100}%`,
                                    height: '100%',
                                    backgroundColor: 
                                      result.emotionalIntensity > 0.7 ? 'error.main' :
                                      result.emotionalIntensity > 0.4 ? 'warning.main' : 'success.main'
                                  }}
                                />
                              </Box>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default CaseDetails;
