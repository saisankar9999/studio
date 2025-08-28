
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, User, Loader2, GripVertical, X } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface StealthModeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  isSessionActive: boolean;
  isLoading: boolean;
  transcription: string;
  conversationHistory: ChatMessage[];
}

export const StealthModeOverlay = ({
  isOpen,
  onClose,
  isSessionActive,
  isLoading,
  transcription,
  conversationHistory,
}: StealthModeOverlayProps) => {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationHistory, transcription]);


  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag from the header/drag-handle
    if ((e.target as HTMLElement).closest('[data-drag-handle]')) {
      setIsDragging(true);
      dragStartPos.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && overlayRef.current) {
      setPosition({
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);
  
  if (!isOpen) {
      return null;
  }

  return (
    <div
      ref={overlayRef}
      className="fixed z-50 w-full max-w-md bg-background/80 backdrop-blur-lg rounded-lg shadow-2xl border border-border"
      style={{ top: position.y, left: position.x, userSelect: isDragging ? 'none' : 'auto' }}
      onMouseDown={handleMouseDown}
    >
      <div 
        data-drag-handle 
        className="flex items-center justify-between p-2 border-b cursor-move"
      >
        <div className="flex items-center gap-2">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-sm">
                {isSessionActive ? "Listening..." : "Stealth Co-pilot"}
            </h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
          <span className="sr-only">Close Overlay</span>
        </Button>
      </div>
      <div ref={scrollRef} className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
        {conversationHistory.length === 0 && !transcription && (
          <p className="text-muted-foreground italic text-sm text-center py-4">
            {isSessionActive ? "Listening for question..." : "Session is not active."}
          </p>
        )}
        {conversationHistory.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 text-sm ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'model' && <Bot className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />}
            <div className={`rounded-lg p-2 max-w-[85%] prose prose-sm dark:prose-invert ${msg.role === 'model' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}
                 dangerouslySetInnerHTML={{ __html: msg.content }}
            />
            {msg.role === 'user' && <User className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />}
          </div>
        ))}
        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-accent" />}
        {transcription && (
           <div className="flex items-start gap-3 justify-end text-sm">
              <div className="rounded-lg p-2 max-w-[85%] bg-primary/80 text-primary-foreground italic">
                {transcription}
              </div>
              <User className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
           </div>
        )}
      </div>
    </div>
  );
};
