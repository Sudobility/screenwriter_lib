import type { ScreenwriterClient } from '@sudobility/screenwriter_client';
import type { ProductionImageKind, ProductionImageRequest } from '@sudobility/screenwriter_types';

export function createProductionImagesFlow(client: ScreenwriterClient, documentId: string, kind: ProductionImageKind, subjectId: string) {
  return {
    generate: (request: ProductionImageRequest) => client.generateProductionImage(documentId, kind, subjectId, request),
    image: (id: string) => client.getProductionImage(documentId, kind, subjectId, id),
    delete: (id: string) => client.deleteProductionImage(documentId, kind, subjectId, id),
  };
}
export type ProductionImagesFlow = ReturnType<typeof createProductionImagesFlow>;
