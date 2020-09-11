import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { HelptextDto, HelptextService as HelpTextApiService } from '@varsom-regobs-common/regobs-api';
// import { ApiSyncOfflineBaseService } from '../api-sync-offline-base/api-sync-offline-base.service';
import {
  AppMode,
  LoggerService,
  LangKey,
  getLangKeyString,
  LanguageService,
  GeoHazard,
  AppModeService } from '@varsom-regobs-common/core';
// import { TABLE_NAMES } from '../../db/nSQL-db.config';
import { HttpClient } from '@angular/common/http';
import { catchError, map, switchMap, concatMap, filter } from 'rxjs/operators';
import { of, combineLatest } from 'rxjs';
import { OfflineDbService } from '../offline-db/offline-db.service';
import { RxHelpTextCollection } from '../../db/RxDB';

// const VALID_HELP_TEXT_SECONDS = 604800; // 7 days
const HELP_TEXTS_ASSETS_FOLDER = '/assets/helptexts';

@Injectable({
  providedIn: 'root'
})
export class HelpTextService {

  constructor(protected offlineDbService: OfflineDbService,
    protected languageService: LanguageService,
    private appModeService: AppModeService,
    protected logger: LoggerService,
    private helpTextApiService: HelpTextApiService,
    private httpClient: HttpClient) {
    // super({
    //   offlineTableName: TABLE_NAMES.HELP_TEXTS,
    //   useLangKeyAsDbKey: true,
    //   validSeconds: VALID_HELP_TEXT_SECONDS
    // }, offlineDbService, languageService, logger);
  }

  private getTableName(appMode: AppMode) {
    return `${appMode.toLocaleLowerCase()}/helptexts`;
  }

  private getDbCollection(appMode: AppMode): RxHelpTextCollection {
    return (this.offlineDbService.db[this.getTableName(appMode)] as RxHelpTextCollection);
  }

  private getDocumentByLangKey() {
    return combineLatest([this.languageService.language$, this.appModeService.appMode$]).pipe(
      switchMap(([lang, appMode]) =>
        this.getDbCollection(appMode).findOne(`${lang}`).$.pipe(
          concatMap((val) => {
            if(!val) {
              this.logger.warn('No helptexts found in offline storage. Get fallback data');
              return this.getFallbackData(appMode, lang);
            }
            return of(val.data);
          }),
          filter((val) => !!val))));
  }

  public getUpdatedData(_: AppMode, langKey: LangKey): Observable<HelptextDto[]> {
    return this.helpTextApiService.HelptextGet(langKey);
  }

  public getFallbackData(_: AppMode, langKey: LangKey): Observable<HelptextDto[]> {
    return this.httpClient.get<HelptextDto[]>
    (`${HELP_TEXTS_ASSETS_FOLDER}/helptexts.${getLangKeyString(langKey)}.json`)
      .pipe(catchError((err) => {
        this.logger.warn(`Helptexts for language ${getLangKeyString(langKey)} not found in assets/kdvelements folder`, err);
        return of([]);
      }));
  }

  public getHelpTextObservable(geoHazard: GeoHazard, registrationTid: number): Observable<string> {
    return this.getDocumentByLangKey().pipe(map((helptexts: HelptextDto[]) =>
      helptexts.find((data) => data.GeoHazardTID === geoHazard && data.RegistrationTID === registrationTid)),
    map((helpText) => helpText ? helpText.Text : undefined));
  }

  public hasHelpTextObservable(geoHazard: GeoHazard, registrationTid: number): Observable<boolean> {
    return this.getHelpTextObservable(geoHazard, registrationTid).pipe(map((val) => !!val));
  }
}
