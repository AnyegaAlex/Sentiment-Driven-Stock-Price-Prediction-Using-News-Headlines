import React from 'react';
import Navbar from '../components/shared/Navbar';
import Hero from '../components/landing/Hero';
import TrustedEngineering from '../components/landing/TrustedEngineering';
import ProblemSection from '../components/landing/ProblemSection';
import HowItWorks from '../components/landing/HowItWorks';
import FeaturesGrid from '../components/landing/FeaturesGrid';
import BuiltForSection from '../components/landing/BuiltForSection';
import OpenSourceSection from '../components/landing/OpenSourceSection';
import AboutSection from '../components/landing/AboutSection';
import CTASection from '../components/landing/CTASection';
import Footer from '../components/shared/Footer';

const LandingPage = () => {
  return (
    <>
      <Navbar variant="public" />
      <Hero />
      <TrustedEngineering />
      <ProblemSection />
      <HowItWorks />
      <FeaturesGrid />
      <BuiltForSection />
      <OpenSourceSection />
      <AboutSection />
      <CTASection />
      <Footer />
    </>
  );
};

export default LandingPage;