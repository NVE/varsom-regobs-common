import { ChangeDetectorRef, NgZone } from '@angular/core';

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { enterZone, markForCheck, enterZoneAndmarkForCheck } from '../../helpers';

@Injectable({
  providedIn: 'root'
})
export class ObservableHelperService {

  constructor(private ngZone: NgZone, private cdr: ChangeDetectorRef) {
  }

  enterZone<T>(): (source: Observable<T>) => Observable<T> {
    return enterZone(this.ngZone);
  }

  markForCheck<T>(): (source: Observable<T>) => Observable<T> {
    return markForCheck(this.cdr);
  }

  enterZoneAndMarkForCheck<T>(): (source: Observable<T>) => Observable<T> {
    return enterZoneAndmarkForCheck(this.ngZone, this.cdr);
  }

}
