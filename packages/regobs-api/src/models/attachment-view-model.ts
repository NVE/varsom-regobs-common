/* tslint:disable */
export interface AttachmentViewModel {
  Copyright?: string;
  AttachmentId?: number;
  RegistrationName?: string;
  UrlFormats?: {Raw?: string, Original?: string, Thumbnail?: string, Large?: string, Medium?: string};
  Url?: string;
  Photographer?: string;
  GeoHazardName?: string;
  Aspect?: number;
  GeoHazardTID?: number;
  RegistrationTID?: number;
  Comment?: string;
  AttachmentMimeType?: string;
  IsMainAttachment?: boolean;
}
