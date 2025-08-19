'use client';
import { useEffect, useState } from 'react';

export default function TypeText({ text, delay = 0 }:{
  text: string; delay?: number;
}) {
  const [visible, setVisible] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      let i = 0;
      const id = setInterval(() => {
        setVisible(text.slice(0, ++i));
        if (i === text.length) clearInterval(id);
      }, 30);
    }, delay);
    return () => clearTimeout(timer);
  }, [text, delay]);

  return (
    <p className="font-mono whitespace-pre-wrap">
      {visible}
      <span className="animate-pulse">|</span>
    </p>
  );
}
