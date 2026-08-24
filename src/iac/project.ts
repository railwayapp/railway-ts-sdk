// Name maps filled in by generated railway-env.d.ts files (declaration
// merging via `declare module "railway/iac"`). Keeping them here means
// previously generated typegen output continues to typecheck.
export interface RailwayIacServiceMap {}
export interface RailwayIacDatabaseMap {}
export interface RailwayIacBucketMap {}
export interface RailwayIacVolumeMap {}
export interface RailwayIacResourceMap {}

type KnownName<T> = [keyof T] extends [never] ? string : Extract<keyof T, string>;

export type RailwayServiceName = KnownName<RailwayIacServiceMap>;
export type RailwayDatabaseName = KnownName<RailwayIacDatabaseMap>;
export type RailwayBucketName = KnownName<RailwayIacBucketMap>;
export type RailwayVolumeName = KnownName<RailwayIacVolumeMap>;
export type RailwayResourceName = KnownName<RailwayIacResourceMap>;
