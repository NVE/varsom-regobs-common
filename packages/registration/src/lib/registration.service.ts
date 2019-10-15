import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { CreateRegistrationRequestDto } from '@varsom-regobs-common/regobs-api';

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {

  public get RegistrationStorage(): Observable<CreateRegistrationRequestDto[]> {
    return of([]);
  }

  constructor() { }
}
