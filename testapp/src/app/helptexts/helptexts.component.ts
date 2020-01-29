import { Component, OnInit } from '@angular/core';
import { AppModeService, AppMode } from '@varsom-regobs-common/core';
import { HelpTextService } from '@varsom-regobs-common/registration';
import { HelptextDto } from '@varsom-regobs-common/regobs-api';

@Component({
  templateUrl: './helptexts.component.html',
  styleUrls: ['./helptexts.component.css']
})
export class HelptextsComponent implements OnInit {

  constructor(public appModeService: AppModeService, public helpTextService: HelpTextService) { }

  changeAppMode(appMode: AppMode) {
    this.appModeService.setAppMode(appMode);
  }

  getString(helpTexts: HelptextDto[]) {
    return JSON.stringify(helpTexts);
  }

  ngOnInit() {
  }

}
