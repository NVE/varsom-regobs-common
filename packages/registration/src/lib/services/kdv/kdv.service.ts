import { Injectable, OnDestroy } from '@angular/core';
import { AppMode, NSqlFullTableObservable, LanguageService, LangKey, getLangKeyString, LoggerService } from '@varsom-regobs-common/core';
import { combineLatest, of, Observable, BehaviorSubject, Subscription, from } from 'rxjs';
import { switchMap, shareReplay, map, tap, concatMap, withLatestFrom, filter, catchError, take, debounceTime } from 'rxjs/operators';
import { KdvElementsResponseDto, KdvElementsService, KdvElement } from '@varsom-regobs-common/regobs-api';
import { OfflineDbService } from '../offline-db/offline-db.service';
import { TABLE_NAMES } from '../../db/nSQL-db.config';
import moment from 'moment';
import { HttpClient } from '@angular/common/http';

export interface KdvDbElementsRow { langKey: LangKey; lastUpdated: number; kdvElements: KdvElementsResponseDto; }
const AUTO_UPDATE_KDV_ELEMENTS = true; // TODO: Add this to module config?
const AUTO_UPDATE_KDV_ELEMENTS_OUTDATED_HOURS = 48; // TODO: Add this to module config?
const KDV_ASSETS_FOLDER = '/assets/kdvelements'; // TODO: Add this to module config?

@Injectable({
  providedIn: 'root'
})
export class KdvService implements OnDestroy {
  private _kdvElements$: Observable<KdvDbElementsRow>;
  private _isUpdating$: BehaviorSubject<boolean> = new BehaviorSubject(false);
  private updateKdvElementsSubscription: Subscription;

  public get kdvElements$(): Observable<KdvElementsResponseDto> {
    return this._kdvElements$.pipe(map((val) => val.kdvElements));
  }

  public get isUpdating$(): Observable<boolean> {
    return this._isUpdating$.asObservable();
  }

  constructor(
    private offlineDbService: OfflineDbService,
    private kdvElementsService: KdvElementsService,
    private httpClient: HttpClient,
    private languageService: LanguageService,
    private logger: LoggerService
  ) {
    this._kdvElements$ = this.getKdvElementsObservable().pipe(shareReplay(1)); // This is a hot shared observable
    if (AUTO_UPDATE_KDV_ELEMENTS) {
      this.startAutoUpdate();
    }
  }

  public startAutoUpdate() {
    this.updateKdvElementsSubscription = this.getUpdateKdvElementsObservable().subscribe();
  }

  public updateKdvElements(force: boolean = false): Observable<any> {
    return this.getUpdateKdvElementsObservable(force).pipe(take(1));
  }

  public getKdvRepositoryByKeyObservable(key: string): Observable<KdvElement[]> {
    return this.kdvElements$.pipe(map((val) => val.KdvRepositories[key]));
  }

  public getViewRepositoryByKeyObservable(key: string) {
    return this.kdvElements$.pipe(map((val) => val.ViewRepositories[key]));
  }

  private getKdvElementsObservable(): Observable<KdvDbElementsRow> {
    return combineLatest([this.offlineDbService.appModeInitialized$, this.languageService.language$]).pipe(
      switchMap(([appMode, langKey]) => this.getKdvElementsObservableFromApModeAndLanguage(appMode, langKey)));
  }

  private getKdvElementsObservableFromApModeAndLanguage(appMode: AppMode, langKey: LangKey): Observable<KdvDbElementsRow> {
    return new NSqlFullTableObservable<KdvDbElementsRow[]>(
      this.offlineDbService.getDbInstance(appMode).selectTable(TABLE_NAMES.KDV_ELEMENTS).query('select')
        .where(['langKey', '=', langKey]).listen())
      .pipe(tap((val) => this.logger.log('Result from db: ', val)), concatMap((val: KdvDbElementsRow[]) =>
        val.length > 0 ? of(val[0]) : this.getFallbackKdvElements(langKey)));
  }

  private getFallbackKdvElements(langKey: LangKey): Observable<KdvDbElementsRow> {
    return this.httpClient.get<KdvElementsResponseDto>
      (`${KDV_ASSETS_FOLDER}/kdvelements.${getLangKeyString(langKey)}.json`)
      .pipe(catchError((err) => {
        this.logger.warn('KDV elements not found in assets/kdvelements folder', err);
        return of({
          KdvRepositories: {},
          ViewRepositories: {}
        });
      }), map((defaultKdvElements) => ({ langKey, lastUpdated: undefined, kdvElements: defaultKdvElements })));
  }

  private getUpdateKdvElementsObservable(force: boolean = false) {
    return this._kdvElements$.pipe(
      debounceTime(500),
      map((val) => ({ isOutDated: this.isOutdated(val), row: val })),
      filter((val) => this.filterRow(force, val.isOutDated)),
      map((val) => val.row),
      tap(() => this._isUpdating$.next(true)),
      concatMap((row) => this.kdvElementsService.KdvElementsGetKdvs({
        langkey: row.langKey,
      }).pipe(map((result) => ({ langkey: row.langKey, result })), catchError((err) => {
        this.logger.log('Could get kdv elements from regobs api', err);
        this._isUpdating$.next(false);
        return of(null);
      }))),
      filter((val) => !!val),
      withLatestFrom(this.offlineDbService.appModeInitialized$),
      concatMap(([result, appMode]) =>
        from(this.updateKdvElementsidDb(appMode, result.langkey, result.result))),
      catchError((err) => {
        this.logger.error('Could not update kdv elements', err);
        return of(null);
      }),
      tap(() => this._isUpdating$.next(false))
    );
  }

  public updateKdvElementsidDb(appMode: AppMode, langKey: LangKey, kdvElements: KdvElementsResponseDto) {
    const updatedRow: KdvDbElementsRow = {
      langKey,
      lastUpdated: moment().unix(),
      kdvElements
    };
    this.logger.log('Updating row in db: ', updatedRow, appMode);
    return this.offlineDbService
      .getDbInstance(appMode)
      .selectTable(TABLE_NAMES.KDV_ELEMENTS)
      .query('upsert', updatedRow).exec();
  }

  private filterRow(force: boolean, isOutDated: boolean) {
    const isUpdating = this._isUpdating$.value;
    const filterResult = force || (isOutDated && !isUpdating);
    if (filterResult) {
      this.logger.log('Filter is true, run update', force, isOutDated, isUpdating);
    } else {
      this.logger.log('Filter is false, skip update', force, isOutDated, isUpdating);
    }
    return filterResult;
  }

  private isOutdated(row: KdvDbElementsRow) {
    const outDated = row !== undefined && (
      row.lastUpdated === undefined ||
      moment.unix(row.lastUpdated).isBefore(this.getOutDatedTime()));
    if (outDated) {
      this.logger.warn('Kdv elements are outdated. Updating.', row);
    } else {
      this.logger.log('Kdv elements up to date!', row);
    }
    return outDated;
  }

  private getOutDatedTime() {
    return moment().subtract(AUTO_UPDATE_KDV_ELEMENTS_OUTDATED_HOURS, 'hours');
  }

  ngOnDestroy(): void {
    if (this.updateKdvElementsSubscription !== undefined) {
      this.updateKdvElementsSubscription.unsubscribe();
    }
  }
}
