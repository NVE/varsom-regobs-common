import { Component, OnInit } from '@angular/core';
import { RegistrationService, IRegistration, SyncProgress, ProgressService, RegistrationTid } from '@varsom-regobs-common/registration';
import { from, Observable, of } from 'rxjs';
import { AppMode, AppModeService, GeoHazard, LoggerService } from '@varsom-regobs-common/core';
import { switchMap, tap } from 'rxjs/operators';

@Component({
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.css']
})
export class RegistrationComponent implements OnInit {
  title$: Observable<string>;
  registrations$: Observable<IRegistration[]>;
  appMode$: Observable<AppMode>;
  // settings: IRegistrationSettings;
  syncProgress$: Observable<SyncProgress>;

  constructor(
    private registrationService: RegistrationService,
    private appModeService: AppModeService,
    // private settingsService: SettingsService,
    private loggerService: LoggerService,
    private progressService: ProgressService
  ) {
  }

  ngOnInit(): void {
    this.title$ = of('Test-app!!');
    this.registrations$ = this.registrationService.registrationStorage$.pipe(tap((registrations) => {
      this.loggerService.debug('Registration storage changed!', registrations);
    }));
    this.appMode$ = this.appModeService.appMode$;
    // this.settingsService.registrationSettings$.subscribe((settings) => {
    //   this.settings = settings;
    // });
    this.syncProgress$ = this.progressService.syncProgress$;
  }

  async addRegistration(): Promise<void> {
    const draft = this.registrationService.createNewEmptyDraft(GeoHazard.Snow);
    // draft.request.Comment = this.appMode;
    const result = await this.registrationService.saveRegistration(draft).toPromise();
    this.loggerService.log('Added registration', result);
  }

  deleteRegistration(event: Event, id: string): void {
    event.preventDefault();
    const result = this.registrationService.deleteRegistration(id).toPromise();
    this.loggerService.log('Deleted registration', result);
  }

  changeAppMode(appMode: AppMode): void {
    this.appModeService.setAppMode(appMode);
  }

  // saveSettings() {
  //   this.settingsService.saveSettings(this.settings).toPromise();
  // }

  cancelSync(event: Event): void {
    event.preventDefault();
    this.registrationService.cancelSync();
  }

  onFileChanged(reg: IRegistration, file: File): void {
    from(file.arrayBuffer()).pipe(switchMap((data) =>
      this.registrationService.addAttachment(
        reg.id,
        GeoHazard.Snow,
        RegistrationTid.GeneralObservation,
        data,
        file.type
      ))).subscribe();
  }

}
