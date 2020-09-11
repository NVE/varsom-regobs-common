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
    }
  },
};
