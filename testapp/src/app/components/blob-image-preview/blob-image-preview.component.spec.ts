import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlobImagePreviewComponent } from './blob-image-preview.component';

describe('BlobImagePreviewComponent', () => {
  let component: BlobImagePreviewComponent;
  let fixture: ComponentFixture<BlobImagePreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BlobImagePreviewComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BlobImagePreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
