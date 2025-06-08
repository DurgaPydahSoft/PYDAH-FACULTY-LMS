import { useState, useEffect } from "react";

const PullToRefresh = ({ onRefresh }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullHeight, setPullHeight] = useState(0);
  let startY = 0;

  useEffect(() => {
    const handleTouchStart = (e) => {
      if (window.scrollY === 0) { // Only allow pull-down when at the top
        startY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      if (window.scrollY === 0) { // Only if user is at the top
        const currentY = e.touches[0].clientY;
        const diff = currentY - startY;

        if (diff > 40) { // Minimum pull threshold
          setPullHeight(Math.min(diff, 100)); // Limit height
        }
      }
    };

    const handleTouchEnd = () => {
      if (pullHeight > 50) { // If pulled enough, refresh
        setIsRefreshing(true);
        setPullHeight(50);

        setTimeout(() => {
          onRefresh(); // Call the refresh function
          setIsRefreshing(false);
          setPullHeight(0);
        }, 1500); // Simulated refresh time
      } else {
        setPullHeight(0); // Reset if not enough pull
      }
    };

    document.addEventListener("touchstart", handleTouchStart);
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pullHeight, onRefresh]);

  return (
    <div className="relative">
      {/* Pull-to-refresh animation area */}
      <div
        className={`flex justify-center items-center transition-all duration-300 ${
          pullHeight > 0 ? "opacity-100" : "opacity-0"
        }`}
        style={{ height: `${pullHeight}px` }}
      >
        {isRefreshing ? (
          <div className="animate-spin h-6 w-6 border-4 border-primary rounded-full"></div>
        ) : (
          <span className="text-gray-500">⬇ Pull to Refresh</span>
        )}
      </div>
    </div>
  );
};


export default PullToRefresh;