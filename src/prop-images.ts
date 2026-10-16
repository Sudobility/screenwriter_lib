import type { ScreenwriterClient } from '@sudobility/screenwriter_client';
import type { PropLooksRequest, PropSheetRequest } from '@sudobility/screenwriter_types';

export function createPropImagesFlow(client: ScreenwriterClient, documentId: string, propId: string) {
  return {
    looks: (request: PropLooksRequest) => client.generatePropLooks(documentId, propId, request),
    sheet: (request: PropSheetRequest) => client.generatePropSheet(documentId, propId, request),
    /** Upload a user-supplied PNG (base64 data URL) for a slot instead of generating it. */
    upload: (kind: 'looks' | 'sheet', image: string) => client.uploadPropImage(documentId, propId, kind, image),
    image: (kind: 'looks' | 'sheet', id: string) => client.getPropImage(documentId, propId, kind, id),
  };
}
export type PropImagesFlow = ReturnType<typeof createPropImagesFlow>;
