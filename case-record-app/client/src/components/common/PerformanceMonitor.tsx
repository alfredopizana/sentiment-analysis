import React, { useEffect, useRef } from 'react';
import { Box, Typography, Chip } from '@mui/material';

interface PerformanceMonitorProps {
  componentName: string;
  enabled?: boolean;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  componentName, 
  enabled = process.env.NODE_ENV === 'development' 
}) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  const mountTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;

    if (enabled) {
      console.log(`[${componentName}] Render #${renderCount.current}, Time since last: ${timeSinceLastRender}ms`);
    }
  });

  useEffect(() => {
    mountTime.current = Date.now();
    if (enabled) {
      console.log(`[${componentName}] Component mounted`);
    }

    return () => {
      if (enabled) {
        const totalTime = Date.now() - mountTime.current;
        console.log(`[${componentName}] Component unmounted after ${totalTime}ms, Total renders: ${renderCount.current}`);
      }
    };
  }, [componentName, enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <Box 
      sx={{ 
        position: 'fixed', 
        top: 10, 
        right: 10, 
        zIndex: 9999, 
        backgroundColor: 'rgba(0,0,0,0.8)', 
        color: 'white', 
        p: 1, 
        borderRadius: 1,
        fontSize: '0.75rem'
      }}
    >
      <Typography variant="caption" display="block">
        {componentName}
      </Typography>
      <Chip 
        label={`Renders: ${renderCount.current}`} 
        size="small" 
        color={renderCount.current > 10 ? 'error' : renderCount.current > 5 ? 'warning' : 'success'}
      />
    </Box>
  );
};

export default PerformanceMonitor;
