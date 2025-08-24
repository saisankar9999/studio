'use client';

import React, { useState, useRef, useEffect, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, X } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface StealthModeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  isLoading: boolean;
  children: ReactNode;
}

export function StealthModeOverlay({
  isOpen,
  onClose,
  title,
  isLoading,
  children,
}: StealthModeOverlayProps) {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag if the grip handle is clicked
    if ((e.target as HTMLElement).closest('[data-drag-handle]')) {
      setIsDragging(true);
      dragStartPos.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
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
  }, [isDragging]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      <Card className="w-[400px] max-w-lg shadow-2xl bg-background/80 backdrop-blur-sm border-primary/20">
        <CardHeader
          className="flex flex-row items-center justify-between p-2 pl-4"
          onMouseDown={handleMouseDown}
        >
          <div
            className="flex items-center gap-2 cursor-grab"
            data-drag-handle
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-4 pt-0 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-24">
              <LoadingSpinner className="h-8 w-8" />
            </div>
          ) : (
            children
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    