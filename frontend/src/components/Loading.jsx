import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const Loading = ({ message = "Processing your request...", size = "w-64 h-64 lg:w-96 lg:h-96", bg = "bg-white" }) => (
  <div className={`flex justify-center items-center h-screen ${bg}`}>
    <div className="flex flex-col items-center">
      <div className={`${size} flex items-center justify-center`}>
        <DotLottieReact
          src="https://lottie.host/375396c6-7095-4dd7-bc3c-9fa7f7c185f7/hh3AyU5RMm.lottie"
          loop
          autoplay
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      <p className="mt-4 text-base sm:text-lg font-semibold text-gray-700">
        {message}
      </p>
    </div>
  </div>
);

export default Loading;