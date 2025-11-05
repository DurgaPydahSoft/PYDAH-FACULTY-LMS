import React, { useEffect, useState, useMemo } from 'react';

// Utility function to combine class names
function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

function CircleBackground({
  className,
  children,
  circleCount = 15,
  ...props
}) {
  // Generate random circles with theme colors
  const circles = useMemo(() => {
    const themeColors = [
      'bg-primary/10', 'bg-primary/20', 'bg-primary/15',
      'bg-secondary/30', 'bg-secondary/20', 'bg-secondary/25',
      'border-primary/20', 'border-primary/30', 'border-secondary/40'
    ];

    return Array.from({ length: circleCount }, (_, index) => {
      const size = Math.random() * 120 + 40; // Random size between 40-160px
      const left = Math.random() * 120 - 10; // Random position -10% to 110% for full coverage
      const top = Math.random() * 120 - 10; // Random position -10% to 110% for full coverage
      const bgColor = themeColors[Math.floor(Math.random() * themeColors.length)];
      const borderColor = themeColors[Math.floor(Math.random() * themeColors.length)];

      return {
        id: index,
        size,
        left,
        top,
        bgColor,
        borderColor,
      };
    });
  }, [circleCount]);

  return (
    <div
      data-slot="circle-background"
      className={cn(
        "relative w-full h-full overflow-visible",
        className
      )}
      {...props}
    >
      <div className="absolute top-0 left-0 w-full h-full overflow-visible hidden md:block">
        {circles.map((circle) => (
          <div
            key={circle.id}
            className={cn(
              "absolute rounded-full border-2 shadow-md",
              circle.bgColor,
              circle.borderColor
            )}
            style={{
              width: `${circle.size}px`,
              height: `${circle.size}px`,
              left: `${circle.left}%`,
              top: `${circle.top}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </div>

      {/* Subtle overlay for depth */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.02), rgba(255,255,255,0))",
          mixBlendMode: "overlay",
        }}
      />

      {children}
    </div>
  );
}

export { CircleBackground };
