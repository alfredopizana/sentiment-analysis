import React from 'react';
import { Chip } from '@mui/material';
import { CaseStatus, Priority, RiskLevel } from '../../types';

interface StatusChipProps {
  status: CaseStatus | Priority | RiskLevel;
  type: 'status' | 'priority' | 'risk';
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, type }) => {
  const getStatusConfig = () => {
    switch (type) {
      case 'status':
        switch (status as CaseStatus) {
          case CaseStatus.OPEN:
            return { color: 'primary' as const, label: 'Open' };
          case CaseStatus.IN_PROGRESS:
            return { color: 'info' as const, label: 'In Progress' };
          case CaseStatus.PENDING:
            return { color: 'warning' as const, label: 'Pending' };
          case CaseStatus.RESOLVED:
            return { color: 'success' as const, label: 'Resolved' };
          case CaseStatus.CLOSED:
            return { color: 'default' as const, label: 'Closed' };
          default:
            return { color: 'default' as const, label: status };
        }

      case 'priority':
        switch (status as Priority) {
          case Priority.LOW:
            return { color: 'success' as const, label: 'Low' };
          case Priority.MEDIUM:
            return { color: 'warning' as const, label: 'Medium' };
          case Priority.HIGH:
            return { color: 'error' as const, label: 'High' };
          case Priority.CRITICAL:
            return { color: 'error' as const, label: 'Critical', variant: 'filled' as const };
          default:
            return { color: 'default' as const, label: status };
        }

      case 'risk':
        switch (status as RiskLevel) {
          case RiskLevel.LOW:
            return { color: 'success' as const, label: 'Low Risk' };
          case RiskLevel.MODERATE:
            return { color: 'warning' as const, label: 'Moderate Risk' };
          case RiskLevel.HIGH:
            return { color: 'error' as const, label: 'High Risk' };
          case RiskLevel.IMMINENT:
            return { color: 'error' as const, label: 'Imminent Risk', variant: 'filled' as const };
          default:
            return { color: 'default' as const, label: status };
        }

      default:
        return { color: 'default' as const, label: status };
    }
  };

  const config = getStatusConfig();

  return (
    <Chip
      label={config.label}
      color={config.color}
      variant={config.variant || 'outlined'}
      size="small"
    />
  );
};

export default StatusChip;
