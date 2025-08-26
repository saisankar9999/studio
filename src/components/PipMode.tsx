"use client";

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { PictureInPicture, X } from 'lucide-react';

// A placeholder for PIP functionality.
// In a real scenario, this would interact with a browser's Picture-in-Picture API,
// likely with a video element to anchor the PIP window.
export default function PipMode({ children }: { children: React.ReactNode }) {
  const [isPipActive, setIsPipActive] = useState(false);

  const togglePip = () => {
    // This is a mock implementation.
    // Real PIP requires a <video> element and is more complex.
    setIsPipActive(prev => !prev);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.ctrlKey && event.key.toLowerCase() === 'p') {
            event.preventDefault();
            togglePip();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isPipActive) {
    return null; // Or a button to activate it, which is handled in the parent component
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 h-96 bg-background border rounded-lg shadow-2xl flex flex-col">
      <div className="flex justify-between items-center p-2 border-b">
        <h3 className="font-semibold text-sm">Co-pilot (PiP)</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={togglePip}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-2">
        {children}
      </div>
    </div>
  );
}
