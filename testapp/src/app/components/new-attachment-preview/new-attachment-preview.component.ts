import { Component, Input, OnInit } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { NewAttachmentService, AttachmentUploadEditModel } from '@varsom-regobs-common/registration';
import { map, switchMap, take, tap } from 'rxjs/operators';

@Component({
  selector: 'app-new-attachment-preview',
  templateUrl: './new-attachment-preview.component.html',
  styleUrls: ['./new-attachment-preview.component.css']
})
export class NewAttachmentPreviewComponent implements OnInit {

  @Input() id: string;

  newAttachments$: Observable<{ data: Blob; type: string; meta: AttachmentUploadEditModel}[]>;

  constructor(private newAttachmentService: NewAttachmentService) { }

  ngOnInit(): void {
    this.newAttachments$ = this.newAttachmentService.getUploadedAttachments(this.id).pipe(
      switchMap((attachments: AttachmentUploadEditModel[]) => forkJoin(attachments.map((a) => this.getAttacmentBlob(a)))),
      tap((att) => console.log('new attachments', att)));
  }

  private getAttacmentBlob(a: AttachmentUploadEditModel): Observable<{ data: Blob; type: string; meta: AttachmentUploadEditModel}> {
    return this.newAttachmentService.getBlob(this.id, a).pipe(take(1), map((data: Blob) => ({
      data,
      type: a.AttachmentMimeType,
      meta: a
    })));
  }

  deleteAttachment(attachmentId: string): void {
    this.newAttachmentService.removeAttachment(this.id, attachmentId);
  }
}
