import { Component } from '@angular/core';
import { RegistrationService } from '@varsom-regobs-common/registration';
import { Observable, of } from 'rxjs';
import { CreateRegistrationRequestDto } from '@varsom-regobs-common/regobs-api';
import { switchMap } from 'rxjs/operators';
import { AppMode, AppModeService } from '@varsom-regobs-common/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  title: Observable<string>;
  registrations: Observable<{
    id: string;
    reg: CreateRegistrationRequestDto;
  }[]>;
  appMode: AppMode;

  constructor(private registrationService: RegistrationService, private appModeService: AppModeService) {
    this.title = of('Test-app!!');
    this.registrations = registrationService.registrationStorage$;
    this.appModeService.appMode$.subscribe((val) => {
      this.appMode = val;
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
}
