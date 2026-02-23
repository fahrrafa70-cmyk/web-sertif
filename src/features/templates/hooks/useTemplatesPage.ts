"use client";

import { useLanguage } from "@/contexts/language-context";
import { useTemplatesCore } from "./useTemplatesCore";
import { useTemplatesFilter } from "./useTemplatesFilter";
import { useTemplatesForm } from "./useTemplatesForm";
import { useTemplatesActions } from "./useTemplatesActions";

export function useTemplatesPage() {
  const { t } = useLanguage();

  const core = useTemplatesCore();

  const filter = useTemplatesFilter(
    core.templates,
    core.selectedTenantId
  );

  const form = useTemplatesForm(
    core.selectedTenantId,
    core.create,
    core.update,
    core.refresh,
    t
  );

  const actions = useTemplatesActions(
    core.templates,
    core.canDelete,
    core.deleteTemplate,
    t
  );

  return {
    ...core,
    ...filter,
    ...form,
    ...actions,
    t,
  };
}
