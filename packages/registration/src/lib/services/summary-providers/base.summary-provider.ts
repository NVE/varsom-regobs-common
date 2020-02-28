import { Summary, UrlViewModel, RegObsGenericValue } from '@varsom-regobs-common/regobs-api';
import { RegistrationTid, IRegistration } from '../../registration.models';
import { TranslateService } from '@ngx-translate/core';
import { UrlSummary } from '../../models/summary/url-summary';
import { Observable, } from 'rxjs';
import { map, concatMap } from 'rxjs/operators';
import { SummaryKind } from '../../models/summary/summary-kind.enum';
import { KdvService } from '../kdv/kdv.service';
import { TextSummary } from '../../models/summary/text-summary';
import { ISummaryProvider } from './summary-provider.interface';

export abstract class BaseSummaryProvider implements ISummaryProvider {
  abstract registrationTid: RegistrationTid;
  abstract generateTypeSpesificSummaries(reg: IRegistration): Observable<RegObsGenericValue[]>;

  constructor(public translateService: TranslateService, public kdvService: KdvService) {
  }

  generateSummary(reg: IRegistration): Observable<Summary> {
    return this.kdvService.getKdvRepositoryByKeyObservable('RegistrationKDV').pipe(map((registrationKdvs) => {
      const registrationName = (registrationKdvs || [])
        .find((x) => x.Id === this.registrationTid);
      return ({
        RegistrationTID: this.registrationTid,
        RegistrationName: registrationName ? registrationName.Name : '',
        Summaries: [],
      });
    }),
    concatMap((summary: Summary) => this.generateTypeSpesificSummaries(reg)
      .pipe(map((summaries) => {
        const clone = { ...summary };
        clone.Summaries = clone.Summaries || [];
        clone.Summaries.push(...summaries);
        return clone;
      }))
    ));
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
