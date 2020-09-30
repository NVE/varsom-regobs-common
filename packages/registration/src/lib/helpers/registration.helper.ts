import { RegistrationTid } from '../models/registration-tid.enum';
import { IRegistration } from '../models/registration.interface';
import { isEmpty } from '@varsom-regobs-common/core';
import { ValidRegistrationType } from '../models/valid-registration.type';
import { AttachmentEditModel, AttachmentViewModel, RegistrationEditModel, RegistrationViewModel } from '@varsom-regobs-common/regobs-api';
import { SyncStatus } from '../registration.models';

export function getAttachments(reg: IRegistration, registrationTid?: RegistrationTid):  AttachmentEditModel[] {
  if(!reg) {
    return [];
  }
  if(reg.syncStatus === SyncStatus.InSync && reg.response) {
    this.getAttachmentsFromRegistrationViewModel(reg.response, registrationTid);
  }
  return this.getAttachmentsFromRegistrationViewModel(reg.request, registrationTid);
}

export function getAttachmentsFromRegistrationViewModel(viewModel: RegistrationEditModel | RegistrationViewModel, registrationTid?: RegistrationTid): AttachmentViewModel[] {
  if(!viewModel || !viewModel.Attachments) {
    return [];
  }
  return (viewModel.Attachments as AttachmentViewModel[]).filter((a) => ((registrationTid > 0) ? a.RegistrationTID === registrationTid : true));
}

export function getDamageObsAttachments(reg: IRegistration):  AttachmentEditModel[] {
  if(!reg || !reg.request || !reg.request.DamageObs) {
    return [];
  }
  return [].concat(...reg.request.DamageObs.map((item) => item.Attachments || []));
}

export function getWaterLevelAttachments(reg: IRegistration):  AttachmentEditModel[] {
  if(!reg || !reg.request || !reg.request.WaterLevel2 || !reg.request.WaterLevel2.WaterLevelMeasurement) {
    return [];
  }
  return [].concat(...reg.request.WaterLevel2.WaterLevelMeasurement.map((item) => item.Attachments || []));
}

export function getAllAttachments(reg: IRegistration):  AttachmentEditModel[] {
  const attachments = getAttachments(reg);
  const damageObsAttachments = getDamageObsAttachments(reg);
  const waterLevelAttachmetns = getWaterLevelAttachments(reg);
  return  [].concat(...attachments, ...damageObsAttachments, ...waterLevelAttachmetns);
}

// export function getAllAttachmentsToUpload(item: IRegistration) {
//   return getAllAttachments(item).map(a => a as AttachmentUploadEditModel).filter((a) => !!a.fileUrl && !a.AttachmentUploadId); // Has file url but not attachment upload id
// }

export function getPropertyName(registrationTid: RegistrationTid): string {
  return RegistrationTid[registrationTid];
}

export function getRegistationProperty(reg: IRegistration, registrationTid: RegistrationTid): ValidRegistrationType {
  if (reg && reg.request && registrationTid) {
    return reg.request[getPropertyName(registrationTid)];
  }
  return null;
}

export function getRegistrationTids(): RegistrationTid[] {
  return Object.keys(RegistrationTid)
    .map((key) => RegistrationTid[key]).filter((val: RegistrationTid) => typeof (val) !== 'string');
}

export function hasAnyAttachments(reg: IRegistration, registrationTid: RegistrationTid): boolean {
  return getAttachments(reg, registrationTid).length > 0;
}

export function isObservationEmptyForRegistrationTid(reg: IRegistration, registrationTid: RegistrationTid): boolean {
  if (reg && registrationTid) {
    let hasRegistration = !isEmpty(getRegistationProperty(reg, registrationTid));
    // Hack to snow profile tests
    if(
      !hasRegistration &&
      registrationTid === RegistrationTid.SnowProfile2 &&
      reg.request &&
      reg.request.CompressionTest &&
      reg.request.CompressionTest.some(t => t.IncludeInSnowProfile)
    ) {
      hasRegistration = true;
    }
    const hasAttachments = hasAnyAttachments(reg, registrationTid);
    if (hasRegistration || hasAttachments) {
      return false;
    }
  }
  return true;
}

export function hasAnyObservations(reg: IRegistration): boolean {
  if (reg === undefined || reg === null) {
    return false;
  }
  const registrationTids = getRegistrationTids();
  return registrationTids.some((x) => !isObservationEmptyForRegistrationTid(reg, x));
}

export function isArrayType(tid: RegistrationTid): boolean {
  return [
    RegistrationTid.AvalancheActivityObs,
    RegistrationTid.AvalancheActivityObs2,
    RegistrationTid.AvalancheDangerObs,
    RegistrationTid.AvalancheEvalProblem2,
    RegistrationTid.CompressionTest,
    RegistrationTid.DangerObs,
    RegistrationTid.Picture,
    RegistrationTid.DamageObs
  ].indexOf(tid) >= 0;
}

// export function getRegistrationTidsForGeoHazard(geoHazard: GeoHazard): RegistrationTid[] {
//   const goHazardTids = new Map<GeoHazard, Array<RegistrationTid>>([
//     [GeoHazard.Snow, [
//       RegistrationTid.DangerObs,
//       RegistrationTid.AvalancheObs,
//       RegistrationTid.AvalancheActivityObs2,
//       RegistrationTid.WeatherObservation,
//       RegistrationTid.SnowSurfaceObservation,
//       RegistrationTid.CompressionTest,
//       RegistrationTid.SnowProfile2,
//       RegistrationTid.AvalancheEvalProblem2,
//       RegistrationTid.AvalancheEvaluation3
//     ]],
//     [GeoHazard.Ice, [RegistrationTid.IceCoverObs, RegistrationTid.IceThickness, RegistrationTid.DangerObs, RegistrationTid.Incident]],
//     [GeoHazard.Water, [RegistrationTid.WaterLevel2, RegistrationTid.DamageObs]],
//     [GeoHazard.Soil, [RegistrationTid.DangerObs, RegistrationTid.LandSlideObs]]
//   ]);
//   const generalObs = [RegistrationTid.GeneralObservation];
//   return goHazardTids.get(geoHazard).concat(generalObs);
// }

export function getOrCreateNewRegistrationForm(reg: IRegistration, tid: RegistrationTid): ValidRegistrationType {
  if (isObservationEmptyForRegistrationTid(reg, tid)) {
    return isArrayType(tid) ? [] : {};
  }
  return getRegistationProperty(reg, tid);
}

