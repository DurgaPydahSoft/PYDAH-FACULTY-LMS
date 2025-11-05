import React, { useEffect, useState, useRef } from 'react';

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
  const [circles, setCircles] = useState([]);
  const animationRef = useRef();

  // Initialize circles with positions and velocities
  useEffect(() => {
    const themeColors = [
      'bg-primary/30', 'bg-primary/20', 'bg-primary/30',
      'bg-secondary/30', 'bg-primary/30', 'bg-primary-40',
      'border-primary/20', 'border-primary/30', 'border-secondary/40'
    ];

    const initialCircles = Array.from({ length: circleCount }, (_, index) => {
      const size = Math.random() * 120 ; // Random size between 40-160px
      const left = Math.random() * 100; // Random position 0-100%
      const top = Math.random() * 100; // Random position 0-100%
      const bgColor = themeColors[Math.floor(Math.random() * themeColors.length)];
      const borderColor = themeColors[Math.floor(Math.random() * themeColors.length)];

      return {
        id: index,
        size,
        left,
        top,
        velocityX: (Math.random() - 0.5) * 0.5, // Random velocity -0.25 to 0.25
        velocityY: (Math.random() - 0.5) * 0.5, // Random velocity -0.25 to 0.25
        bgColor,
        borderColor,
      };
    });

    setCircles(initialCircles);
  }, [circleCount]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      setCircles(prevCircles => {
        return prevCircles.map(circle => {
          let newLeft = circle.left + circle.velocityX;
          let newTop = circle.top + circle.velocityY;
          let newVelocityX = circle.velocityX;
          let newVelocityY = circle.velocityY;

          // Bounce off walls
          if (newLeft <= 0 || newLeft >= 100) {
            newVelocityX = -newVelocityX;
            newLeft = Math.max(0, Math.min(100, newLeft));
          }
          if (newTop <= 0 || newTop >= 100) {
            newVelocityY = -newVelocityY;
            newTop = Math.max(0, Math.min(100, newTop));
          }

          return {
            ...circle,
            left: newLeft,
            top: newTop,
            velocityX: newVelocityX,
            velocityY: newVelocityY,
          };
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

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
