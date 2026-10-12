import type { ScreenwriterClient } from '@sudobility/screenwriter_client';
import type { CharacterLooksRequest, CharacterSheetRequest } from '@sudobility/screenwriter_types';

/** Document-scoped character image operations used by the editor. */
export function createCharacterImagesFlow(client: ScreenwriterClient, documentId: string, characterId: string) {
  return {
    looks: (request: CharacterLooksRequest) => client.generateCharacterLooks(documentId, characterId, request),
    sheet: (request: CharacterSheetRequest) => client.generateCharacterSheet(documentId, characterId, request),
    image: (kind: 'looks' | 'sheet', id: string) => client.getCharacterImage(documentId, characterId, kind, id),
  };
}
export type CharacterImagesFlow = ReturnType<typeof createCharacterImagesFlow>;
