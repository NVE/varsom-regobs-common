import { InanoSQLTableConfig } from '@nano-sql/core/lib/interfaces';

export const TABLE_NAMES = {
    REGISTRATION: 'registration',
    USER_SETTINGS: 'usersettings',
    KDV_ELEMENTS: 'kdvelements'
};

export const DB_NAME_TEMPLATE = 'regobs_registration';

export const DB_TABLE_CONFIG: InanoSQLTableConfig[] = [
    {
        name: TABLE_NAMES.REGISTRATION,
        model: {
            'id:uuid': { pk: true },
            '*:any': {}
        }
    },
    {
        name: TABLE_NAMES.USER_SETTINGS,
        model: {
            'id:string': { pk: true },
            '*:any': {}
        }
    },
    {
        name: TABLE_NAMES.KDV_ELEMENTS,
        model: {
            'langKey:number': { pk: true },
            'lastUpdated:number': {},
            'kdvElements:any': {}
        }
    }
];
