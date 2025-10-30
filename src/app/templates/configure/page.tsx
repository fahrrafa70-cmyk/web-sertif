"use client";

/**
 * Template Layout Configuration Page
 * Simplified interface for configuring template layout (drag-drop, fonts, positions)
 * Does NOT generate certificates - only saves layout configuration to database
 */

import { Suspense } from "react";

function ConfigureLayoutContent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Configure Template Layout
        </h1>
        <p className="text-gray-600 mb-8">
          Set up text positions, fonts, and styling for this template. 
          This configuration will be used for Quick Generate.
        </p>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <p className="text-gray-500">
            🚧 Configure page is under construction...
          </p>
          <p className="text-sm text-gray-400 mt-2">
            This page will contain:
            <br />• Drag & drop interface for text layers
            <br />• Font customization (size, weight, family, color)
            <br />• Position adjustment with snap-to-grid
            <br />• Save button to persist layout to database
            <br />• Preview with dummy data
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ConfigureLayoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading configuration...</p>
        </div>
      </div>
    }>
      <ConfigureLayoutContent />
    </Suspense>
  );
}
