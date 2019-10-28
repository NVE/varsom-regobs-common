import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { RegistrationModule } from '@varsom-regobs-common/registration';
import { CoreModule } from '@varsom-regobs-common/core';
import { FormsModule } from '@angular/forms';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    CoreModule,
    RegistrationModule.forRoot({ useFakeSyncService: true }),
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
