// src/pages/LandingPage.jsx
import React from 'react';
import Navbar from '../components/shared/Navbar';
import Footer from '../components/shared/Footer';

// KEPT components
import Hero from '../components/landing/Hero';
import Metrics from '../components/landing/Metrics';
import HowItWorks from '../components/landing/HowItWorks';
import TechnicalBreakdown from '../components/landing/TechnicalBreakdown';
import APIDemo from '../components/landing/APIDemo';
import Infrastructure from '../components/landing/Infrastructure';
import Documentation from '../components/landing/Documentation';
import OpenSource from '../components/landing/OpenSource';
import CTASection from '../components/landing/CTASection';

// DELETED components – removed
// TrustedEngineering
// ProblemSection
// BuiltForSection
// OpenSourceSection (replaced by OpenSource)
// AboutSection
// FeaturesGrid (replaced by TechnicalBreakdown)
// DashboardPreview
// PricingTable

const LandingPage = () => {
  return (
    <>
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
    </>
  );
};

export default LandingPage;