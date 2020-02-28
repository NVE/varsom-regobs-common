import { InanoSQLPlugin, InanoSQLTable, InanoSQLQuery } from '@nano-sql/core/lib/interfaces';

// Plugin to avoid random id on table name
export const NSQL_TABLE_NAME_PLUGIN: InanoSQLPlugin = {
  name: 'Table Name Plugin', // Plugin to avoid random id on table name
  version: 1.0,
  dependencies: {},
  filters: [
    {
      name: 'configTableSystem',
      priority: 1000,
      call: (inputArgs: { res: InanoSQLTable; query: InanoSQLQuery }, complete) => {
        inputArgs.res.id = inputArgs.res.name;
        complete(inputArgs);
      }
    }
  ]
};
