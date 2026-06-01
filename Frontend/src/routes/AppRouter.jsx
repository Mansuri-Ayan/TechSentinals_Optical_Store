import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from '../pages/auth/Login';

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Set login route */}
        <Route path="/login" element={<Login />} />
        {/* Additional routes will go here */}
      </Routes>
    </BrowserRouter>
  );
}
export default AppRouter;
