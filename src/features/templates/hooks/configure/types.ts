import { TextLayerConfig, PhotoLayerConfig, QRCodeLayerConfig } from "@/types/template-layout";

export interface TextLayer extends TextLayerConfig {
  isEditing?: boolean;
  isDragging?: boolean;
}

export const DUMMY_DATA = {
  name: "John Doe",
  certificate_no: "251102000",
  issue_date: "30 October 2025",
  expired_date: "30 October 2028",
  description: "For outstanding achievement",
};
