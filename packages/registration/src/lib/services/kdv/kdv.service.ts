import { Injectable } from '@angular/core';
import { AppMode, LanguageService, LangKey, getLangKeyString, LoggerService, AppModeService } from '@varsom-regobs-common/core';
import { of, Observable, combineLatest, BehaviorSubject, from } from 'rxjs';
import { map, catchError, switchMap, concatMap, filter, shareReplay, tap, take } from 'rxjs/operators';
import { KdvElementsResponseDto, KdvElementsService, KdvElement } from '@varsom-regobs-common/regobs-api';
import { OfflineDbService } from '../offline-db/offline-db.service';
// import { TABLE_NAMES } from '../../db/nSQL-db.config';
import { HttpClient } from '@angular/common/http';
import { KdvKey } from '../../models/kdv-key.type';
// import { ApiSyncOfflineBaseService } from '../api-sync-offline-base/api-sync-offline-base.service';
import { KdvViewRepositoryKey } from '../../models/view-repository-key.type';
import { RxKdvCollection } from '../../db/RxDB';
import { OfflineSyncMeta } from '../../models/offline-sync-meta.interface';
import moment from 'moment';

const KDV_ASSETS_FOLDER = '/assets/kdvelements'; // TODO: Add this to module config?
// const VALID_KDV_ELEMENTS_SECONDS = 604800; // 7 days

@Injectable({
  providedIn: 'root'
})
export class KdvService{

  public readonly data$: Observable<KdvElementsResponseDto>;
  private isUpdatingSubject: BehaviorSubject<boolean> = new BehaviorSubject(false);

  public get isUpdating$(): Observable<boolean> {
    return this.isUpdatingSubject.asObservable();
  }

  constructor(protected offlineDbService: OfflineDbService,
    protected languageService: LanguageService,
    protected logger: LoggerService,
    private kdvElementsService: KdvElementsService,
    private httpClient: HttpClient,
    private appModeService: AppModeService)  {
    // super({
    //   offlineTableName: TABLE_NAMES.KDV_ELEMENTS,
    //   useLangKeyAsDbKey: true,
    //   validSeconds: VALID_KDV_ELEMENTS_SECONDS
    // }, offlineDbService, languageService, logger);
    this.data$ = this.getKdvElementsResponse().pipe(shareReplay(1));
  }

  public update(): void {
    this.isUpdatingSubject.next(true);
    combineLatest([this.languageService.language$, this.appModeService.appMode$]).pipe(
      take(1),
      switchMap(([lang, appMode]) => this.getUpdatedData(appMode, lang).pipe(map((data) => ({ appMode, lang, data })))),
      switchMap((ud) => this.saveKdvElementsToDb(ud.appMode, ud.lang, ud.data)),
      tap(() => {
        this.isUpdatingSubject.next(false);
      })).subscribe();
  }

  private saveKdvElementsToDb(appMode: AppMode, langKey: LangKey, data: KdvElementsResponseDto) {
    const meta: OfflineSyncMeta<KdvElementsResponseDto> = {
      id: `${langKey}`,
      lastUpdated: moment().unix(),
      data
    };
    return from(this.getDbCollection(appMode).upsert(meta));
  }

  public getUpdatedData(_: AppMode, langKey: LangKey): Observable<KdvElementsResponseDto> {
    return this.kdvElementsService.KdvElementsGetKdvs({ langkey: langKey });
  }

  public getFallbackData(_: AppMode, langKey: LangKey): Observable<KdvElementsResponseDto> {
    return this.httpClient.get<KdvElementsResponseDto>
    (`${KDV_ASSETS_FOLDER}/kdvelements.${getLangKeyString(langKey)}.json`)
      .pipe(catchError((err) => {
        this.logger.warn(`Kdv elements for language ${getLangKeyString(langKey)} not found in assets/kdvelements folder`, err);
        return of({
          KdvRepositories: {},
          ViewRepositories: {}
        });
      }));
  }

  private getTableName(appMode: AppMode) {
    return `${appMode.toLocaleLowerCase()}/kdvelements`;
  }

  private getDbCollection(appMode: AppMode): RxKdvCollection {
    return (this.offlineDbService.db[this.getTableName(appMode)] as RxKdvCollection);
  }

  private getKdvElementsResponse() {
    return combineLatest([this.languageService.language$, this.appModeService.appMode$]).pipe(
      switchMap(([lang, appMode]) =>
        this.getDbCollection(appMode).findOne(`${lang}`).$.pipe(
          concatMap((val) => {
            if(!val) {
              this.logger.warn('No kdv elements found in offline storage. Get fallback data');
              return this.getFallbackData(appMode, lang);
            }
            return of(val.data);
          }),
          filter((val) => !!val))));
  }

  public getKdvRepositoryByKeyObservable(key: KdvKey): Observable<KdvElement[]> {
    return this.data$.pipe(
      map((val) => val.KdvRepositories[key]));
  }

  public getViewRepositoryByKeyObservable(key: KdvViewRepositoryKey): Observable<unknown> {
    // return this.data$.pipe(map((val) => val.ViewRepositories[key]));
    return this.data$.pipe(
      map((val) => val.ViewRepositories[key]));
  }
}
