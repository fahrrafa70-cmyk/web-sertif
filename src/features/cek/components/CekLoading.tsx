"use client";

export function CekLoading() {
  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center p-4" style={{ minHeight: '100vh', width: '100%', backgroundColor: '#ffffff' }}>
      <div className="text-center">
        <svg
          className="animate-spin mx-auto mb-4"
          width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            className="stroke-blue-500 dark:stroke-blue-400"
            cx="32" cy="32" r="28" strokeWidth="4" strokeLinecap="round"
            strokeDasharray="175.93" strokeDashoffset="43.98"
          />
        </svg>
        <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">Loading certificate...</p>
      </div>
    </div>
  );
}
