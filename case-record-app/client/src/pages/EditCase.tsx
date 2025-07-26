import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';

import { useCases } from '../hooks/useCases';
import { useNotification } from '../contexts/NotificationContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import CaseForm from '../components/forms/CaseForm';
import { CaseFormData } from '../types';

const EditCase: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentCase, loading, fetchCaseById, updateCase } = useCases();
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    if (id) {
      fetchCaseById(id);
    }
  }, [id, fetchCaseById]);

  const handleSubmit = async (data: Partial<CaseFormData>) => {
    if (!id) return;
    
    try {
      await updateCase(id, data);
      showSuccess('Case updated successfully');
      navigate(`/cases/${id}`);
    } catch (error) {
      showError('Failed to update case');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading case..." />;
  }

  if (!currentCase) {
    return (
      <Box textAlign="center" mt={4}>
        <Typography variant="h6">Case not found</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Edit Case: {currentCase.caseNumber}
      </Typography>
      
      <CaseForm
        initialData={currentCase}
        onSubmit={handleSubmit}
        isLoading={loading}
        mode="edit"
      />
    </Box>
  );
};

export default EditCase;
