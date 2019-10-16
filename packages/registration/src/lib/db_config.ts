import { InanoSQLTableConfig } from '@nano-sql/core/lib/interfaces';

export const TABLE_NAMES = {
    REGISTRATION: 'registration',
};

export const DB_NAME_TEMPLATE = 'regobs_registration';

export const tables: InanoSQLTableConfig[] = [
    {
        name: TABLE_NAMES.REGISTRATION,
        model: {
            'id:uuid': { pk: true },
            '*:any': {}
        }
    }
];
