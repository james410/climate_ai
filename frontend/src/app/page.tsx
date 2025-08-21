'use client';

import dynamic from 'next/dynamic';
import Header from '@/layout/Header';
import { useRef } from 'react';

const HeroSection = dynamic(() => import('@/sections/HeroSection'));
const IntroSection = dynamic(() => import('@/sections/IntroSection'));
const DataSection = dynamic(() => import('@/sections/DataSection'));
const EducationSection = dynamic(() => import('@/sections/EducationSection'));
const Footer = dynamic(() => import('@/layout/Footer'));

const MapSection = dynamic(
  () => import('@/sections/MapSection'),
  { 
    ssr: false,
    loading: () => <div className="min-h-screen flex items-center justify-center">載入地圖中...</div>
  }
);

export default function Home() {
  return (
    <>
      <main className="relative z-20 scroll-smooth min-h-screen">
        <HeroSection />
        <IntroSection />
        <MapSection />
        <DataSection />
        <EducationSection />
        <Footer />
      </main>
    </>
  );
}
