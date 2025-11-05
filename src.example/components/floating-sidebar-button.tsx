"use client";

import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";

interface FloatingSidebarButtonProps {
  onToggle: () => void;
  isOpen: boolean;
}

export default function FloatingSidebarButton({ onToggle, isOpen }: FloatingSidebarButtonProps) {
  return (
    <motion.button
      onClick={onToggle}
      className={`fixed bottom-8 left-6 z-40 w-12 h-12 rounded-full shadow-lg transition-all duration-300 ${
        isOpen 
          ? 'bg-gray-600 hover:bg-gray-700' 
          : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
      }`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
    >
      <div className="flex items-center justify-center">
        {isOpen ? (
          <X className="w-5 h-5 text-white transition-transform duration-300" />
        ) : (
          <Menu className="w-5 h-5 text-white transition-transform duration-300" />
        )}
      </div>
      
      {/* Tooltip */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        whileHover={{ opacity: 1, x: 0 }}
        className="absolute right-full mr-2 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none"
      >
        {isOpen ? 'Close Menu' : 'Open Menu'}
        <div className="absolute left-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-2 border-l-gray-900 border-t-2 border-t-transparent border-b-2 border-b-transparent"></div>
      </motion.div>
    </motion.button>
  );
}
