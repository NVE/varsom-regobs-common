import { ChangeDetectorRef, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { enterZone } from '../helpers';
import { markForCheck } from './mark-for-check';

export function enterZoneAndmarkForCheck<T>(ngZone: NgZone, cdr: ChangeDetectorRef): (source: Observable<T>) => Observable<T> {
  return (source: Observable<T>) => source.pipe(enterZone(ngZone), markForCheck(cdr));
}
