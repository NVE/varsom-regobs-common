import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewAttachmentPreviewComponent } from './new-attachment-preview.component';

describe('NewAttachmentPreviewComponent', () => {
  let component: NewAttachmentPreviewComponent;
  let fixture: ComponentFixture<NewAttachmentPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NewAttachmentPreviewComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NewAttachmentPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
