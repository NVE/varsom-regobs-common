import { Component, OnInit } from '@angular/core';
import { LanguageService } from '@varsom-regobs-common/core';

@Component({
  selector: 'app-language-select',
  templateUrl: './language-select.component.html',
  styleUrls: ['./language-select.component.css']
})
export class LanguageSelectComponent implements OnInit {

  constructor(public languageService: LanguageService) { }

  ngOnInit() {
  }

  getNumberValue(input: string) {
    return parseInt(input, 10);
  }

}
