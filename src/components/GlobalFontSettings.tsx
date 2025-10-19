"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Settings, Type, Palette, Zap } from "lucide-react";

interface SelectedStyle {
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight: string;
}

interface GlobalFontSettingsProps {
  selectedLayerId: string | null;
  selectedStyle: SelectedStyle | null;
  onChange: (
    styleProperty: "fontSize" | "color" | "fontFamily" | "fontWeight",
    value: number | string,
  ) => void;
}

export default function GlobalFontSettings({
  selectedLayerId,
  selectedStyle,
  onChange,
}: GlobalFontSettingsProps) {
  const [fontSizeInput, setFontSizeInput] = useState<string>("");
  useEffect(() => {
    setFontSizeInput(
      selectedStyle?.fontSize !== undefined && selectedStyle?.fontSize !== null
        ? String(selectedStyle.fontSize)
        : ""
    );
  }, [selectedLayerId, selectedStyle?.fontSize]);
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
            Global Font Settings
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
                max="72"
                value={fontSizeInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setFontSizeInput(v);
                  if (v !== "" && !isNaN(Number(v))) {
                    const n = Math.max(8, Math.min(72, Number(v)));
                    onChange("fontSize", n);
                  }
                }}
                onBlur={() => {
                  if (fontSizeInput === "") {
                    const fallback = 16;
                    setFontSizeInput(String(fallback));
                    onChange("fontSize", fallback);
                  } else if (!isNaN(Number(fontSizeInput))) {
                    const n = Math.max(8, Math.min(72, Number(fontSizeInput)));
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
        </div>
      </div>
    </div>
  );
}
