import { Component } from '@angular/core';
import { IRegistrationSettings, SettingsService, RegistrationService, IRegistration } from '@varsom-regobs-common/registration';
import { Observable, of } from 'rxjs';
import { AppMode, AppModeService } from '@varsom-regobs-common/core';

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
  }

  addRegistration() {
    this.registrationService.addRegistration({
      Id: null,
      GeoHazardTID: 10,
      DtObsTime: '',
      ObserverGuid: 'testuser',
      Comment: this.appMode
    }).subscribe();
  }

  deleteRegistration(id: string) {
    return this.registrationService.deleteRegistration(id).subscribe();
  }

  changeAppMode(appMode: AppMode) {
    this.appModeService.setAppMode(appMode);
  }

  saveSettings() {
    this.settingsService.saveSettings(this.settings);
  }
}
