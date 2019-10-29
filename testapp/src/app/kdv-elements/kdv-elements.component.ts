import { Component, OnInit } from '@angular/core';
import { AppModeService, AppMode } from '@varsom-regobs-common/core';
import { KdvService } from '@varsom-regobs-common/registration';
import { KdvElementsResponseDto } from '@varsom-regobs-common/regobs-api';

@Component({
  templateUrl: './kdv-elements.component.html',
  styleUrls: ['./kdv-elements.component.css']
})
export class KdvElementsComponent implements OnInit {

  constructor(public appModeService: AppModeService, public kdvService: KdvService) { }

  changeAppMode(appMode: AppMode) {
    this.appModeService.setAppMode(appMode);
  }

  getString(kdvElements: KdvElementsResponseDto) {
    return JSON.stringify(kdvElements);
  }

  ngOnInit() {
  }

}
