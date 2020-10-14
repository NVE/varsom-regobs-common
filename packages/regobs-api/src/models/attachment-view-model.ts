/* tslint:disable */
export interface AttachmentViewModel {
  AttachmentId?: number;
  GeoHazardName?: string;
  RegistrationName?: string;
  UrlFormats?: {Raw?: string, Original?: string, Thumbnail?: string, Large?: string, Medium?: string};
  Url?: string;
  Photographer?: string;
  Copyright?: string;
  Aspect?: number;
  GeoHazardTID?: number;
  RegistrationTID?: number;
  Comment?: string;
  AttachmentMimeType?: string;
  IsMainAttachment?: boolean;
}
