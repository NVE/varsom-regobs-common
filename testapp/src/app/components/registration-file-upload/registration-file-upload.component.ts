import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-registration-file-upload',
  templateUrl: './registration-file-upload.component.html',
  styleUrls: ['./registration-file-upload.component.css']
})
export class RegistrationFileUploadComponent {

  @Output() fileChanged = new EventEmitter();

  onFileChanged(event: any): void {
    const file: File =  event.target.files[0];
    if (!file) {
      return;
    }
    const mimeType = file.type;
    if (mimeType.match(/image\/*/) == null) {
      return;
    }

    this.fileChanged.emit(file);
  }

}
