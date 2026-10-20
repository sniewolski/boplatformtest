export type SosaMarker = 'dont_know' | 'not_doing' | 'dont_have';

export type SosaUploadItem =
  | { id: string; kind: 'file'; slot?: string; path: string; name: string; size: number; mime: string }
  | { id: string; kind: 'link'; slot?: string; url: string; name?: string };

export type SosaFieldValue =
  | number                                   // number
  | string                                   // text, script
  | 'yes' | 'no'                             // yesno
  | { key: string; other?: string }          // choice (key 'other' when Other picked)
  | { keys: string[]; other?: string }       // multi
  | { items: SosaUploadItem[] }              // upload
  | { items: { id: string; values: Record<string, SosaFieldValue> }[] }   // list (array order = display order)
  | { rows: Record<string, Record<string, SosaFieldValue>> };             // linked (keyed by list item id or option key)

export interface SosaAnswer {
  questionId: string;                         // QUESTIONS[].id
  value: Record<string, SosaFieldValue>;      // keyed by field key
  estimates: Record<string, true>;            // paths of number fields ticked "Estimate": "fieldKey" or "fieldKey.<itemIdOrOptionKey>.<subFieldKey>"
  marker: SosaMarker | null;
  updatedAt: string;
}
