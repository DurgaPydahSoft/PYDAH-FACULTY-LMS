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
  const lastTimeRef = useRef(Date.now());
  const blastPhaseRef = useRef(true);
  const blastTimerRef = useRef(0);

  // Initialize circles with positions and velocities
  useEffect(() => {
    // Using original theme colors: primary (#3D6734) and secondary (#F1F1F1)
    const themeColors = [
      { primary: 'rgba(61, 103, 52, 0.3)', secondary: 'rgba(61, 103, 52, 0.15)', highlight: 'rgba(255, 255, 255, 0.4)' }, // primary/30
      { primary: 'rgba(61, 103, 52, 0.25)', secondary: 'rgba(61, 103, 52, 0.1)', highlight: 'rgba(255, 255, 255, 0.35)' }, // primary/20
      { primary: 'rgba(61, 103, 52, 0.3)', secondary: 'rgba(61, 103, 52, 0.15)', highlight: 'rgba(255, 255, 255, 0.4)' }, // primary/30
      { primary: 'rgba(241, 241, 241, 0.3)', secondary: 'rgba(241, 241, 241, 0.15)', highlight: 'rgba(255, 255, 255, 0.5)' }, // secondary/30
      { primary: 'rgba(61, 103, 52, 0.2)', secondary: 'rgba(61, 103, 52, 0.1)', highlight: 'rgba(255, 255, 255, 0.3)' }, // primary/20 variant
    ];

    const initialCircles = Array.from({ length: circleCount }, (_, index) => {
      const size = 40 + Math.random() * 120; // Random size between 40-160px
      const colorScheme = themeColors[Math.floor(Math.random() * themeColors.length)];
      
      // Start all bubbles at center (50%, 50%)
      const left = 50;
      const top = 50;
      
      // Create blast effect: each bubble radiates outward in different directions
      const angle = (Math.PI * 2 * index) / circleCount + (Math.random() - 0.5) * 0.3; // Distribute evenly with slight randomness
      const blastVelocity = 0.8 + Math.random() * 0.6; // Strong initial velocity for blast effect
      
      const targetVelocity = 0.15 + Math.random() * 0.2; // Normal velocity range (stored once)
      
      return {
        id: index,
        size,
        left,
        top,
        velocityX: Math.cos(angle) * blastVelocity, // Initial blast velocity
        velocityY: Math.sin(angle) * blastVelocity,
        targetVelocity, // Store target velocity for smooth transition
        rotation: Math.random() * 360, // Initial rotation
        rotationSpeed: (Math.random() - 0.5) * 0.5, // Rotation speed
        colorScheme,
        opacity: 0.6 + Math.random() * 0.4, // Varied opacity for depth
        blur: Math.random() > 0.7 ? 1 : 0, // Some bubbles with slight blur for depth
      };
    });

    setCircles(initialCircles);
    blastPhaseRef.current = true;
    blastTimerRef.current = 0;
  }, [circleCount]);

  // Animation loop with smoother easing and blast effect
  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      const deltaTime = Math.min((now - lastTimeRef.current) / 16, 2); // Cap delta time for smoothness
      lastTimeRef.current = now;

      // Track blast phase duration (about 1-2 seconds)
      if (blastPhaseRef.current) {
        blastTimerRef.current += deltaTime * 16; // Approximate milliseconds
        if (blastTimerRef.current > 1500) { // After 1.5 seconds, transition to normal movement
          blastPhaseRef.current = false;
        }
      }

      setCircles(prevCircles => {
        return prevCircles.map(circle => {
          let newLeft = circle.left + circle.velocityX * deltaTime;
          let newTop = circle.top + circle.velocityY * deltaTime;
          let newVelocityX = circle.velocityX;
          let newVelocityY = circle.velocityY;
          let newRotation = circle.rotation + circle.rotationSpeed * deltaTime;

          // During blast phase, gradually slow down to normal speed
          if (blastPhaseRef.current) {
            // Get current direction from current velocity
            const currentAngle = Math.atan2(circle.velocityY, circle.velocityX);
            
            // Ease out from blast velocity to normal velocity
            const currentSpeed = Math.sqrt(circle.velocityX ** 2 + circle.velocityY ** 2);
            const targetSpeed = circle.targetVelocity || 0.2; // Use stored target velocity
            const easedSpeed = currentSpeed + (targetSpeed - currentSpeed) * 0.05; // Smooth transition
            
            // Maintain direction but slow down
            newVelocityX = Math.cos(currentAngle) * easedSpeed;
            newVelocityY = Math.sin(currentAngle) * easedSpeed;
          } else {
            // Normal movement phase - apply velocity dampening on bounce
            if (newLeft <= 0 || newLeft >= 100) {
              newVelocityX = -newVelocityX * 0.95; // Slight dampening
              newLeft = Math.max(0, Math.min(100, newLeft));
            }
            if (newTop <= 0 || newTop >= 100) {
              newVelocityY = -newVelocityY * 0.95; // Slight dampening
              newTop = Math.max(0, Math.min(100, newTop));
            }
          }

          // Keep rotation in 0-360 range
          newRotation = newRotation % 360;

          return {
            ...circle,
            left: newLeft,
            top: newTop,
            velocityX: newVelocityX,
            velocityY: newVelocityY,
            rotation: newRotation,
          };
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = Date.now();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Generate 3D gradient background
  const get3DGradient = (colorScheme, rotation) => {
    const angle = rotation * Math.PI / 180;
    const highlightX = 50 + 30 * Math.cos(angle);
    const highlightY = 50 + 30 * Math.sin(angle);
    
    return `radial-gradient(circle at ${highlightX}% ${highlightY}%, 
      ${colorScheme.highlight} 0%, 
      ${colorScheme.primary} 30%, 
      ${colorScheme.secondary} 60%, 
      ${colorScheme.primary} 100%)`;
  };

  return (
    <div
      data-slot="circle-background"
      className={cn(
        "relative w-full h-full overflow-visible",
        className
      )}
      {...props}
    >
      <div className="absolute top-0 left-0 w-full h-full overflow-visible ">
        {circles.map((circle) => {
          const gradient = get3DGradient(circle.colorScheme, circle.rotation);
          const shadowSize = circle.size * 0.15;
          
          return (
            <div
              key={circle.id}
              className="absolute rounded-full"
              style={{
                width: `${circle.size}px`,
                height: `${circle.size}px`,
                left: `${circle.left}%`,
                top: `${circle.top}%`,
                transform: `translate(-50%, -50%) rotateZ(${circle.rotation}deg)`,
                background: gradient,
                opacity: circle.opacity,
                filter: circle.blur ? `blur(${circle.blur}px)` : 'none',
                boxShadow: `
                  inset ${circle.size * 0.15}px ${circle.size * 0.1}px ${circle.size * 0.3}px ${circle.colorScheme.highlight},
                  inset -${circle.size * 0.15}px -${circle.size * 0.1}px ${circle.size * 0.3}px ${circle.colorScheme.secondary},
                  ${shadowSize}px ${shadowSize}px ${shadowSize * 2}px rgba(0, 0, 0, 0.1),
                  0 0 ${circle.size * 0.2}px ${circle.colorScheme.primary}
                `,
                transition: 'filter 0.3s ease-out',
                willChange: 'transform, opacity',
              }}
            />
          );
        })}
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
