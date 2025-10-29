/**
 * Score Font Settings Component
 * Allows customization of font sizes for different score elements
 * Extracted from src/app/templates/generate/page.tsx
 * Date: October 29, 2025
 */

"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScoreFontSetting } from "@/lib/storage/template-defaults";

interface ScoreFontSettingsProps {
  settings: {
    aspekTeknis: ScoreFontSetting;
    nilai: ScoreFontSetting;
    additionalInfo: ScoreFontSetting;
    date: ScoreFontSetting;
  };
  onChange: (settings: ScoreFontSettingsProps["settings"]) => void;
  className?: string;
}

/**
 * Component for managing score font settings
 * Provides controls for adjusting font sizes of score elements
 */
export function ScoreFontSettings({ settings, onChange, className }: ScoreFontSettingsProps) {
  const updateSetting = (
    key: keyof typeof settings,
    field: keyof ScoreFontSetting,
    value: string | number
  ) => {
    onChange({
      ...settings,
      [key]: {
        ...settings[key],
        [field]: value,
      },
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Score Font Settings</CardTitle>
        <CardDescription>
          Customize font sizes for different score elements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Aspek Teknis Font Size */}
        <div className="space-y-2">
          <Label htmlFor="aspek-teknis-size" className="text-sm font-medium">
            Aspek Teknis Font Size
          </Label>
          <Input
            id="aspek-teknis-size"
            type="number"
            min="8"
            max="48"
            value={settings.aspekTeknis.fontSize}
            onChange={(e) =>
              updateSetting("aspekTeknis", "fontSize", parseInt(e.target.value) || 14)
            }
            className="h-9"
          />
          <p className="text-xs text-gray-500">
            Font size for technical competency names
          </p>
        </div>

        {/* Nilai (Score Values) Font Size */}
        <div className="space-y-2">
          <Label htmlFor="nilai-size" className="text-sm font-medium">
            Nilai Font Size
          </Label>
          <Input
            id="nilai-size"
            type="number"
            min="8"
            max="48"
            value={settings.nilai.fontSize}
            onChange={(e) =>
              updateSetting("nilai", "fontSize", parseInt(e.target.value) || 14)
            }
            className="h-9"
          />
          <p className="text-xs text-gray-500">
            Font size for score values (numbers)
          </p>
        </div>

        {/* Additional Info Font Size */}
        <div className="space-y-2">
          <Label htmlFor="additional-info-size" className="text-sm font-medium">
            Additional Info Font Size
          </Label>
          <Input
            id="additional-info-size"
            type="number"
            min="8"
            max="48"
            value={settings.additionalInfo.fontSize}
            onChange={(e) =>
              updateSetting("additionalInfo", "fontSize", parseInt(e.target.value) || 14)
            }
            className="h-9"
          />
          <p className="text-xs text-gray-500">
            Font size for nilai prestasi and additional information
          </p>
        </div>

        {/* Date Font Size */}
        <div className="space-y-2">
          <Label htmlFor="date-size" className="text-sm font-medium">
            Date Font Size
          </Label>
          <Input
            id="date-size"
            type="number"
            min="8"
            max="48"
            value={settings.date.fontSize}
            onChange={(e) =>
              updateSetting("date", "fontSize", parseInt(e.target.value) || 14)
            }
            className="h-9"
          />
          <p className="text-xs text-gray-500">
            Font size for score date display
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
          <p className="text-xs text-blue-800">
            <strong>Tip:</strong> These settings affect how text appears on the score template.
            Adjust font sizes to fit your template layout. Changes are automatically saved with
            your template settings.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

