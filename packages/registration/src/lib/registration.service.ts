import { Injectable } from '@angular/core';
import { Observable, of, from } from 'rxjs';
import { nSQL } from '@nano-sql/core';
import { CreateRegistrationRequestDto } from '@varsom-regobs-common/regobs-api';
import { tables } from './db_config';

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {

  public get RegistrationStorage(): Observable<{ id: string, reg: CreateRegistrationRequestDto }[]> {
    // tslint:disable-next-line: deprecation
    return from(
      (nSQL('registration').query('select').exec() as Promise<{ id: string, reg: CreateRegistrationRequestDto }[]>));
  }

  constructor() { }

  async init(appMode: string = 'test') {
    console.log('Init nano sql table');
    await nSQL().createDatabase({
      id: `regobs_registration_${appMode}`,
      tables: tables,
    });
  }
}
