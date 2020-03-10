import { Summary, UrlViewModel, RegObsGenericValue } from '@varsom-regobs-common/regobs-api';
import { RegistrationTid, IRegistration } from '../../registration.models';
import { TranslateService } from '@ngx-translate/core';
import { UrlSummary } from '../../models/summary/url-summary';
import { Observable, combineLatest, } from 'rxjs';
import { map, take, switchMap } from 'rxjs/operators';
import { SummaryKind } from '../../models/summary/summary-kind.enum';
import { KdvService } from '../kdv/kdv.service';
import { TextSummary } from '../../models/summary/text-summary';
import { ISummaryProvider } from './summary-provider.interface';
import { isArrayType } from '../../registration.helpers';
import { getRegistationProperty } from '../../helpers/registration.helper';

export abstract class BaseSummaryProvider implements ISummaryProvider {
  abstract registrationTid: RegistrationTid;
  abstract generateTypeSpesificSummaries(reg: IRegistration, registrationTid: RegistrationTid, registrationName: string, registrationItem: unknown, summary: Summary): Observable<Summary>;

  constructor(public translateService: TranslateService, public kdvService: KdvService) {
  }

  generateSummary(reg: IRegistration): Observable<Summary[]> {
    return this.getRegistrationName().pipe(switchMap((registrationName) => combineLatest(this.generateSummaryForType(reg, this.registrationTid, registrationName))));
  }

  private generateSummaryForType(reg: IRegistration, registrationTid: RegistrationTid, registrationName: string): Observable<Summary>[] {
    const registrationProp = getRegistationProperty(reg, registrationTid);
    if(isArrayType(registrationTid)) {
      return ((registrationProp as Array<unknown>) || []).map((registrationItem) =>
        this.generateTypeSpesificSummaries(reg, registrationTid, registrationName, registrationItem, this.createSummary(registrationTid, registrationName)));
    }
    return [this.generateTypeSpesificSummaries(reg, registrationTid, registrationName, registrationProp, this.createSummary(registrationTid, registrationName))];
  }

  private createSummary(registrationTid: RegistrationTid, registrationName: string): Summary {
    return {
      RegistrationTID: registrationTid,
      RegistrationName: registrationName,
      Summaries: [],
    };
  }

  public getRegistrationName() {
    return this.kdvService.getKdvRepositoryByKeyObservable('RegistrationKDV').pipe(take(1), map((registrationKdvs) => {
      const registrationName = (registrationKdvs || [])
        .find((x) => x.Id === this.registrationTid);
      return registrationName ? registrationName.Name : '';
    }));
  }

  getUrlSummary(urls: Array<UrlViewModel>): Observable<RegObsGenericValue> {
    const translationKey = 'Observations.GeneralObservation.Urls';
    return this.translateService.get([translationKey]).pipe(map((translations) => ({
      Kind: SummaryKind.List,
      KindType: 'List',
      Header: translations[translationKey],
      Value: urls.map((url) => new UrlSummary(url.UrlDescription || url.UrlLine, url.UrlLine)),
    })));
  }

  getTextSummary(headerTranslationKey: string, value: string): Observable<TextSummary> {
    return this.translateService.get([headerTranslationKey]).pipe(
      map((translations) => new TextSummary(
        translations[headerTranslationKey], value
      )));
  }
}
