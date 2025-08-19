'use client';

import { motion } from 'framer-motion';

export default function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800 py-12">
      <motion.div 
        className="max-w-7xl mx-auto px-4 text-center"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
      >
        <div className="mb-4">
          <h3 className="text-xl font-bold mb-2">VERDISLE</h3>
          <p className="text-gray-400 text-sm">Islands of Heat, Cities of Change</p>
        </div>
        <div className="border-t border-gray-700 pt-4" >
          <p className="text-gray-500 text-sm">© 2025 VERDISLE Project </p>
        </div>
      </motion.div>
    </footer>
  );
}
