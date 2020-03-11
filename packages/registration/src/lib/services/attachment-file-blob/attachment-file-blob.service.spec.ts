import { TestBed } from '@angular/core/testing';

import { AttachmentFileBlobService } from './attachment-file-blob.service';

describe('AttachmentService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: AttachmentFileBlobService = TestBed.get(AttachmentFileBlobService);
    expect(service).toBeTruthy();
  });
});
