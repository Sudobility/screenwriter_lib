import type { ScreenwriterClient } from '@sudobility/screenwriter_client';
import type { PropLooksRequest, PropSheetRequest } from '@sudobility/screenwriter_types';

export function createPropImagesFlow(client: ScreenwriterClient, documentId: string, propId: string) {
  return {
    looks: (request: PropLooksRequest) => client.generatePropLooks(documentId, propId, request),
    sheet: (request: PropSheetRequest) => client.generatePropSheet(documentId, propId, request),
    image: (kind: 'looks' | 'sheet', id: string) => client.getPropImage(documentId, propId, kind, id),
  };
}
export type PropImagesFlow = ReturnType<typeof createPropImagesFlow>;
