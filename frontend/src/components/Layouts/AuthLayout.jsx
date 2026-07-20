import React from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <main className="flex-grow flex items-center justify-center px-4">
        <Outlet />
      </main>
    </div>
  );
};