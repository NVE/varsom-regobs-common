import { InanoSQLTableConfig } from '@nano-sql/core/lib/interfaces';

export const tables: InanoSQLTableConfig[] = [
    {
        name: 'registration',
        model: {
            'id:uuid': { pk: true },
            '*:any': {}
        }
    }
];
