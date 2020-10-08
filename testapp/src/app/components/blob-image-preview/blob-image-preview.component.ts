import { Component, Input, OnDestroy, OnInit,  } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-blob-image-preview',
  templateUrl: './blob-image-preview.component.html',
  styleUrls: ['./blob-image-preview.component.css']
})
export class BlobImagePreviewComponent implements OnInit, OnDestroy {

  @Input() imgBlob: Blob;

  imgSrc: SafeUrl;
  private blobUrl: string;

  constructor(private sanitizer: DomSanitizer) {

  }

  ngOnInit(): void {
    this.blobUrl = URL.createObjectURL(this.imgBlob);
    this.imgSrc = this.sanitizer.bypassSecurityTrustUrl(this.blobUrl);
  }

  ngOnDestroy(): void {
    if(this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
    }
  }
}
