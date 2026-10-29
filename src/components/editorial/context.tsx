import { createContext, useContext } from 'react';
import type { LandingLanguage } from '@/lib/i18n';
import { editorialCopy } from '@/lib/editorial/copy';
export const EditorialLanguage = createContext<LandingLanguage>('en');
export function useEditorialCopy() {
  return editorialCopy[useContext(EditorialLanguage)];
}
