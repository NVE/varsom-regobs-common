import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { RegistrationModule } from '@varsom-regobs-common/registration';
import { CoreModule } from '@varsom-regobs-common/core';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    CoreModule,
    RegistrationModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
