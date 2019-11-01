import {
    AvalancheActivityObsDto,
    AvalancheActivityObs2Dto,
    AvalancheDangerObsDto,
    AvalancheEvalProblem2Dto,
    AvalancheEvaluation3Dto,
    AvalancheObsDto,
    CompressionTestDto,
    DangerObsDto,
    GeneralObservationEditModel,
    IceCoverObsDto,
    IceThicknessDto,
    IncidentDto,
    LandSlideObsDto,
    ObsLocationDto,
    PictureRequestDto,
    SnowCoverObsDto,
    SnowProfileDto,
    SnowSurfaceObservationDto,
    WaterLevelDto,
    WeatherObservationDto,
    WaterLevel2Dto,
    DamageObsDto,
    DensityProfileDto,

} from '@varsom-regobs-common/regobs-api';

export type ValidRegistrationType =
    Array<AvalancheActivityObsDto> |
    Array<AvalancheActivityObs2Dto> |
    Array<AvalancheDangerObsDto> |
    Array<AvalancheEvalProblem2Dto> |
    AvalancheEvaluation3Dto |
    AvalancheObsDto |
    Array<CompressionTestDto> |
    Array<DangerObsDto> |
    GeneralObservationEditModel |
    IceCoverObsDto |
    IceThicknessDto |
    IncidentDto |
    LandSlideObsDto |
    ObsLocationDto |
    Array<PictureRequestDto> |
    SnowCoverObsDto |
    SnowProfileDto |
    SnowSurfaceObservationDto |
    WaterLevelDto |
    WeatherObservationDto |
    WaterLevel2Dto |
    Array<DamageObsDto> |
    DensityProfileDto;
