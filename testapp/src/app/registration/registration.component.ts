import { Component, OnInit } from '@angular/core';
import { IRegistrationSettings, SettingsService, RegistrationService, IRegistration, SyncProgress } from '@varsom-regobs-common/registration';
import { Observable, of } from 'rxjs';
import { AppMode, AppModeService, GeoHazard, LoggerService } from '@varsom-regobs-common/core';

@Component({
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.css']
})
export class RegistrationComponent implements OnInit {
  title$: Observable<string>;
  registrations$: Observable<IRegistration[]>;
  appMode: AppMode;
  settings: IRegistrationSettings;
  syncProgress$: Observable<SyncProgress>;

  constructor(
    private registrationService: RegistrationService,
    private appModeService: AppModeService,
    private settingsService: SettingsService,
    private loggerService: LoggerService
  ) {
  }

  ngOnInit(): void {
    this.title$ = of('Test-app!!');
    this.registrations$ = this.registrationService.registrationStorage$;
    this.appModeService.appMode$.subscribe((val) => {
      this.appMode = val;
    });
    this.settingsService.registrationSettings$.subscribe((settings) => {
      this.settings = settings;
    });
    this.syncProgress$ = this.registrationService.syncProgress$;
  }

  async addRegistration() {
    const draft = this.registrationService.createNewEmptyDraft(GeoHazard.Snow);
    // draft.request.Comment = this.appMode;
    const result = await this.registrationService.saveRegistration(draft).toPromise();
    this.loggerService.log('Added registration', result);
  }

  deleteRegistration(event: Event, id: string) {
    event.preventDefault();
    const result = this.registrationService.deleteRegistration(id).toPromise();
    this.loggerService.log('Deleted registration', result);
  }

  changeAppMode(appMode: AppMode) {
    this.appModeService.setAppMode(appMode);
  }

  saveSettings() {
    this.settingsService.saveSettings(this.settings).toPromise();
  }

  cancelSync(event: Event) {
    event.preventDefault();
    this.registrationService.cancelAndRestartSyncListener();
  }

}
