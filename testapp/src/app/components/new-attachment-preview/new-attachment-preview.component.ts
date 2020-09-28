import { Component, Input, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { AttachmentMeta, RegistrationService } from '@varsom-regobs-common/registration';
import { tap } from 'rxjs/operators';

@Component({
  selector: 'app-new-attachment-preview',
  templateUrl: './new-attachment-preview.component.html',
  styleUrls: ['./new-attachment-preview.component.css']
})
export class NewAttachmentPreviewComponent implements OnInit {

  @Input() id: string;

  newAttachments$: Observable<{data: Blob, type: string, meta: AttachmentMeta}[]>;

  constructor(private registrationService: RegistrationService) { }

  ngOnInit(): void {
    this.newAttachments$ = this.registrationService.getNewAttachments(this.id).pipe(tap((att) =>
      console.log('new attachments', att)));
  }
}
