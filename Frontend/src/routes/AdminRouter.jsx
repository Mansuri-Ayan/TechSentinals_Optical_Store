import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Expenses from '../pages/admin/Expenses';

const AdminRouter = () => {
  return (
    <Routes>
      {/* Route is now /admin/store/:store_id/expenses */}
      <Route path="store/:store_id/expenses" element={<Expenses />} />
    </Routes>
  );
};

export default AdminRouter;
