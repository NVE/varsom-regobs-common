import {
  RxJsonSchema
} from 'rxdb';
export const RegistrationSchema : RxJsonSchema = {
  title: 'Registration schema',
  description: 'Registrations',
  version: 0,
  keyCompression: false,
  type: 'object',
  properties: {
    id: {
      type: 'string',
      primary: true,
    },
    changed: {
      type: 'number',
    },
    geoHazard: {
      type: 'number',
    },
    syncStatus: {
      type: 'string',
    },
    lastSync: {
      type: 'number',
    },
    request: {
      type: 'object',
    },
    response: {
      type: 'object',
    },
  },
  required: ['id', 'changed', 'geoHazard', 'syncStatus'],
};
