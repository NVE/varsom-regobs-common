import { Component, OnInit } from '@angular/core';
import { RegistrationService, IRegistration, ProgressService, RegistrationTid, ISyncProgress, NewAttachmentService } from '@varsom-regobs-common/registration';
import { Observable, of } from 'rxjs';
import { AppMode, AppModeService, GeoHazard, LoggerService } from '@varsom-regobs-common/core';
import { tap } from 'rxjs/operators';

@Component({
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.css']
})
export class RegistrationComponent implements OnInit {
  title$: Observable<string>;
  registrations$: Observable<IRegistration[]>;
  appMode$: Observable<AppMode>;
  syncProgress$: Observable<ISyncProgress>;

  constructor(
    private registrationService: RegistrationService,
    private appModeService: AppModeService,
    private loggerService: LoggerService,
    private progressService: ProgressService,
    private newAttachmentService: NewAttachmentService,
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
    this.syncProgress$ = this.progressService.registrationSyncProgress$;
  }

  async addRegistration(): Promise<void> {
    const draft = this.registrationService.createNewEmptyDraft(GeoHazard.Snow);
    // draft.request.Comment = this.appMode;
    // draft.syncStatus = SyncStatus.Sync;
    const result = await this.registrationService.saveRegistration(draft).toPromise();
    this.loggerService.log('Added registration', result);
  }

  async syncRegistration(event: Event, reg: IRegistration): Promise<void> {
    event.preventDefault();
    await this.registrationService.saveAndSync(reg).toPromise();
  }

  deleteRegistration(event: Event, id: string): void {
    event.preventDefault();
    const result = this.registrationService.deleteRegistration(id).toPromise();
    this.loggerService.log('Deleted registration', result);
  }

  async testSaveRegistration(event: Event, reg: IRegistration): Promise<void> {
    event.preventDefault();
    reg.request.GeneralObservation = {
      Comment: new Date().toISOString()
    };
    await this.registrationService.saveRegistration(reg, false).toPromise();
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

  async onFileChanged(reg: IRegistration, file: File): Promise<void> {
    this.newAttachmentService.addAttachment(
      reg.id,
      file,
      file.type,
      GeoHazard.Snow,
      RegistrationTid.GeneralObservation
    );
  }

}
