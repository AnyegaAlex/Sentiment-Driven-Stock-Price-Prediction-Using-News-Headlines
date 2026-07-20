import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../Header';
import Footer from '../Footer';
import Breadcrumbs from '../Breadcrumbs';

export const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main
        className="flex-grow max-w-[1450px] w-full mx-auto px-5 md:px-8"
        style={{
          paddingTop: 'calc(var(--header-height, 80px) + 1rem)',
          paddingBottom: '2rem',
        }}
      >
        <Breadcrumbs />
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};