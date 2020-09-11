import { Injectable, isDevMode } from '@angular/core';
import { AppModeService, LoggerService } from '@varsom-regobs-common/core';
import { OfflineDbServiceOptions } from './offline-db-service.options';
import { RegistrationSchema } from '../../db/schemas/registration.schema';
import {
  createRxDatabase,
  addRxPlugin,
  RxJsonSchema
} from 'rxdb/plugins/core';
import { RxDBNoValidatePlugin } from 'rxdb/plugins/no-validate';
import { RxRegistrationDatabase, RxRegistrationCollections } from '../../db/RxDB';
import { GenericSchema } from '../../db/schemas/generic.schema';
// import * as PouchdbAdapterIdb from 'pouchdb-adapter-idb';

const collections: Array<{name: string, schema: RxJsonSchema}> = [
  {
    name: 'test/registration',
    schema: RegistrationSchema,
  },
  {
    name: 'demo/registration',
    schema: RegistrationSchema,
  },
  {
    name: 'prod/registration',
    schema: RegistrationSchema,
  },
  {
    name: 'test/kdvelements',
    schema: GenericSchema,
  },
  {
    name: 'demo/kdvelements',
    schema: GenericSchema,
  },
  {
    name: 'prod/kdvelements',
    schema: GenericSchema,
  },
  {
    name: 'test/helptexts',
    schema: GenericSchema,
  },
  {
    name: 'demo/helptexts',
    schema: GenericSchema,
  },
  {
    name: 'prod/helptexts',
    schema: GenericSchema,
  },
];

async function loadRxDBPlugins(): Promise<void> {
  /**
   * indexed-db adapter
   */
  // addRxPlugin(PouchdbAdapterIdb);

  /**
   * to reduce the build-size,
   * we use some modules in dev-mode only
   */
  if (isDevMode()) {
    await Promise.all([
      // add dev-mode plugin
      // which does many checks and add full error-messages
      import('rxdb/plugins/dev-mode').then(
        module => addRxPlugin(module)
      ),

      // we use the schema-validation only in dev-mode
      // this validates each document if it is matching the jsonschema
      import('rxdb/plugins/validate').then(
        module => addRxPlugin(module)
      )
    ]);
  } else {
    // in production we use the no-validate module instead of the schema-validation
    // to reduce the build-size
    addRxPlugin(RxDBNoValidatePlugin);
  }
}

@Injectable({
  providedIn: 'root'
})
export class OfflineDbService {

  // public readonly appModeInitialized$: Observable<AppMode>;
  private dbInstance: RxRegistrationDatabase;

  constructor(private appModeService: AppModeService, private options: OfflineDbServiceOptions, private logger: LoggerService) {
  }

  async initDatabase(adapter: string): Promise<void> {
    this.dbInstance = await this.create(adapter);
  }

  get db(): RxRegistrationDatabase {
    return this.dbInstance;
  }

  private async create(adapter: string): Promise<RxRegistrationDatabase> {

    await loadRxDBPlugins();

    const db = await createRxDatabase<RxRegistrationCollections>({
      name: 'rxdb_regobs_registration',
      adapter,
    });
    // (window as unknown)['db'] = db; // write to window for debugging

    await Promise.all(collections.map(colData => db.collection(colData)));

    return db;
  }

  // private getDbName(appMode: AppMode): string {
  //   return `${DB_NAME_TEMPLATE}_${appMode}`;
  // }

  // private initAppMode(appMode: AppMode) {
  //   this.logger.log('initAppMode', appMode);
  //   return from(this.createDbIfNotExist(appMode));
  // }

  // public getDbInstance(appMode: AppMode) {
  //   return nSQL().useDatabase(this.getDbName(appMode));
  // }

  // public getOfflineRecords<T>(appMode: AppMode, table: string, key: string, keyValue: string | number): Promise<T[]> {
  // return this.getDbInstance(appMode).selectTable(table).query('select').where([`${key}`, '=', keyValue]).exec() as Promise<T[]>;
  // return this.db[appMode].findByIds()
  // }

  // public saveOfflineRecords<T>(appMode: AppMode, table: string, data: T | T[]): Promise<T[]> {
  // return this.getDbInstance(appMode).selectTable(table).query('upsert', data).exec() as Promise<T[]>;
  // this.db[appMode].upsert()
  // }

  // private async createDbIfNotExist(appMode: AppMode): Promise<AppMode> {
  //   const dbName = this.getDbName(appMode);
  //   const exists = nSQL().listDatabases().indexOf(dbName) >= 0;
  //   if (!exists) {
  //     try{
  //       await nSQL().createDatabase({
  //         id: this.getDbName(appMode),
  //         mode: this.options.dbMode,
  //         tables: DB_TABLE_CONFIG,
  //         plugins: [
  //           NSQL_TABLE_NAME_PLUGIN
  //         ],
  //       });
  //     }catch(err) {
  //       this.logger.warn(`Could not create database for app mode: ${appMode}`, err);
  //     }
  //   }
  //   return appMode;
  // }
}
