import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';

import Layout from './components/layout/Layout';
import OptimizedDashboard from './pages/OptimizedDashboard';
import OptimizedCaseList from './pages/OptimizedCaseList';
import CaseDetail from './pages/CaseDetail';
import CreateCase from './pages/CreateCase';
import EditCase from './pages/EditCase';
import NotFound from './pages/NotFound';

function App() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Layout>
        <Routes>
          <Route path="/" element={<OptimizedDashboard />} />
          <Route path="/cases" element={<OptimizedCaseList />} />
          <Route path="/cases/new" element={<CreateCase />} />
          <Route path="/cases/:id" element={<CaseDetail />} />
          <Route path="/cases/:id/edit" element={<EditCase />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </Box>
  );
}

export default App;
