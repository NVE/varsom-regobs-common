import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { nSQL } from '@nano-sql/core';
import { CreateRegistrationRequestDto } from '@varsom-regobs-common/regobs-api';
import { TABLE_NAMES } from '../../db/nSQL-db.config';
import { NSqlFullTableObservable } from '@varsom-regobs-common/core';
import { switchMap, tap } from 'rxjs/operators';
import { uuid } from '@nano-sql/core/lib/utilities';
import { IRegistration } from '../../models/registration.interface';
import { OfflineDbService } from '../offline-db/offline-db.service';

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {

  public get registrationStorage$(): Observable<IRegistration[]> {
    return this.offlineDbService.appModeInitialized$.pipe(
      tap((appMode) => console.log('App mode initialized: ', appMode)),
      switchMap(() => this.getRegistrationObservable()));
  }

  constructor(private offlineDbService: OfflineDbService) { }

  public addRegistration(reg: CreateRegistrationRequestDto): Observable<any> {
    if (!reg.Id) {
      reg.Id = uuid();
    }
    const dbRecord = { id: reg.Id, reg };
    return from(nSQL(TABLE_NAMES.REGISTRATION).query('upsert', dbRecord).exec());
  }

  public deleteRegistration(id: string): Observable<any> {
    return from(nSQL(TABLE_NAMES.REGISTRATION).query('delete').where(['id', '=', id]).exec());
  }

  private getRegistrationObservable() {
    return new NSqlFullTableObservable<IRegistration[]>(
      nSQL(TABLE_NAMES.REGISTRATION).query('select').listen()
    );
  }
}
