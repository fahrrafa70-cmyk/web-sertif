"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Settings, Type, Palette, Zap } from "lucide-react";

interface SelectedStyle {
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight: string;
  x?: number;
  y?: number;
}

interface GlobalFontSettingsProps {
  selectedLayerId: string | null;
  selectedStyle: SelectedStyle | null;
  onChange: (
    styleProperty: "fontSize" | "color" | "fontFamily" | "fontWeight" | "x" | "y",
    value: number | string,
  ) => void;
  // Optional: only used for date layers
  dateFormat?: string;
  onDateFormatChange?: (format: string) => void;
}

export default function GlobalFontSettings({
  selectedLayerId,
  selectedStyle,
  onChange,
  dateFormat,
  onDateFormatChange,
}: GlobalFontSettingsProps) {
  const [fontSizeInput, setFontSizeInput] = useState<string>("");
  const [xInput, setXInput] = useState<string>("");
  const [yInput, setYInput] = useState<string>("");
  
  useEffect(() => {
    setFontSizeInput(
      selectedStyle?.fontSize !== undefined && selectedStyle?.fontSize !== null
        ? String(selectedStyle.fontSize)
        : ""
    );
  }, [selectedLayerId, selectedStyle?.fontSize]);

  useEffect(() => {
    setXInput(
      selectedStyle?.x !== undefined && selectedStyle?.x !== null
        ? String(selectedStyle.x)
        : "0"
    );
  }, [selectedLayerId, selectedStyle?.x]);

  useEffect(() => {
    setYInput(
      selectedStyle?.y !== undefined && selectedStyle?.y !== null
        ? String(selectedStyle.y)
        : "0"
    );
  }, [selectedLayerId, selectedStyle?.y]);
  const fontFamilies = [
    "Arial",
    "Helvetica",
    "Times New Roman",
    "Georgia",
    "Verdana",
    "Tahoma",
    "Trebuchet MS",
    "Impact",
    "Comic Sans MS",
    "Courier New",
    "Palatino",
    "Garamond",
    "Bookman",
    "Avant Garde",
    "Helvetica Neue",
    "Roboto",
    "Open Sans",
    "Lato",
    "Montserrat",
    "Poppins",
  ];

  const fontWeights = [
    { value: "normal", label: "Normal" },
    { value: "bold", label: "Bold" },
    { value: "100", label: "Thin" },
    { value: "200", label: "Extra Light" },
    { value: "300", label: "Light" },
    { value: "400", label: "Regular" },
    { value: "500", label: "Medium" },
    { value: "600", label: "Semi Bold" },
    { value: "700", label: "Bold" },
    { value: "800", label: "Extra Bold" },
    { value: "900", label: "Black" },
  ];

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4 mb-6 w-full overflow-x-hidden">
      <div className="flex items-center justify-start mb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Font Settings
          </h3>
        </div>
      </div>

      <div className="space-y-4">
        {!selectedLayerId && (
          <p className="text-sm text-gray-600">Pilih satu elemen teks pada kanvas untuk mengubah gaya.</p>
        )}
        {/* Two-column layout restored without sideways scroll */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {/* Font Size */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Type className="w-4 h-4" />
              Font Size
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="8"
                max="100"
                value={fontSizeInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setFontSizeInput(v);
                  if (v !== "" && !isNaN(Number(v))) {
                    const n = Math.max(8, Math.min(100, Number(v)));
                    onChange("fontSize", n);
                  }
                }}
                onBlur={() => {
                  if (fontSizeInput === "") {
                    const fallback = 16;
                    setFontSizeInput(String(fallback));
                    onChange("fontSize", fallback);
                  } else if (!isNaN(Number(fontSizeInput))) {
                    const n = Math.max(8, Math.min(100, Number(fontSizeInput)));
                    setFontSizeInput(String(n));
                    onChange("fontSize", n);
                  }
                }}
                className="w-20"
                disabled={!selectedLayerId}
              />
              <span className="text-xs text-gray-500">px</span>
            </div>
          </div>

          {/* Font Family */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Type className="w-4 h-4" />
              Font Family
            </label>
            <select
              value={selectedStyle?.fontFamily ?? "Arial"}
              onChange={(e) => onChange("fontFamily", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!selectedLayerId}
            >
              {fontFamilies.map((font) => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>
          </div>

          {/* Font Weight */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Zap className="w-4 h-4" />
              Font Weight
            </label>
            <select
              value={selectedStyle?.fontWeight ?? "normal"}
              onChange={(e) => onChange("fontWeight", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!selectedLayerId}
            >
              {fontWeights.map((weight) => (
                <option key={weight.value} value={weight.value}>
                  {weight.label}
                </option>
              ))}
            </select>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Palette className="w-4 h-4" />
              Text Color
            </label>
            <div className="flex items-center gap-2 w-full">
              <input
                type="color"
                value={selectedStyle?.color ?? "#000000"}
                onChange={(e) => onChange("color", e.target.value)}
                className="w-12 h-10 border border-gray-300 rounded-md cursor-pointer"
                disabled={!selectedLayerId}
              />
              <Input
                value={selectedStyle?.color ?? "#000000"}
                onChange={(e) => onChange("color", e.target.value)}
                placeholder="#000000"
                className="flex-1 min-w-[140px]"
                disabled={!selectedLayerId}
              />
            </div>
          </div>

          {/* Date Format (only for issue_date / expired_date) */}
          {(selectedLayerId === "issue_date" || selectedLayerId === "expired_date") && (
            <div className="space-y-2 md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                Date Format
              </label>
              <select
                value={dateFormat ?? "yyyy-mm-dd"}
                onChange={(e) => onDateFormatChange && onDateFormatChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!selectedLayerId}
              >
                <option value="dd-mm-yyyy">20-10-2026 (dd-mm-yyyy)</option>
                <option value="mm-dd-yyyy">10-20-2026 (mm-dd-yyyy)</option>
                <option value="yyyy-mm-dd">2026-10-20 (yyyy-mm-dd)</option>
                <option value="dd-mmm-yyyy">20 Oct 2026 (dd mmm yyy)</option>
                <option value="dd-mmmm-yyyy">20 October 2026 (dd mmmm yyyy)</option>
                <option value="mmm-dd-yyyy">Oct 21, 2026 (mmm dd, yyyy)</option>
                <option value="mmmm-dd-yyyy">October 21, 2026 (mmmm dd, yyyy)</option>
                <option value="dd/mm/yyyy">20/10/2026 (dd/mm/yyyy)</option>
                <option value="mm/dd/yyyy">10/20/2026 (mm/dd/yyyy)</option>
                <option value="yyyy/mm/dd">2026/10/20 (yyyy/mm/dd)</option>
              </select>
            </div>
          )}
        </div>

        {/* Position X & Y - Separate section below */}
        <div className="pt-4 border-t border-blue-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Position</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Position X */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Type className="w-4 h-4" />
                Position X
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={xInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    setXInput(v);
                    if (v !== "" && !isNaN(Number(v))) {
                      onChange("x", Number(v));
                    }
                  }}
                  onBlur={() => {
                    if (xInput === "" || isNaN(Number(xInput))) {
                      setXInput("0");
                      onChange("x", 0);
                    }
                  }}
                  className="w-24"
                  disabled={!selectedLayerId}
                />
                <span className="text-xs text-gray-500">px</span>
              </div>
            </div>

            {/* Position Y */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Type className="w-4 h-4" />
                Position Y
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={yInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    setYInput(v);
                    if (v !== "" && !isNaN(Number(v))) {
                      onChange("y", Number(v));
                    }
                  }}
                  onBlur={() => {
                    if (yInput === "" || isNaN(Number(yInput))) {
                      setYInput("0");
                      onChange("y", 0);
                    }
                  }}
                  className="w-24"
                  disabled={!selectedLayerId}
                />
                <span className="text-xs text-gray-500">px</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
