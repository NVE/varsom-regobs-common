import { Injectable } from '@angular/core';
import { AppMode, LanguageService, LangKey, getLangKeyString, LoggerService } from '@varsom-regobs-common/core';
import { of, Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { KdvElementsResponseDto, KdvElementsService, KdvElement } from '@varsom-regobs-common/regobs-api';
import { OfflineDbService } from '../offline-db/offline-db.service';
import { TABLE_NAMES } from '../../db/nSQL-db.config';
import { HttpClient } from '@angular/common/http';
import { KdvKey } from '../../models/kdv-key.type';
import { ApiSyncOfflineBaseService } from '../api-sync-offline-base/api-sync-offline-base.service';
import { KdvViewRepositoryKey } from '../../models/view-repository-key.type';

const KDV_ASSETS_FOLDER = '/assets/kdvelements'; // TODO: Add this to module config?
const VALID_KDV_ELEMENTS_SECONDS = 604800; // 7 days

@Injectable({
  providedIn: 'root'
})
export class KdvService extends ApiSyncOfflineBaseService<KdvElementsResponseDto> {

  constructor(protected offlineDbService: OfflineDbService,
    protected languageService: LanguageService,
    protected logger: LoggerService,
    private kdvElementsService: KdvElementsService,
    private httpClient: HttpClient) {
    super({
      offlineTableName: TABLE_NAMES.KDV_ELEMENTS,
      useLangKeyAsDbKey: true,
      validSeconds: VALID_KDV_ELEMENTS_SECONDS
    }, offlineDbService, languageService, logger);
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

  public getKdvRepositoryByKeyObservable(key: KdvKey): Observable<KdvElement[]> {
    return this.data$.pipe(map((val) => val.KdvRepositories[key]));
  }

  public getViewRepositoryByKeyObservable(key: KdvViewRepositoryKey) {
    return this.data$.pipe(map((val) => val.ViewRepositories[key]));
  }
}
