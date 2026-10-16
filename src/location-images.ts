import type { ScreenwriterClient } from '@sudobility/screenwriter_client';
import type { LocationImageTime, LocationLooksRequest, LocationTimesRequest } from '@sudobility/screenwriter_types';

export function createLocationImagesFlow(client: ScreenwriterClient, documentId: string, locationId: string) {
  return {
    looks: (request: LocationLooksRequest) => client.generateLocationLooks(documentId, locationId, request),
    times: (request: LocationTimesRequest) => client.generateLocationTimes(documentId, locationId, request),
    /** Upload a user-supplied PNG (base64 data URL) for one look/time slot instead of generating it. */
    upload: (kind: 'looks' | LocationImageTime, image: string) => client.uploadLocationImage(documentId, locationId, kind, image),
    image: (kind: 'looks' | LocationImageTime, id: string) => client.getLocationImage(documentId, locationId, kind, id),
  };
}
export type LocationImagesFlow = ReturnType<typeof createLocationImagesFlow>;
