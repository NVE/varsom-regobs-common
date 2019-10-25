import { Component } from '@angular/core';
import { IRegistrationSettings, SettingsService, RegistrationService, IRegistration, SyncProgress } from '@varsom-regobs-common/registration';
import { Observable, of } from 'rxjs';
import { AppMode, AppModeService, GeoHazard } from '@varsom-regobs-common/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  title$: Observable<string>;
  registrations$: Observable<IRegistration[]>;
  appMode: AppMode;
  settings: IRegistrationSettings;
  syncProgress$: Observable<SyncProgress>;

  constructor(
    private registrationService: RegistrationService,
    private appModeService: AppModeService,
    private settingsService: SettingsService) {

    this.title$ = of('Test-app!!');
    this.registrations$ = registrationService.registrationStorage$;
    this.appModeService.appMode$.subscribe((val) => {
      this.appMode = val;
    });
    settingsService.registrationSettings$.subscribe((settings) => {
      this.settings = settings;
    });
    this.syncProgress$ = registrationService.syncProgress$;
  }

  async addRegistration() {
    const draft = this.registrationService.createNewEmptyDraft(GeoHazard.Snow);
    draft.request.Comment = this.appMode;
    const result = await this.registrationService.saveRegistration(draft).toPromise();
    console.log('Added registration', result);
  }

  deleteRegistration(id: string) {
    const result = this.registrationService.deleteRegistration(id).toPromise();
    console.log('Deleted registration', result);
  }

  changeAppMode(appMode: AppMode) {
    this.appModeService.setAppMode(appMode);
  }

  saveSettings() {
    this.settingsService.saveSettings(this.settings).toPromise();
  }

  cancelSync() {
    this.registrationService.cancelAndRestartSyncListener();
  }
}
