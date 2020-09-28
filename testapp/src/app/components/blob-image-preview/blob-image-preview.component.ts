import { Component, Input, OnDestroy, OnInit } from '@angular/core';

@Component({
  selector: 'app-blob-image-preview',
  templateUrl: './blob-image-preview.component.html',
  styleUrls: ['./blob-image-preview.component.css']
})
export class BlobImagePreviewComponent implements OnInit, OnDestroy {

  @Input() imgBlob: Blob;

  imgSrc: string;

  ngOnInit(): void {
    const reader = new FileReader();
    reader.readAsDataURL(this.imgBlob);
    reader.onload = () => {
      this.imgSrc = reader.result as string;
    };
  }

  ngOnDestroy(): void {
    if(this.imgSrc) {
      URL.revokeObjectURL(this.imgSrc);
    }
  }
}
