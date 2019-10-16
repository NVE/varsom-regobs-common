import { Component } from '@angular/core';
import { RegistrationService } from '@varsom-regobs-common/registration';
import { Observable, of } from 'rxjs';
import { CreateRegistrationRequestDto } from '@varsom-regobs-common/regobs-api';

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

  constructor(private registrationService: RegistrationService) {
    this.title = of('Test-app!!');
    this.registrations = registrationService.RegistrationStorage;
  }
}
