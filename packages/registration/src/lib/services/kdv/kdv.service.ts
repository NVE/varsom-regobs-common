import { Injectable, OnDestroy } from '@angular/core';
import { AppModeService, AppMode, NSqlFullTableObservable, LanguageService, LangKey, getLangKeyString } from '@varsom-regobs-common/core';
import { combineLatest, of, Observable, BehaviorSubject, Subscription, from } from 'rxjs';
import { switchMap, shareReplay, map, tap, concatMap, withLatestFrom, filter, catchError, take } from 'rxjs/operators';
import { KdvElementsResponseDto, KdvElementsService } from '@varsom-regobs-common/regobs-api';
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
    private languageService: LanguageService) {
    this._kdvElements$ = this.getKdvElementsObservable().pipe(shareReplay(1)); // This is a hot shared observable
    if (AUTO_UPDATE_KDV_ELEMENTS) {
      this.startAutoUpdate();
    }
  }

  public startAutoUpdate() {
    this.updateKdvElementsSubscription = this.getUpdateKdvElementsObservable().subscribe();
  }

  public updateKdvElements(force: boolean = false): Observable<any> {
    return this.getUpdateKdvElementsObservable().pipe(take(1));
  }


  private getKdvElementsObservable(): Observable<KdvDbElementsRow> {
    return combineLatest([this.offlineDbService.appModeInitialized$, this.languageService.language$]).pipe(
      switchMap(([appMode, langKey]) => this.getKdvElementsObservableFromApModeAndLanguage(appMode, langKey)));
  }

  private getKdvElementsObservableFromApModeAndLanguage(appMode: AppMode, langKey: LangKey): Observable<KdvDbElementsRow> {
    return new NSqlFullTableObservable<KdvDbElementsRow[]>(
      this.offlineDbService.getDbInstance(appMode).selectTable(TABLE_NAMES.KDV_ELEMENTS).query('select')
        .where(['langKey', '=', langKey]).listen())
      .pipe(concatMap((val: KdvDbElementsRow[]) =>
        val.length > 0 ? of(val[0]) : this.getFallbackKdvElements(langKey)));
  }

  private getFallbackKdvElements(langKey: LangKey): Observable<KdvDbElementsRow> {
    return this.httpClient.get<KdvElementsResponseDto>
      (`${KDV_ASSETS_FOLDER}/kdvelements.${getLangKeyString(langKey)}.json`)
      .pipe(catchError((err) => {
        console.warn('KDV elements not found in assets/kdvelements folder');
        return of({
          KdvRepositories: {},
          ViewRepositories: {}
        });
      }), map((defaultKdvElements) => ({ langKey, lastUpdated: undefined, kdvElements: defaultKdvElements })));
  }

  private getUpdateKdvElementsObservable(force: boolean = false) {
    return this._kdvElements$.pipe(
      map((val) => ({ isOutDated: this.isOutdated(val), row: val })),
      filter((val) => force || (val.isOutDated && !this._isUpdating$.value)),
      map((val) => val.row),
      tap(() => this._isUpdating$.next(true)),
      concatMap((row) => this.kdvElementsService.KdvElementsGetKdvs({
        langkey: row.langKey,
      }).pipe(map((result) => ({ langkey: row.langKey, result })), catchError((err) => {
        console.log('Could get kdv elements from regobs api', err);
        this._isUpdating$.next(false);
        return of(null);
      }))),
      filter((row) => !!row),
      withLatestFrom(this.offlineDbService.appModeInitialized$),
      concatMap(([result, appMode]) =>
        from(this.updateKdvElementsidDb(appMode, result.langkey, result.result))),
      catchError((err) => {
        console.log('Could not update kdv elements', err);
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
    return this.offlineDbService
      .getDbInstance(appMode)
      .selectTable(TABLE_NAMES.KDV_ELEMENTS)
      .query('upsert', updatedRow).exec();
  }

  private isOutdated(row: KdvDbElementsRow) {
    console.log('Check if kdv is outdated:', row);
    return row !== undefined && (
      row.lastUpdated === undefined ||
      moment.unix(row.lastUpdated).isBefore(this.getOutDatedTime()));
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
