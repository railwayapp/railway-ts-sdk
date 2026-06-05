export type EnvironmentConfig = {
  services?: Record<string, ServiceConfig | null>;
  sharedVariables?: VariableValues;
  volumes?: Record<string, VolumeConfig | null>;
  buckets?: Record<string, BucketConfig | null>;
  groups?: Record<string, GroupConfig | null>;
  privateNetworkDisabled?: boolean | null;
  degraded?: string[] | null;
  stopServices?: string[] | null;
};

export type ServiceConfig = {
  source?: ServiceSource | null;
  networking?: ServiceNetworking | null;
  variables?: VariableValues | null;
  build?: BuildConfig | null;
  deploy?: DeployConfig | null;
  configFile?: string | null;
  volumeMounts?: Record<string, VolumeMount | null> | null;
  isDeleted?: boolean | null;
  isCreated?: boolean | null;
  parentServiceId?: string | null;
  groupId?: string | null;
  clusterRole?: "root" | "replica" | "internal" | "edge" | null;
  replicaConfig?: {
    minReplicas?: number | null;
    maxReplicas?: number | null;
    step?: number | null;
    scalable?: boolean | null;
  } | null;
  clusterDisplay?: {
    badge?: string | null;
    badgeVariant?: "primary" | "secondary" | "muted" | null;
  } | null;
};

export type ServiceSource = {
  image?: string | null;
  repo?: string | null;
  branch?: string | null;
  commitSha?: string | null;
  upstreamUrl?: string | null;
  rootDirectory?: string | null;
  checkSuites?: boolean | null;
  autoUpdates?: {
    type?: "disabled" | "patch" | "minor" | null;
    schedule?: unknown;
    tagMode?: "semver" | "sha" | null;
  } | null;
};

export type ServiceNetworking = {
  serviceDomains?: Record<string, DomainConfig | null> | null;
  customDomains?: Record<string, DomainConfig | null> | null;
  tcpProxies?: Record<string, Record<string, never> | null> | null;
  privateNetworkEndpoint?: string | null;
};

export type DomainConfig = { port?: number | null };

export type VariableValues = Record<string, VariableConfig | null>;

export type VariableConfig = {
  description?: string | null;
  defaultValue?: string | null;
  isOptional?: boolean | null;
  isSealed?: boolean | null;
  value?: string | null;
  generator?: string | null;
  encryptedValue?: string | null;
  preserveExisting?: boolean | null;
};

export type BuildConfig = {
  builder?: "NIXPACKS" | "DOCKERFILE" | "RAILPACK" | "HEROKU" | "PAKETO" | null;
  watchPatterns?: string[] | null;
  buildCommand?: string | null;
  buildEnvironment?: "V2" | "V3" | null;
  dockerfilePath?: string | null;
  nixpacksConfigPath?: string | null;
  nixpacksPlan?: unknown;
  nixpacksVersion?: string | null;
  railpackVersion?: string | null;
};

export type DeployConfig = {
  startCommand?: string | null;
  preDeployCommand?: string[] | null;
  numReplicas?: number | null;
  healthcheckPath?: string | null;
  healthcheckTimeout?: number | null;
  sleepApplication?: boolean | null;
  runtime?: string | null;
  registryCredentials?: { username?: string; password?: string } | null;
  restartPolicyType?: "ON_FAILURE" | "ALWAYS" | "NEVER" | null;
  restartPolicyMaxRetries?: number | null;
  cronSchedule?: string | null;
  region?: string | null;
  multiRegionConfig?: Record<string, { numReplicas?: number | null; stackerAssignment?: string | null } | null> | null;
  limitOverride?: {
    containers?: { cpu?: number | null; memoryBytes?: number | null; diskBytes?: number | null } | null;
  } | null;
  requiredMountPath?: string | null;
  overlapSeconds?: number | null;
  drainingSeconds?: number | null;
  useLegacyStacker?: boolean | null;
  ipv6EgressEnabled?: boolean | null;
};

export type VolumeMount = {
  mountPath?: string | null;
  backupSchedules?: Array<"DAILY" | "WEEKLY" | "MONTHLY"> | null;
};

export type VolumeConfig = {
  sizeMB?: number | null;
  region?: string | null;
  alerts?: { usage?: Record<string, Record<string, never> | null> | null } | null;
  isDeleted?: boolean | null;
  isCreated?: boolean | null;
  allowOnlineResize?: boolean | null;
  forkFromBaseEnvironment?: boolean | null;
};

export type BucketConfig = {
  region?: string | null;
  isDeleted?: boolean | null;
  isCreated?: boolean | null;
};

export type GroupConfig = {
  name?: string | null;
  color?: string | null;
  icon?: string | null;
  isCollapsed?: boolean | null;
  isDeleted?: boolean | null;
  isCreated?: boolean | null;
};
