import { OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, from, of, EMPTY, Subject } from 'rxjs';
import { LanguageService, LoggerService, AppMode, LangKey } from '@varsom-regobs-common/core';
import { map, switchMap, shareReplay, skipWhile, catchError, take, tap, takeUntil, filter } from 'rxjs/operators';
import { OfflineSyncMeta } from '../../models/offline-sync-meta.interface';
import moment from 'moment';
import { OfflineDbService } from '../offline-db/offline-db.service';

export abstract class ApiSyncOfflineBaseService<T> implements OnDestroy {
  private isUpdatingSubject: BehaviorSubject<boolean> = new BehaviorSubject(false);
  private inMemoryData: BehaviorSubject<{ [appMode: string]: { [langKey: number]: T } }> = new BehaviorSubject({});
  private readonly appModeAndLanguage$: Observable<{ appMode: AppMode, langKey: LangKey }>;
  private readonly ngDestroySubject = new Subject();

  public get isUpdating$() {
    return this.isUpdatingSubject.asObservable();
  }

  public get ngDestroy$() {
    return this.ngDestroySubject.asObservable();
  }

  public readonly data$: Observable<T>;

  constructor(
    protected options: {
      offlineTableName: string,
      useLangKeyAsDbKey: boolean,
      validSeconds: number,
      offlineTableKey?: string | number,
      offlineTableKeyname?: string,
    },
    protected offlineDbService: OfflineDbService,
    protected languageService: LanguageService,
    protected logger: LoggerService) {
    this.appModeAndLanguage$ = combineLatest([this.offlineDbService.appModeInitialized$, this.languageService.language$])
      .pipe(tap((appModeAndLanguage) => this.logger.log('App mode or language changed: ', appModeAndLanguage)),
        map(([appMode, langKey]) => ({ appMode, langKey })), shareReplay(1));
    this.data$ = this.getInMemoryDataObservable();
    this.init();
  }

  public abstract getUpdatedData(appMode: AppMode, langKey: LangKey): Observable<T>;
  public abstract getFallbackData(appMode: AppMode, langKey: LangKey): Observable<T>;

  public init() {
    this.appModeAndLanguage$.pipe(
      switchMap((appModeAndLanguage) =>
        this.getOfflineData(appModeAndLanguage.appMode, appModeAndLanguage.langKey).pipe(
          map((offlineData) => ({ appMode: appModeAndLanguage.appMode, langKey: appModeAndLanguage.langKey, offlineData })))),
      switchMap((appLangOfflineData) => !this.isValid(appLangOfflineData.offlineData) ?
        this.updateDataOrGetFallback(appLangOfflineData.appMode, appLangOfflineData.langKey) : EMPTY),
      takeUntil(this.ngDestroy$))
      .subscribe();
  }

  public update() {
    this.appModeAndLanguage$.pipe(take(1), switchMap((appModeAndLanguage) =>
      this.updateDataObservable(appModeAndLanguage.appMode, appModeAndLanguage.langKey))
    ).subscribe();
  }

  public isValid(metaData: OfflineSyncMeta<T>) {
    const valid = metaData && (metaData.lastUpdated > this.getInvalidTime().unix());
    this.logger.debug(`Offline data is valid: ${valid}`, metaData);
    return valid;
  }

  public getInvalidTime() {
    return moment().subtract(this.options.validSeconds, 'seconds');
  }

  private updateDataOrGetFallback(appMode: AppMode, langKey: LangKey) {
    return this.updateDataObservable(appMode, langKey)
      .pipe(switchMap((success) => success ? EMPTY :
        this.getFallbackData(appMode, langKey).pipe(
          switchMap((fallbackData) => of(this.saveUpdatedDataInMemory(appMode, langKey, fallbackData))))));
  }

  private updateDataObservable(appMode: AppMode, langKey: LangKey): Observable<boolean> {
    return of(this.isUpdatingSubject.next(true)).pipe(
      switchMap(() => this.getUpdatedData(appMode, langKey)),
      take(1),
      switchMap((data) => this.saveOfflineData(appMode, langKey, data)),
      switchMap((data) => of(this.saveUpdatedDataInMemory(appMode, langKey, data)).pipe((map(() => data)))),
      map(() => true),
      catchError((err) => {
        this.logger.warn('Could not update data', err, appMode, this.options);
        return of(false);
      }),
      tap(() => this.isUpdatingSubject.next(false)),
    );
  }
  private saveUpdatedDataInMemory(appMode: AppMode, langKey: LangKey, data: T) {
    const currentInMemoryData = this.inMemoryData.getValue();
    currentInMemoryData[appMode] = currentInMemoryData[appMode] || {};
    currentInMemoryData[appMode][langKey] = data;
    this.inMemoryData.next(currentInMemoryData);
  }

  private getInMemoryDataObservable(): Observable<T> {
    return this.appModeAndLanguage$
      .pipe(switchMap((appModeAndLanguage) =>
        this.getInMemoryDataForAppModeAndLanguage(appModeAndLanguage.appMode, appModeAndLanguage.langKey)));
  }

  private getInMemoryDataForAppModeAndLanguage(appMode: AppMode, langKey: LangKey) {
    return this.inMemoryData.pipe(map((imData) => {
      if (imData && imData[appMode] && imData[appMode][langKey]) {
        return imData[appMode][langKey];
      }
      return null;
    }), filter((data) => !!data)); // Skip submit when no data
  }

  public getOfflineData(appMode: AppMode, langKey: LangKey): Observable<OfflineSyncMeta<T>> {
    return from(this.offlineDbService.getOfflineRecords<OfflineSyncMeta<T>>(
      appMode,
      this.options.offlineTableName,
      this.options.offlineTableKeyname || 'id',
      (this.options.useLangKeyAsDbKey ? langKey : (this.options.offlineTableKey || 1))))
      .pipe(map((result) => result[0]), catchError((err) => {
        this.logger.warn('Could not read data from offline storage', err, appMode, this.options);
        return of(undefined);
      }));
  }

  public saveOfflineData(appMode: AppMode, langKey: LangKey, data: T): Observable<T> {
    const offlineDataWithMetaData: OfflineSyncMeta<T> = ({ id: langKey, lastUpdated: moment().unix(), data });
    return from(
      this.offlineDbService.saveOfflineRecords<OfflineSyncMeta<T>>(appMode, this.options.offlineTableName, offlineDataWithMetaData))
      .pipe(map(() => data), catchError((err) => {
        this.logger.warn('Could not save data to offline storage', err, appMode, this.options);
        return of(data);
      }));
  }

  ngOnDestroy(): void {
    this.ngDestroySubject.next();
    this.ngDestroySubject.complete();
  }
}
