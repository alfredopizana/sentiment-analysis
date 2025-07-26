import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { Edit as EditIcon, Analytics as AnalyticsIcon } from '@mui/icons-material';

import { Action } from '../types';

import { useCases } from '../hooks/useCases';
import { useNotification } from '../contexts/NotificationContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusChip from '../components/common/StatusChip';
import FieldUpdateIndicator from '../components/common/FieldUpdateIndicator';

const CaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const { currentCase, loading, fetchCaseById, analyzeCase } = useCases();

  useEffect(() => {
    if (id) {
      fetchCaseById(id);
    }
  }, [id, fetchCaseById]);

  const handleAnalyze = async () => {
    if (!id) return;
    try {
      await analyzeCase(id);
      showSuccess('Case analyzed successfully');
    } catch (error) {
      showError('Failed to analyze case');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading case details..." />;
  }

  if (!currentCase) {
    return (
      <Box textAlign="center" mt={4}>
        <Typography variant="h6">Case not found</Typography>
        <Button onClick={() => navigate('/cases')} sx={{ mt: 2 }}>
          Back to Cases
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Case Details</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<AnalyticsIcon />}
            onClick={handleAnalyze}
          >
            Analyze with AI
          </Button>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/cases/${id}/edit`)}
          >
            Edit Case
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Case Overview */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Case Overview
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Case Number
                </Typography>
                <Typography variant="body1">{currentCase.caseNumber}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Status
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <StatusChip status={currentCase.status} type="status" />
                  <FieldUpdateIndicator
                    fieldPath="status"
                    fieldUpdates={currentCase.fieldUpdates || []}
                  />
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Priority
                </Typography>
                <StatusChip status={currentCase.priority} type="priority" />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Crisis Type
                </Typography>
                <Typography variant="body1">
                  {currentCase.crisisType.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
              Personal Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Name
                </Typography>
                <Typography variant="body1">
                  {currentCase.personalInfo.firstName} {currentCase.personalInfo.lastName}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Phone
                </Typography>
                <Typography variant="body1">
                  {currentCase.personalInfo.phoneNumber || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Email
                </Typography>
                <Typography variant="body1">
                  {currentCase.personalInfo.email || 'N/A'}
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
              Crisis Details
            </Typography>
            <Typography variant="subtitle2" color="textSecondary">
              Description
            </Typography>
            <Typography variant="body1" paragraph>
              {currentCase.crisisDetails.description}
            </Typography>
            
            <Typography variant="subtitle2" color="textSecondary">
              Location
            </Typography>
            <Typography variant="body1" paragraph>
              {currentCase.crisisDetails.location}
            </Typography>

            <Typography variant="subtitle2" color="textSecondary">
              Date & Time
            </Typography>
            <Typography variant="body1">
              {new Date(currentCase.crisisDetails.dateTime).toLocaleString()}
            </Typography>
          </Paper>
        </Grid>

        {/* Assessment & Analysis */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Assessment
            </Typography>
            
            <Box mb={2}>
              <Typography variant="subtitle2" color="textSecondary">
                Risk Level
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <StatusChip status={currentCase.assessment.riskLevel} type="risk" />
                <FieldUpdateIndicator
                  fieldPath="assessment.riskLevel"
                  fieldUpdates={currentCase.fieldUpdates || []}
                />
              </Box>
            </Box>

            {currentCase.assessment.sentimentScore !== undefined && (
              <Box mb={2}>
                <Typography variant="subtitle2" color="textSecondary">
                  Sentiment Score
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body1">
                    {currentCase.assessment.sentimentScore.toFixed(2)}
                  </Typography>
                  <FieldUpdateIndicator
                    fieldPath="assessment.sentimentScore"
                    fieldUpdates={currentCase.fieldUpdates || []}
                  />
                </Box>
              </Box>
            )}

            {currentCase.assessment.emotionalState && currentCase.assessment.emotionalState.length > 0 && (
              <Box mb={2}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Emotional State
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {currentCase.assessment.emotionalState?.map((emotion: string) => (
                    <Chip key={emotion} label={emotion} size="small" />
                  ))}
                  <FieldUpdateIndicator
                    fieldPath="assessment.emotionalState"
                    fieldUpdates={currentCase.fieldUpdates || []}
                  />
                </Box>
              </Box>
            )}

            {currentCase.assessment.recommendations && currentCase.assessment.recommendations.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Recommendations
                </Typography>
                <List dense>
                  {currentCase.assessment.recommendations?.map((rec: string, index: number) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemText primary={rec} />
                    </ListItem>
                  ))}
                </List>
                <FieldUpdateIndicator
                  fieldPath="assessment.recommendations"
                  fieldUpdates={currentCase.fieldUpdates || []}
                />
              </Box>
            )}
          </Paper>

          {/* Actions */}
          {currentCase.actions && currentCase.actions.length > 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Actions
              </Typography>
              <List>
                {currentCase.actions?.map((action: Action) => (
                  <ListItem key={action._id} sx={{ px: 0 }}>
                    <ListItemText
                      primary={action.description}
                      secondary={`Assigned to: ${action.assignedTo} | Status: ${action.status}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default CaseDetail;
