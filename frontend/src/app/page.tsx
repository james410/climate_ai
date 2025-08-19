'use client';

import dynamic from 'next/dynamic';

  // const FloatingBackground = dynamic(
  //   () => import('@/ui/FloatingBackground'),
  //   { ssr: false }
  // );

const HeroSection = dynamic(() => import('@/sections/HeroSection'));
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
      {/* <FloatingBackground className="fixed inset-0 z-0 pointer-events-none" /> */}
      
      <main className="relative z-10 overflow-x-hidden scroll-smooth min-h-screen">
        <HeroSection />
        <MapSection />
        <DataSection />
        <EducationSection />
        <Footer />
      </main>
    </>
  );
}
