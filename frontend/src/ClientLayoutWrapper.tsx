'use client';

import Header from '@/layout/Header';
import React from 'react';

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}
