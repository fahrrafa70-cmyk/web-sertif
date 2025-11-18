"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { Template, CreateTemplateData, UpdateTemplateData, createTemplate, updateTemplate } from "@/lib/supabase/templates";
import { useLanguage } from "@/contexts/language-context";
import { toast } from "sonner";
import { X } from "lucide-react";

interface TemplateFormProps {
  template?: Template;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TemplateForm({ template, onSuccess, onCancel }: TemplateFormProps) {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState(template?.name || "");
  const [category, setCategory] = useState(template?.category || "");
  const [orientation, setOrientation] = useState(template?.orientation || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewImageFile, setPreviewImageFile] = useState<File | null>(null);
  const [isDualTemplate, setIsDualTemplate] = useState(template?.is_dual_template || false);
  const [certificateImageFile, setCertificateImageFile] = useState<File | null>(null);
  const [scoreImageFile, setScoreImageFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !category.trim() || !orientation.trim()) {
      toast.error(t('templates.validation.required'));
      return;
    }

    setIsLoading(true);
    
    try {
      if (template) {
        // Update existing template
        const updateData: UpdateTemplateData = {
          name: name.trim(),
          category: category.trim(),
          orientation: orientation.trim(),
          is_dual_template: isDualTemplate,
        };

        if (imageFile) updateData.image_file = imageFile;
        if (previewImageFile) updateData.preview_image_file = previewImageFile;
        if (certificateImageFile) updateData.certificate_image_file = certificateImageFile;
        if (scoreImageFile) updateData.score_image_file = scoreImageFile;

        await updateTemplate(template.id, updateData);
        toast.success(t('templates.updateSuccess'));
      } else {
        // Create new template
        const createData: CreateTemplateData = {
          name: name.trim(),
          category: category.trim(),
          orientation: orientation.trim(),
          is_dual_template: isDualTemplate,
        };

        if (imageFile) createData.image_file = imageFile;
        if (previewImageFile) createData.preview_image_file = previewImageFile;
        if (certificateImageFile) createData.certificate_image_file = certificateImageFile;
        if (scoreImageFile) createData.score_image_file = scoreImageFile;

        await createTemplate(createData);
        toast.success(t('templates.createSuccess'));
      }
      
      onSuccess();
    } catch (error) {
      console.error('Template operation failed:', error);
      toast.error(template ? t('templates.updateError') : t('templates.createError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (file: File | null, type: 'image' | 'preview' | 'certificate' | 'score') => {
    switch (type) {
      case 'image':
        setImageFile(file);
        break;
      case 'preview':
        setPreviewImageFile(file);
        break;
      case 'certificate':
        setCertificateImageFile(file);
        break;
      case 'score':
        setScoreImageFile(file);
        break;
    }
  };

  const FileUploadField = ({ 
    label, 
    file, 
    onChange, 
    _type 
  }: { 
    label: string; 
    file: File | null; 
    onChange: (file: File | null) => void;
    _type: 'image' | 'preview' | 'certificate' | 'score';
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const selectedFile = e.target.files?.[0] || null;
              onChange(selectedFile);
            }}
            className="cursor-pointer"
          />
        </div>
        {file && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {file && (
        <p className="text-sm text-gray-600">
          Selected: {file.name}
        </p>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
      {/* Basic Information */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">{t('templates.form.name')} *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('templates.form.namePlaceholder')}
            required
          />
        </div>

        <div>
          <Label htmlFor="category">{t('templates.form.category')} *</Label>
          <Select value={category} onValueChange={setCategory} required>
            <SelectTrigger>
              <SelectValue placeholder={t('templates.form.categoryPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Training">Training</SelectItem>
              <SelectItem value="Internship">Internship</SelectItem>
              <SelectItem value="MoU">MoU</SelectItem>
              <SelectItem value="Visit">Visit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="orientation">{t('templates.form.orientation')} *</Label>
          <Select value={orientation} onValueChange={setOrientation} required>
            <SelectTrigger>
              <SelectValue placeholder={t('templates.form.orientationPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Portrait">Portrait</SelectItem>
              <SelectItem value="Landscape">Landscape</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Dual Template Toggle */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isDualTemplate"
            checked={isDualTemplate}
            onChange={(e) => setIsDualTemplate(e.target.checked)}
            className="rounded border-gray-300"
          />
          <Label htmlFor="isDualTemplate">{t('templates.form.isDualTemplate')}</Label>
        </div>
      </div>

      {/* File Uploads */}
      <div className="space-y-4">
        {isDualTemplate ? (
          <>
            <FileUploadField
              label={`${t('templates.form.certificateImage')} *`}
              file={certificateImageFile}
              onChange={(file) => handleFileChange(file, 'certificate')}
              _type="certificate"
            />
            <FileUploadField
              label={`${t('templates.form.scoreImage')} *`}
              file={scoreImageFile}
              onChange={(file) => handleFileChange(file, 'score')}
              _type="score"
            />
            <FileUploadField
              label={t('templates.form.previewImage')}
              file={previewImageFile}
              onChange={(file) => handleFileChange(file, 'preview')}
              _type="preview"
            />
          </>
        ) : (
          <>
            <FileUploadField
              label={t('templates.form.image')}
              file={imageFile}
              onChange={(file) => handleFileChange(file, 'image')}
              _type="image"
            />
            <FileUploadField
              label={t('templates.form.previewImage')}
              file={previewImageFile}
              onChange={(file) => handleFileChange(file, 'preview')}
              _type="preview"
            />
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          {t('common.cancel')}
        </Button>
        <LoadingButton
          type="submit"
          isLoading={isLoading}
          className="flex-1"
        >
          {template ? t('templates.update') : t('templates.create')}
        </LoadingButton>
      </div>
    </form>
  );
}
