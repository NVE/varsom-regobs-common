import { IRegistration, RegistrationTid } from '../../../registration.models';
import { RegObsGenericValue, GeneralObservationEditModel, Summary } from '@varsom-regobs-common/regobs-api';
import { BaseSummaryProvider } from '../base.summary-provider';
import { Observable, combineLatest } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { KdvService } from '../../kdv/kdv.service';
import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class GeneralObservationSummaryProvider extends BaseSummaryProvider {
  readonly registrationTid = RegistrationTid.GeneralObservation;

  constructor(public translateService: TranslateService, public kdvService: KdvService) {
    super(translateService, kdvService);
  }

  generateTypeSpesificSummaries(_reg: IRegistration,
    _registrationTid: RegistrationTid,
    _registrationName: string,
    registrationItem: GeneralObservationEditModel,
    summary: Summary): Observable<Summary> {
    return this.generateGeneralObservationSummaries(registrationItem).pipe(map((result) => ({ ...summary, Summaries: result })));
  }

  generateGeneralObservationSummaries(generalObs: GeneralObservationEditModel): Observable<RegObsGenericValue[]> {
    const summaries: Observable<RegObsGenericValue>[] = [];
    if(generalObs) {
      if (generalObs.ObsComment) {
        summaries.push(this.getTextSummary('Observations.GeneralObservation.Comment', generalObs.ObsComment));
      }
      if (generalObs.Comment) {
        summaries.push(this.getTextSummary('Observations.GeneralObservation.Comment', generalObs.Comment));
      }
      if (generalObs.ObsHeader) {
        summaries.push(this.getTextSummary('Observations.GeneralObservation.ObsHeader', generalObs.ObsHeader));
      }
      if (generalObs.Urls && generalObs.Urls.length > 0) {
        summaries.push(this.getUrlSummary(generalObs.Urls));
      }
    }
    return combineLatest(summaries);
  }
}
