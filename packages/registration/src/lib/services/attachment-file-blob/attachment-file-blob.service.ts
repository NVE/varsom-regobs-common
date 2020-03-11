import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AttachmentFileBlobService {

  public getAttachment(url: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'blob';
      xhr.onerror = ((err) => reject(err));
      xhr.onload = () => {
        if (xhr.status == 200) {
          resolve(xhr.response);
          // myBlob is now the blob that the object URL pointed to.
        }else{
          reject(new Error('Not found'));
        }
      };
      xhr.send();
    });
  }
}
