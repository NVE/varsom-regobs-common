import {
  RxJsonSchema
} from 'rxdb';
export const AttachmentMetaSchema : RxJsonSchema = {
  title: 'Attachment Metadata schema',
  description: 'Attachment Metadata',
  version: 0,
  keyCompression: false,
  type: 'object',
  properties: {
    id: {
      type: 'string',
      primary: true,
    },
    geoHazardTid: {
      type: 'number',
    },
    registrationTid: {
      type: 'number',
    },
    contextKey: {
      type: 'string',
    },
    context: {
      type: 'string',
    },
  },
  required: ['id', 'geoHazardTid', 'registrationTid'],
};
