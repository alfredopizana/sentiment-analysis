import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Grid,
  Typography,
  Paper,
  Divider,
} from '@mui/material';
import { CaseFormData, CrisisType, Priority, RiskLevel, CaseStatus, Gender } from '../../types';

interface CaseFormProps {
  initialData?: Partial<CaseFormData>;
  onSubmit: (data: CaseFormData) => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

const CaseForm: React.FC<CaseFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false,
  mode = 'create'
}) => {
  const [formData, setFormData] = useState<Partial<CaseFormData>>({
    caseNumber: '',
    crisisType: CrisisType.GENERAL_EMERGENCY,
    status: CaseStatus.OPEN,
    priority: Priority.MEDIUM,
    createdBy: 'current-user', // This should come from auth context
    lastModifiedBy: 'current-user',
    personalInfo: {
      firstName: '',
      lastName: '',
      phoneNumber: '',
      email: '',
      gender: Gender.PREFER_NOT_TO_SAY,
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'USA'
      }
    },
    crisisDetails: {
      description: '',
      location: '',
      dateTime: new Date(),
      witnesses: [],
      involvedParties: [],
      riskFactors: [],
      immediateNeeds: []
    },
    assessment: {
      riskLevel: RiskLevel.LOW,
      emotionalState: [],
      cognitiveState: '',
      physicalCondition: '',
      socialSupport: '',
      copingMechanisms: [],
      strengths: [],
      concerns: [],
      recommendations: []
    },
    actions: [],
    ...initialData
  });

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const handleInputChange = (field: string, value: any) => {
    const keys = field.split('.');
    setFormData(prev => {
      const updated = { ...prev };
      let current: any = updated;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData as CaseFormData);
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Case Information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Case Number"
              value={formData.caseNumber || ''}
              onChange={(e) => handleInputChange('caseNumber', e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>Crisis Type</InputLabel>
              <Select
                value={formData.crisisType || ''}
                onChange={(e) => handleInputChange('crisisType', e.target.value)}
                label="Crisis Type"
              >
                {Object.values(CrisisType).map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>Priority</InputLabel>
              <Select
                value={formData.priority || ''}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                label="Priority"
              >
                {Object.values(Priority).map((priority) => (
                  <MenuItem key={priority} value={priority}>
                    {priority.replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status || ''}
                onChange={(e) => handleInputChange('status', e.target.value)}
                label="Status"
              >
                {Object.values(CaseStatus).map((status) => (
                  <MenuItem key={status} value={status}>
                    {status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Personal Information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="First Name"
              value={formData.personalInfo?.firstName || ''}
              onChange={(e) => handleInputChange('personalInfo.firstName', e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Last Name"
              value={formData.personalInfo?.lastName || ''}
              onChange={(e) => handleInputChange('personalInfo.lastName', e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Phone Number"
              value={formData.personalInfo?.phoneNumber || ''}
              onChange={(e) => handleInputChange('personalInfo.phoneNumber', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.personalInfo?.email || ''}
              onChange={(e) => handleInputChange('personalInfo.email', e.target.value)}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Crisis Details
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description"
              value={formData.crisisDetails?.description || ''}
              onChange={(e) => handleInputChange('crisisDetails.description', e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Location"
              value={formData.crisisDetails?.location || ''}
              onChange={(e) => handleInputChange('crisisDetails.location', e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="datetime-local"
              label="Date & Time"
              value={formData.crisisDetails?.dateTime ? 
                new Date(formData.crisisDetails.dateTime).toISOString().slice(0, 16) : 
                new Date().toISOString().slice(0, 16)
              }
              onChange={(e) => handleInputChange('crisisDetails.dateTime', new Date(e.target.value))}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Assessment
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>Risk Level</InputLabel>
              <Select
                value={formData.assessment?.riskLevel || ''}
                onChange={(e) => handleInputChange('assessment.riskLevel', e.target.value)}
                label="Risk Level"
              >
                {Object.values(RiskLevel).map((risk) => (
                  <MenuItem key={risk} value={risk}>
                    {risk.replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Cognitive State"
              value={formData.assessment?.cognitiveState || ''}
              onChange={(e) => handleInputChange('assessment.cognitiveState', e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Physical Condition"
              value={formData.assessment?.physicalCondition || ''}
              onChange={(e) => handleInputChange('assessment.physicalCondition', e.target.value)}
            />
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          type="submit"
          variant="contained"
          disabled={isLoading}
          size="large"
        >
          {isLoading ? 'Saving...' : mode === 'create' ? 'Create Case' : 'Update Case'}
        </Button>
      </Box>
    </Box>
  );
};

export default CaseForm;
