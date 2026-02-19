/**
 * features/templates/index.ts  — public barrel
 */
export type { Template, CreateTemplateData, UpdateTemplateData } from "./types";
export {
  getTemplates, getTemplatesForTenant, getTemplate,
  getTemplateLayout, isTemplateReadyForQuickGenerate,
} from "./queries";
export { createTemplate, updateTemplate, deleteTemplate } from "./mutations";
export {
  uploadTemplateImage, uploadOriginalImage,
  getTemplateImageUrl, getTemplatePreviewUrl,
  saveTemplateLayout, clearTemplateLayout,
} from "./service";
