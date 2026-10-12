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
  tracing?: ServiceTracing | null;
  cdn?: ServiceCdn | null;
};

/**
 * Tracing for the service in this environment. Railway serialises only the
 * switches that are on, so an omitted key, `false` and `null` all mean off
 * and none of them plans as drift.
 */
export type ServiceTracing = {
  /** Trace requests to the service: the edge records a span per client-facing request and the next deploy provides the OpenTelemetry exporter variables. */
  enabled?: boolean | null;
  /** Instrument the service's processes with eBPF (OBI) for supported runtimes, no code changes. Only takes effect while `enabled` is true. */
  autoInstrumentation?: boolean | null;
};

/**
 * CDN caching for the service's public domains in this environment. Settings
 * live on the edge and apply without a deploy. Railway serialises the block
 * only while caching is on, and only the knobs that differ from the defaults,
 * so an omitted key, `{ enabled: false }` and `null` all mean off and
 * `{ enabled: true }` is a service caching with the defaults.
 */
export type ServiceCdn = {
  /** Cache responses from the service's public domains at Railway's edge. Needs a public domain; cannot be combined with Railway Authentication. */
  enabled?: boolean | null;
  /** How long the edge keeps a cacheable response without `Cache-Control` headers of its own, in seconds. Defaults to 7200. */
  defaultTtlSeconds?: number | null;
  /** Whether HTML documents are cached: `auto` follows the response headers, `force` caches them regardless, `never` leaves them uncached. Defaults to `auto`. */
  htmlCaching?: "auto" | "force" | "never" | null;
  /** Honour `stale-while-revalidate` `Cache-Control` directives, serving a stale copy while the edge refreshes it. Defaults to true. */
  staleWhileRevalidate?: boolean | null;
  /** What a successful deploy purges from the cache: `html` keeps immutable assets warm, `all` clears everything, `off` purges nothing. Defaults to `html`. */
  purgeOnDeploy?: "off" | "html" | "all" | null;
};

/**
 * One weekly UTC window in which scheduled image auto-updates may run.
 * Bounds match backboard's schedule schema: `day` is 0 (Sunday) to 6
 * (Saturday), `startHour` is 0-23 inclusive, `endHour` is 1-24 exclusive and
 * must be greater than `startHour`. A window cannot cross midnight; use two
 * windows on consecutive days instead.
 */
export type AutoUpdateScheduleWindow = {
  /** UTC weekday: 0 (Sunday) through 6 (Saturday). */
  day: number;
  /** UTC hour the window opens (inclusive), 0-23. */
  startHour: number;
  /** UTC hour the window closes (exclusive), 1-24. */
  endHour: number;
};

export type ServiceAutoUpdates = {
  type?: "disabled" | "patch" | "minor" | null;
  /** Weekly UTC maintenance windows. Omitted means Railway's default (anytime). */
  schedule?: AutoUpdateScheduleWindow[] | null;
  tagMode?: "semver" | "sha" | null;
};

export type ServiceSource = {
  image?: string | null;
  repo?: string | null;
  branch?: string | null;
  commitSha?: string | null;
  upstreamUrl?: string | null;
  rootDirectory?: string | null;
  checkSuites?: boolean | null;
  /** Image auto-updates. Only Docker Hub and GHCR image sources support them. */
  autoUpdates?: ServiceAutoUpdates | null;
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
  preDeployTimeoutSeconds?: number | null;
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

export type BucketRegion = "sjc" | "iad" | "ams" | "sin";

export type BucketConfig = {
  region?: BucketRegion | null;
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
