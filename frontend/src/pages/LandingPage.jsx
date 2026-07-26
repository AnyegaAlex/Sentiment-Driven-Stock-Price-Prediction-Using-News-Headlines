// src/pages/LandingPage.jsx
import React from 'react';
import Navbar from '../components/shared/Navbar';
import Footer from '../components/shared/Footer';

// Landing components
import Hero from '../components/landing/Hero';
import Metrics from '../components/landing/Metrics';
import HowItWorks from '../components/landing/HowItWorks';
import TechnicalBreakdown from '../components/landing/TechnicalBreakdown';
import APIDemo from '../components/landing/APIDemo';
import Infrastructure from '../components/landing/Infrastructure';
import Documentation from '../components/landing/Documentation';
import OpenSource from '../components/landing/OpenSource';
import CTASection from '../components/landing/CTASection';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-black">
      <Navbar variant="public" />
      <Hero />
      <Metrics />
      <HowItWorks />
      <TechnicalBreakdown />
      <APIDemo />
      <Infrastructure />
      <Documentation />
      <OpenSource />
      <CTASection />
      <Footer />
    </div>
  );
};

export default LandingPage;