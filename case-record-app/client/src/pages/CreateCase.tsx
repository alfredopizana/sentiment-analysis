import React from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import { useCases } from '../hooks/useCases';
import { useNotification } from '../contexts/NotificationContext';
import CaseForm from '../components/forms/CaseForm';
import { CaseFormData } from '../types';

const CreateCase: React.FC = () => {
  const navigate = useNavigate();
  const { createCase, loading } = useCases();
  const { showSuccess, showError } = useNotification();

  const handleSubmit = async (data: CaseFormData) => {
    try {
      const newCase = await createCase(data);
      showSuccess('Case created successfully');
      if (newCase?._id) {
        navigate(`/cases/${newCase._id}`);
      } else {
        navigate('/cases');
      }
    } catch (error) {
      showError('Failed to create case');
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Create New Case
      </Typography>
      
      <CaseForm
        onSubmit={handleSubmit}
        isLoading={loading}
        mode="create"
      />
    </Box>
  );
};

export default CreateCase;
