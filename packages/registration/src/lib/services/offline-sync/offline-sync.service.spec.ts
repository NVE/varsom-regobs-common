import { TestBed } from '@angular/core/testing';

import { OfflineSyncService } from './offline-sync.service';

describe('OfflineSyncService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: OfflineSyncService<any> = TestBed.get(OfflineSyncService);
    expect(service).toBeTruthy();
  });
});
