'use client';

import { useState, useEffect, ReactNode } from 'react';

interface NoSSRProps {
  children: ReactNode;
}

/**
 * 只在客戶端渲染 children，SSR 階段回傳 null
 */
export default function NoSSR({ children }: NoSSRProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // SSR 階段不 render 任何東西
  if (!mounted) return null;

  return <>{children}</>;
}