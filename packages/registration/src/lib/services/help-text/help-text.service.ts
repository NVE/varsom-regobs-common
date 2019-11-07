import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { HelptextDto } from '../../../../../../dist/varsom-regobs-common/regobs-api';
import { BehaviorSubject, Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HelpTextService {

  private _helpTexts$: Observable<HelptextDto[]>;
  private _isUpdating$: BehaviorSubject<boolean> = new BehaviorSubject(false);
  private updateHelpTextsSubscription: Subscription;

  public get helpTexts$(): Observable<HelptextDto[]> {
    return this._helpTexts$;
  }

  public get isUpdating$(): Observable<boolean> {
    return this._isUpdating$.asObservable();
  }

  constructor() { }
}
