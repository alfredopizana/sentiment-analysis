import React from 'react';
import { Chip, Tooltip, Box } from '@mui/material';
import { SmartToy, Edit, Person } from '@mui/icons-material';
import { UpdateSource, FieldUpdate } from '../../types';

interface FieldUpdateIndicatorProps {
  fieldPath: string;
  fieldUpdates: FieldUpdate[];
  showTooltip?: boolean;
}

export const FieldUpdateIndicator: React.FC<FieldUpdateIndicatorProps> = ({
  fieldPath,
  fieldUpdates,
  showTooltip = true,
}) => {
  // Find the latest update for this field
  const latestUpdate = fieldUpdates
    .filter(update => update.fieldPath === fieldPath)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  if (!latestUpdate) {
    return null;
  }

  const getIndicatorProps = () => {
    switch (latestUpdate.updatedBy) {
      case UpdateSource.AI_SENTIMENT_ANALYSIS:
        return {
          label: latestUpdate.userOverride ? 'Overwritten' : 'AI Updated',
          color: latestUpdate.userOverride ? 'warning' as const : 'info' as const,
          icon: latestUpdate.userOverride ? <Edit /> : <SmartToy />,
          tooltip: latestUpdate.userOverride 
            ? `Originally updated by AI (confidence: ${Math.round((latestUpdate.confidence || 0) * 100)}%), then manually overwritten`
            : `Updated by AI sentiment analysis (confidence: ${Math.round((latestUpdate.confidence || 0) * 100)}%)`
        };
      
      case UpdateSource.USER:
        const hasAiUpdate = fieldUpdates.some(
          update => update.fieldPath === fieldPath && update.updatedBy === UpdateSource.AI_SENTIMENT_ANALYSIS
        );
        
        return {
          label: hasAiUpdate ? 'Overwritten' : 'User Input',
          color: hasAiUpdate ? 'warning' as const : 'default' as const,
          icon: <Person />,
          tooltip: hasAiUpdate 
            ? 'Manually overwritten after AI update'
            : 'Manually entered by user'
        };
      
      case UpdateSource.SYSTEM:
        return {
          label: 'System',
          color: 'secondary' as const,
          icon: <Person />,
          tooltip: 'Updated by system'
        };
      
      default:
        return null;
    }
  };

  const indicatorProps = getIndicatorProps();
  
  if (!indicatorProps) {
    return null;
  }

  const chip = (
    <Chip
      size="small"
      label={indicatorProps.label}
      color={indicatorProps.color}
      icon={indicatorProps.icon}
      sx={{
        height: 20,
        fontSize: '0.75rem',
        '& .MuiChip-icon': {
          fontSize: '0.875rem',
        },
      }}
    />
  );

  if (!showTooltip) {
    return chip;
  }

  return (
    <Tooltip title={indicatorProps.tooltip} arrow>
      <Box component="span">
        {chip}
      </Box>
    </Tooltip>
  );
};

export default FieldUpdateIndicator;
