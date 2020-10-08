import { Injectable, Inject } from '@angular/core';
import { APP_CONFIG } from '../../core.module';
import { AppConfig } from '../../models';
import { Observable, BehaviorSubject } from 'rxjs';
import { LangKey } from '../../models/lang-key.enum';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {

  public get language$(): Observable<LangKey> {
    return this.langKeySubject;
  }

  private langKeySubject: BehaviorSubject<LangKey>;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.langKeySubject = new BehaviorSubject(config.language);
  }

  public setLanguage(langKey: LangKey): void {
    if (typeof langKey !== 'number') {
      throw new Error('Lang key must be a number!');
    }
    this.langKeySubject.next(langKey);
  }
}
