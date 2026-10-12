import type { ScreenwriterClient } from '@sudobility/screenwriter_client';
import type { LocationImageTime, LocationLooksRequest, LocationTimesRequest } from '@sudobility/screenwriter_types';

export function createLocationImagesFlow(client: ScreenwriterClient, documentId: string, locationId: string) {
  return {
    looks: (request: LocationLooksRequest) => client.generateLocationLooks(documentId, locationId, request),
    times: (request: LocationTimesRequest) => client.generateLocationTimes(documentId, locationId, request),
    image: (kind: 'looks' | LocationImageTime, id: string) => client.getLocationImage(documentId, locationId, kind, id),
  };
}
export type LocationImagesFlow = ReturnType<typeof createLocationImagesFlow>;
