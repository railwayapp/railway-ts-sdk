import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** The `BigInt` scalar type represents non-fractional signed whole numeric values. */
  BigInt: { input: string; output: string; }
  CanvasConfig: { input: any; output: any; }
  /** A date-time string at UTC, such as 2007-12-03T10:15:30Z, compliant with the `date-time` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar. */
  DateTime: { input: string; output: string; }
  DeploymentDiagnosis: { input: any; output: any; }
  DeploymentMeta: { input: any; output: any; }
  DisplayConfig: { input: any; output: any; }
  /**
   *
   * EnvironmentConfig is a custom scalar type that represents the serializedConfig for an environment.
   * JSON Schema: https://backboard.railway-develop.com/schema/environment.schema.json
   *
   */
  EnvironmentConfig: { input: any; output: any; }
  EnvironmentPatchMeta: { input: any; output: any; }
  /** EnvironmentVariables is a custom scalar type that represents a map of environment variables. */
  EnvironmentVariables: { input: any; output: any; }
  EventProperties: { input: any; output: any; }
  ImageUpdateStatus: { input: any; output: any; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: { input: unknown; output: unknown; }
  NodePositions: { input: any; output: any; }
  NotificationChannelConfig: { input: any; output: any; }
  NotificationPayload: { input: any; output: any; }
  PasskeyAuthenticationCredentialJSON: { input: any; output: any; }
  PasskeyAuthenticationOptionsJSON: { input: any; output: any; }
  PasskeyRegistrationCredentialJSON: { input: any; output: any; }
  PasskeyRegistrationOptionsJSON: { input: any; output: any; }
  ProvidedEnvironmentVariables: { input: any; output: any; }
  RailpackInfo: { input: any; output: any; }
  /** RepoAnalysisMonorepoServices is a custom scalar type that represents a map of service names to their monorepo metadata. */
  RepoAnalysisMonorepoServices: { input: any; output: any; }
  /**
   *
   * SerializedTemplateConfig is a custom scalar type that represents the serializedConfig for a template.
   * JSON Schema: https://backboard.railway-develop.com/schema/template.schema.json
   *
   */
  SerializedTemplateConfig: { input: any; output: any; }
  ServiceInstanceLimit: { input: any; output: any; }
  SkippedResourceIds: { input: any; output: any; }
  SpendCommitmentFeatureId: { input: any; output: any; }
  SubscriptionPlanLimit: { input: any; output: any; }
  /**
   *
   * Support Health Metrics for Template Support Bonus Calculation..
   * Contains metrics calculated from community support thread performance:
   * - solved: Percentage (0-100) of solved threads
   * - csat: Percentage (0-100) of threads with positive customer satisfaction
   * - aggregateHealth: Average of solved and csat when both available, otherwise just solved percentage
   * Templates with aggregateHealth >= 80 qualify for support bonus (additional 10% kickback).
   *
   */
  SupportHealthMetrics: { input: any; output: any; }
  TemplateConfig: { input: any; output: any; }
  TemplateMetadata: { input: any; output: any; }
  TemplateServiceConfig: { input: any; output: any; }
  TemplateVolume: { input: any; output: any; }
  /** The `Upload` scalar type represents a file upload. */
  Upload: { input: any; output: any; }
};

export type AccessRule = {
  __typename?: 'AccessRule';
  disallowed?: Maybe<Scalars['String']['output']>;
};

export type ActiveFeatureFlag =
  | 'CHAT_SANDBOX'
  | 'DEBUG_SMART_DIAGNOSIS'
  | 'EDGE_CONFIG'
  | 'IN_DASHBOARD_SUPPORT'
  | 'MAGIC_CONFIG'
  | 'POSTGRES_PGBOUNCER'
  | 'POSTGRES_PITR'
  | 'PRIORITY_BOARDING'
  | 'PROJECT_SANDBOXES';

export type ActivePlatformFlag =
  | 'BAN_APPEAL_FORM'
  | 'CHAT_SANDBOX'
  | 'CTRD_IMAGE_STORE_ROLLOUT'
  | 'DEMO_PERCENTAGE_ROLLOUT'
  | 'HA_STATIC_EGRESS_SELF_SERVICE'
  | 'INLINE_NOTIFICATION_PROCESSING'
  | 'IN_DASHBOARD_SUPPORT'
  | 'KAFKA_DEPLOYMENT_STATUS_CHANGES'
  | 'NEW_STRIPE_WEBHOOK_VERSION_ROLLOUT'
  | 'OAUTH_DCR_KILLSWITCH'
  | 'RADAR_AUTO_EVALUATE'
  | 'SERVICEINSTANCE_DATALOADER_FOR_STATIC_URL'
  | 'SPLIT_USAGE_QUERIES'
  | 'STRIPE_METERS_NEW_ACCOUNTS'
  | 'STRIPE_METERS_SHADOW_ENABLED'
  | 'UPDATED_VM_QUERIES';

export type ActiveProjectFeatureFlag =
  | 'PLACEHOLDER';

export type ActiveServiceFeatureFlag =
  | 'COPY_VOLUME_TO_ENVIRONMENT'
  | 'ENABLE_DOCKER_EXTENSION'
  | 'PLACEHOLDER'
  | 'SKIPPED_BUILDS'
  | 'USE_EXPRESS_DEPLOY'
  | 'USE_HA_STATIC_EGRESS'
  | 'USE_VM_RUNTIME';

export type AdminDebugInstallationResult = {
  __typename?: 'AdminDebugInstallationResult';
  accessible: Scalars['Boolean']['output'];
  accountLogin?: Maybe<Scalars['String']['output']>;
  accountType?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  missingMembersWarning?: Maybe<Scalars['String']['output']>;
  permissionChecks: Array<AdminInstallationPermissionCheck>;
  permissionsUpdateUrl?: Maybe<Scalars['String']['output']>;
  rawResponse?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type AdminDeploymentListInput = {
  createdAfter?: InputMaybe<Scalars['String']['input']>;
  createdBefore?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<DeploymentStatus>;
};

export type AdminEmailTemplate = {
  __typename?: 'AdminEmailTemplate';
  id: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  updatedAt: Scalars['Int']['output'];
};

export type AdminGiftProSubscriptionInput = {
  couponName: Scalars['String']['input'];
  reason: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};

export type AdminInstallationPermissionCheck = {
  __typename?: 'AdminInstallationPermissionCheck';
  actual?: Maybe<Scalars['String']['output']>;
  isApplicable: Scalars['Boolean']['output'];
  isMissing: Scalars['Boolean']['output'];
  permission: Scalars['String']['output'];
  required: Scalars['String']['output'];
};

export type AdminOAuthClient = Node & {
  __typename?: 'AdminOAuthClient';
  activeGrantCount: Scalars['Int']['output'];
  applicationType: Scalars['String']['output'];
  clientId: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isDynamic: Scalars['Boolean']['output'];
  logoUrl?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  redirectUris?: Maybe<Array<Scalars['String']['output']>>;
  secrets: Array<OAuthClientSecret>;
  updatedAt: Scalars['DateTime']['output'];
  workspace?: Maybe<Workspace>;
};

export type AdminProjectOverview = {
  __typename?: 'AdminProjectOverview';
  owner: AdminProjectOwner;
};

export type AdminProjectOwner = {
  __typename?: 'AdminProjectOwner';
  adoptionLevel?: Maybe<Scalars['Float']['output']>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  directSupport?: Maybe<Scalars['Boolean']['output']>;
  featureFlags: Array<ActiveFeatureFlag>;
  /** @deprecated Deprecated in favour of the SpendCommitment schema. */
  hasBAA?: Maybe<Scalars['Boolean']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  lifetimeUsage?: Maybe<Scalars['Float']['output']>;
  name: Scalars['String']['output'];
  riskLevel?: Maybe<Scalars['Float']['output']>;
  slackChannelId?: Maybe<Scalars['String']['output']>;
  spendCommitmentFeatures?: Maybe<Array<Scalars['SpendCommitmentFeatureId']['output']>>;
  subscriptionType?: Maybe<SubscriptionPlanType>;
};

export type AdminReferralCode = Node & {
  __typename?: 'AdminReferralCode';
  code: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  creator: User;
  creditAmountCents: Scalars['Int']['output'];
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  isAtLimit: Scalars['Boolean']['output'];
  isExpired: Scalars['Boolean']['output'];
  maxUses?: Maybe<Scalars['Int']['output']>;
  redemptions: AdminReferralCodeRedemptionsConnection;
  updatedAt: Scalars['DateTime']['output'];
  usageCount: Scalars['Int']['output'];
};


export type AdminReferralCodeRedemptionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type AdminReferralCodeCreateInput = {
  code: Scalars['String']['input'];
  creditAmountCents: Scalars['Int']['input'];
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  maxUses?: InputMaybe<Scalars['Int']['input']>;
};

export type AdminReferralCodeRedemption = Node & {
  __typename?: 'AdminReferralCodeRedemption';
  couponApplicationCount: Scalars['Int']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  totalCouponApplications: Scalars['Int']['output'];
  workspace: Workspace;
};

export type AdminReferralCodeRedemptionsConnection = {
  __typename?: 'AdminReferralCodeRedemptionsConnection';
  edges: Array<AdminReferralCodeRedemptionsConnectionEdge>;
  pageInfo: PageInfo;
};

export type AdminReferralCodeRedemptionsConnectionEdge = {
  __typename?: 'AdminReferralCodeRedemptionsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: AdminReferralCodeRedemption;
};

export type AdminReferralCodeUpdateInput = {
  creditAmountCents?: InputMaybe<Scalars['Int']['input']>;
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  id: Scalars['String']['input'];
  maxUses?: InputMaybe<Scalars['Int']['input']>;
};

export type AdminRepo = Node & {
  __typename?: 'AdminRepo';
  createdAt: Scalars['DateTime']['output'];
  defaultBranch: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  fullName: Scalars['String']['output'];
  githubId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  installationId?: Maybe<Scalars['String']['output']>;
  isArchived: Scalars['Boolean']['output'];
  isDisabled: Scalars['Boolean']['output'];
  isFork: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  ownerAvatarUrl?: Maybe<Scalars['String']['output']>;
  ownerId: Scalars['String']['output'];
  ownerLogin: Scalars['String']['output'];
  refs: Array<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  visibility: Scalars['String']['output'];
};

export type AdminSendNotificationInput = {
  channelConfig: Scalars['NotificationChannelConfig']['input'];
  deliveryMethods: Array<NotificationDeliveryType>;
  deploymentId?: InputMaybe<Scalars['String']['input']>;
  description: Scalars['String']['input'];
  environmentId?: InputMaybe<Scalars['String']['input']>;
  projectId?: InputMaybe<Scalars['String']['input']>;
  serviceId?: InputMaybe<Scalars['String']['input']>;
  severity: NotificationSeverity;
  title: Scalars['String']['input'];
  workspaceId?: InputMaybe<Scalars['String']['input']>;
};

export type AdminSpendCommitmentUpsertInput = {
  customerId: Scalars['String']['input'];
  features: Array<Scalars['SpendCommitmentFeatureId']['input']>;
  minSpendAmountCents: Scalars['Int']['input'];
};

export type AdminStats = {
  __typename?: 'AdminStats';
  deploysFailedLastHour: Scalars['Int']['output'];
  deploysInProgressHour: Scalars['Int']['output'];
  deploysSuccessfulLastHour: Scalars['Int']['output'];
  latestDeploys: Array<Deployment>;
  latestWorkspaces: Array<Workspace>;
  numHobby: Scalars['Int']['output'];
  numPro: Scalars['Int']['output'];
  totalPlatformUsage?: Maybe<TotalUsage>;
};

export type AdminUnsubscribeEmailResult = {
  __typename?: 'AdminUnsubscribeEmailResult';
  cioProfilesAffected: Scalars['Int']['output'];
  email: Scalars['String']['output'];
  preferencesUpdated: Scalars['Boolean']['output'];
  railwayUserId?: Maybe<Scalars['ID']['output']>;
};

export type AdminVolumeMountTriage = {
  __typename?: 'AdminVolumeMountTriage';
  environmentId: Scalars['String']['output'];
  recommendedDetachVolumeInstanceIds: Array<Scalars['String']['output']>;
  recommendedKeepVolumeInstanceId?: Maybe<Scalars['String']['output']>;
  runningDeploymentInstanceId?: Maybe<Scalars['String']['output']>;
  runningDeploymentInstanceStatus?: Maybe<Scalars['String']['output']>;
  runningStacker?: Maybe<Scalars['String']['output']>;
  runningStackerVolumeExternalIds: Array<Scalars['String']['output']>;
  serviceId: Scalars['String']['output'];
  serviceName: Scalars['String']['output'];
  unresolvedReason?: Maybe<Scalars['String']['output']>;
  volumes: Array<AdminVolumeMountTriageVolume>;
};

export type AdminVolumeMountTriageVolume = {
  __typename?: 'AdminVolumeMountTriageVolume';
  createdAt: Scalars['DateTime']['output'];
  externalId: Scalars['String']['output'];
  isOnRunningStacker: Scalars['Boolean']['output'];
  mountPath: Scalars['String']['output'];
  region?: Maybe<Scalars['String']['output']>;
  stacker?: Maybe<Scalars['String']['output']>;
  stackerByZfsId?: Maybe<Scalars['String']['output']>;
  state?: Maybe<Scalars['String']['output']>;
  volumeId: Scalars['String']['output'];
  volumeInstanceId: Scalars['String']['output'];
  volumeName: Scalars['String']['output'];
};

export type AdoptionInfo = Node & {
  __typename?: 'AdoptionInfo';
  adoptionLevel?: Maybe<Scalars['Float']['output']>;
  createdAt: Scalars['DateTime']['output'];
  deltaLevel?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  matchedIcpEmail?: Maybe<Scalars['String']['output']>;
  monthlyEstimatedUsage?: Maybe<Scalars['Float']['output']>;
  numConfigFile: Scalars['Int']['output'];
  numCronSchedule: Scalars['Int']['output'];
  numDeploys: Scalars['Int']['output'];
  numEnvs: Scalars['Int']['output'];
  numFailedDeploys: Scalars['Int']['output'];
  numHealthcheck: Scalars['Int']['output'];
  numIconConfig: Scalars['Int']['output'];
  numRegion: Scalars['Int']['output'];
  numReplicas: Scalars['Int']['output'];
  numRootDirectory: Scalars['Int']['output'];
  numSeats: Scalars['Int']['output'];
  numServices: Scalars['Int']['output'];
  numVariables: Scalars['Int']['output'];
  numWatchPatterns: Scalars['Int']['output'];
  totalCores?: Maybe<Scalars['Float']['output']>;
  totalDisk?: Maybe<Scalars['Float']['output']>;
  totalNetwork?: Maybe<Scalars['Float']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  workspace: Workspace;
};

export type AgentAbortedEvent = {
  __typename?: 'AgentAbortedEvent';
  abortedAt: Scalars['String']['output'];
  agentName: Scalars['String']['output'];
  agentRunId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  reason?: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
};

export type AgentChunkEvent = {
  __typename?: 'AgentChunkEvent';
  agentName: Scalars['String']['output'];
  agentRunId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  text: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type AgentCompletedEvent = {
  __typename?: 'AgentCompletedEvent';
  agentName: Scalars['String']['output'];
  agentRunId: Scalars['String']['output'];
  completedAt: Scalars['String']['output'];
  id: Scalars['String']['output'];
  result: AgentResult;
  type: Scalars['String']['output'];
};

export type AgentErrorEvent = {
  __typename?: 'AgentErrorEvent';
  agentName: Scalars['String']['output'];
  agentRunId: Scalars['String']['output'];
  error: Scalars['String']['output'];
  failedAt: Scalars['String']['output'];
  id: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type AgentMessage = {
  __typename?: 'AgentMessage';
  content: Scalars['String']['output'];
  role: Scalars['String']['output'];
};

export type AgentResult = {
  __typename?: 'AgentResult';
  finishReason?: Maybe<Scalars['String']['output']>;
  steps: Array<Scalars['JSON']['output']>;
  text: Scalars['String']['output'];
  usage?: Maybe<AgentTokenUsage>;
};

export type AgentStartedEvent = {
  __typename?: 'AgentStartedEvent';
  agentName: Scalars['String']['output'];
  agentRunId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  startedAt: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type AgentStepFinish = {
  __typename?: 'AgentStepFinish';
  finishReason?: Maybe<Scalars['String']['output']>;
  text: Scalars['String']['output'];
  toolCalls?: Maybe<Array<AgentToolCallChunk>>;
  toolResults?: Maybe<Array<AgentToolResultChunk>>;
  usage?: Maybe<AgentTokenUsage>;
};

export type AgentStepFinishEvent = {
  __typename?: 'AgentStepFinishEvent';
  agentName: Scalars['String']['output'];
  agentRunId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  step: AgentStepFinish;
  type: Scalars['String']['output'];
};

export type AgentStreamEvent = AgentAbortedEvent | AgentChunkEvent | AgentCompletedEvent | AgentErrorEvent | AgentStartedEvent | AgentStepFinishEvent | AgentSubagentCompleteEvent | AgentSubagentStartEvent | AgentSuggestionsEvent | AgentToolCallDeltaEvent | AgentToolCallReadyEvent | AgentToolCallStreamingStartEvent | AgentToolExecutionCompleteEvent | AgentToolExecutionStartEvent | AgentToolOutputDeltaEvent | AgentWorkflowCompletedEvent | AgentWorkflowStartedEvent;

export type AgentSubagentCompleteEvent = {
  __typename?: 'AgentSubagentCompleteEvent';
  agentName: Scalars['String']['output'];
  agentRunId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  result?: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
};

export type AgentSubagentStartEvent = {
  __typename?: 'AgentSubagentStartEvent';
  agentName: Scalars['String']['output'];
  agentRunId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  parentAgentName: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type AgentSuggestionsEvent = {
  __typename?: 'AgentSuggestionsEvent';
  id: Scalars['String']['output'];
  suggestions: Array<ChatSuggestion>;
  type: Scalars['String']['output'];
};

export type AgentTokenUsage = {
  __typename?: 'AgentTokenUsage';
  cachedInputTokens?: Maybe<Scalars['Int']['output']>;
  inputTokens?: Maybe<Scalars['Int']['output']>;
  outputTokens?: Maybe<Scalars['Int']['output']>;
  reasoningTokens?: Maybe<Scalars['Int']['output']>;
  totalTokens?: Maybe<Scalars['Int']['output']>;
};

export type AgentToolCallChunk = {
  __typename?: 'AgentToolCallChunk';
  from: Scalars['String']['output'];
  payload: AgentToolCallPayload;
  runId: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type AgentToolCallDeltaEvent = {
  __typename?: 'AgentToolCallDeltaEvent';
  agentName: Scalars['String']['output'];
  agentRunId: Scalars['String']['output'];
  argsTextDelta: Scalars['String']['output'];
  id: Scalars['String']['output'];
  toolCallId: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type AgentToolCallPayload = {
  __typename?: 'AgentToolCallPayload';
  args?: Maybe<Scalars['JSON']['output']>;
  dynamic?: Maybe<Scalars['Boolean']['output']>;
  output?: Maybe<Scalars['JSON']['output']>;
  toolCallId: Scalars['String']['output'];
  toolName: Scalars['String']['output'];
};

export type AgentToolCallReadyEvent = {
  __typename?: 'AgentToolCallReadyEvent';
  agentName: Scalars['String']['output'];
  agentRunId: Scalars['String']['output'];
  args?: Maybe<Scalars['JSON']['output']>;
  id: Scalars['String']['output'];
  toolCallId: Scalars['String']['output'];
  toolName: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type AgentToolCallStreamingStartEvent = {
  __typename?: 'AgentToolCallStreamingStartEvent';
  agentName: Scalars['String']['output'];
  agentRunId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  toolCallId: Scalars['String']['output'];
  toolName: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type AgentToolExecutionCompleteEvent = {
  __typename?: 'AgentToolExecutionCompleteEvent';
  agentName: Scalars['String']['output'];
  agentRunId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  isError?: Maybe<Scalars['Boolean']['output']>;
  result?: Maybe<Scalars['JSON']['output']>;
  toolCallId: Scalars['String']['output'];
  toolName: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type AgentToolExecutionStartEvent = {
  __typename?: 'AgentToolExecutionStartEvent';
  agentName: Scalars['String']['output'];
  agentRunId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  toolCallId: Scalars['String']['output'];
  toolName: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type AgentToolOutputDeltaEvent = {
  __typename?: 'AgentToolOutputDeltaEvent';
  agentName: Scalars['String']['output'];
  agentRunId: Scalars['String']['output'];
  delta?: Maybe<Scalars['JSON']['output']>;
  id: Scalars['String']['output'];
  toolCallId: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type AgentToolResultChunk = {
  __typename?: 'AgentToolResultChunk';
  from: Scalars['String']['output'];
  payload: AgentToolResultPayload;
  runId: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type AgentToolResultPayload = {
  __typename?: 'AgentToolResultPayload';
  args?: Maybe<Scalars['JSON']['output']>;
  dynamic?: Maybe<Scalars['Boolean']['output']>;
  isError?: Maybe<Scalars['Boolean']['output']>;
  result?: Maybe<Scalars['JSON']['output']>;
  toolCallId: Scalars['String']['output'];
  toolName: Scalars['String']['output'];
};

export type AgentUsageLimitSetInput = {
  hardLimitCents: Scalars['Int']['input'];
  softLimitCents?: InputMaybe<Scalars['Int']['input']>;
  workspaceId: Scalars['String']['input'];
};

export type AgentUsageSummary = {
  __typename?: 'AgentUsageSummary';
  billingPeriodEnd: Scalars['DateTime']['output'];
  hardLimitCents?: Maybe<Scalars['Int']['output']>;
  softLimitCents?: Maybe<Scalars['Int']['output']>;
  totalUsedCents: Scalars['Int']['output'];
  usageRemaining?: Maybe<Scalars['Float']['output']>;
};

export type AgentWorkflowCompletedEvent = {
  __typename?: 'AgentWorkflowCompletedEvent';
  completedAt: Scalars['String']['output'];
  id: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type AgentWorkflowStartedEvent = {
  __typename?: 'AgentWorkflowStartedEvent';
  id: Scalars['String']['output'];
  startedAt: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

/** The aggregated usage of a single measurement. */
export type AggregatedUsage = {
  __typename?: 'AggregatedUsage';
  /** The measurement that was aggregated. */
  measurement: MetricMeasurement;
  /** The tags that were used to group the metric. Only the tags that were used in the `groupBy` will be present. */
  tags: MetricTags;
  /** The aggregated value. */
  value: Scalars['Float']['output'];
};

export type AllDomains = {
  __typename?: 'AllDomains';
  customDomains: Array<CustomDomain>;
  serviceDomains: Array<ServiceDomain>;
};

export type ApiToken = Node & {
  __typename?: 'ApiToken';
  displayToken: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  workspaceId?: Maybe<Scalars['String']['output']>;
};

/** Information about the current API token and its accessible workspaces. */
export type ApiTokenContext = {
  __typename?: 'ApiTokenContext';
  /** Workspaces this subject can operate on via this token or session. */
  workspaces: Array<ApiTokenWorkspace>;
};

export type ApiTokenCreateInput = {
  name: Scalars['String']['input'];
  workspaceId?: InputMaybe<Scalars['String']['input']>;
};

export type ApiTokenRateLimit = {
  __typename?: 'ApiTokenRateLimit';
  remainingPoints: Scalars['Int']['output'];
  resetsAt: Scalars['String']['output'];
};

export type ApiTokenWorkspace = {
  __typename?: 'ApiTokenWorkspace';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type ApplicationTracingState =
  | 'disabled'
  | 'enabled';

export type AppliedByMember = {
  __typename?: 'AppliedByMember';
  avatar?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
  username?: Maybe<Scalars['String']['output']>;
};

export type AuditLog = Node & {
  __typename?: 'AuditLog';
  context?: Maybe<Scalars['JSON']['output']>;
  createdAt: Scalars['DateTime']['output'];
  environment?: Maybe<Environment>;
  environmentId?: Maybe<Scalars['String']['output']>;
  eventType: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  payload?: Maybe<Scalars['JSON']['output']>;
  project?: Maybe<Project>;
  projectId?: Maybe<Scalars['String']['output']>;
  workspaceId?: Maybe<Scalars['String']['output']>;
};

export type AuditLogEventTypeInfo = {
  __typename?: 'AuditLogEventTypeInfo';
  description: Scalars['String']['output'];
  eventType: Scalars['String']['output'];
};

export type AuditLogFilterInput = {
  /** Filter events created on or before this date */
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter events for a single environment */
  environmentId?: InputMaybe<Scalars['String']['input']>;
  /** List of event types to filter by */
  eventTypes?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Filter events for a single project */
  projectId?: InputMaybe<Scalars['String']['input']>;
  /** Filter events created on or after this date */
  startDate?: InputMaybe<Scalars['DateTime']['input']>;
};

export type AutoRefundSettings = {
  __typename?: 'AutoRefundSettings';
  hobbyThreshold: Scalars['Int']['output'];
  proThreshold: Scalars['Int']['output'];
};

export type BackupUpdate = {
  __typename?: 'BackupUpdate';
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  isRestoration?: Maybe<Scalars['Boolean']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  restoredVolumeInstanceId?: Maybe<Scalars['String']['output']>;
};

export type BanAppealFormInput = {
  attestation: Scalars['Boolean']['input'];
  message: Scalars['String']['input'];
  type: BanAppealType;
  workspaceId: Scalars['String']['input'];
};

export type BanAppealType =
  | 'USER'
  | 'WORKSPACE';

export type BanReasonHistory = Node & {
  __typename?: 'BanReasonHistory';
  actor?: Maybe<User>;
  banReason?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
};

export type BannedImage = Node & {
  __typename?: 'BannedImage';
  bannedByUser: User;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  image: Scalars['String']['output'];
  reason: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  workspaces: Array<BannedImageWorkspace>;
  workspacesCount: Scalars['Int']['output'];
};


export type BannedImageWorkspacesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  unbannedOnly?: InputMaybe<Scalars['Boolean']['input']>;
};


export type BannedImageWorkspacesCountArgs = {
  unbannedOnly?: InputMaybe<Scalars['Boolean']['input']>;
};

export type BannedImageWorkspace = {
  __typename?: 'BannedImageWorkspace';
  banReason?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type BaseEnvironmentOverrideInput = {
  baseEnvironmentOverrideId?: InputMaybe<Scalars['String']['input']>;
};

/** The billing period for a customers subscription. */
export type BillingPeriod = {
  __typename?: 'BillingPeriod';
  end: Scalars['DateTime']['output'];
  start: Scalars['DateTime']['output'];
};

export type Bucket = Node & {
  __typename?: 'Bucket';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  project: Project;
  projectId: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type BucketCreateInput = {
  /** [unimplemented] The environment to deploy the bucket instances into. If `null`, the bucket will not be deployed to any environment. `undefined` will deploy to all environments. */
  environmentId?: InputMaybe<Scalars['String']['input']>;
  /** The name of the bucket */
  name?: InputMaybe<Scalars['String']['input']>;
  /** The project to create the bucket in */
  projectId: Scalars['String']['input'];
};

export type BucketInstance = Node & {
  __typename?: 'BucketInstance';
  bucket: Bucket;
  bucketId: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  environment: Environment;
  environmentId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  region?: Maybe<Scalars['String']['output']>;
  sizeBytes?: Maybe<Scalars['BigInt']['output']>;
};

export type BucketInstanceDetails = {
  __typename?: 'BucketInstanceDetails';
  objectCount: Scalars['BigInt']['output'];
  sizeBytes: Scalars['BigInt']['output'];
};

export type BucketS3CompatibleCredentials = {
  __typename?: 'BucketS3CompatibleCredentials';
  accessKeyId: Scalars['String']['output'];
  bucketName: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  endpoint: Scalars['String']['output'];
  region: Scalars['String']['output'];
  secretAccessKey: Scalars['String']['output'];
  urlStyle: Scalars['String']['output'];
};

export type BucketUpdateInput = {
  name: Scalars['String']['input'];
};

/** The combined usage of all buckets. */
export type BucketUsage = {
  __typename?: 'BucketUsage';
  gbMonths: Scalars['Int']['output'];
};

export type Builder =
  | 'HEROKU'
  | 'NIXPACKS'
  | 'PAKETO'
  | 'RAILPACK';

export type CdnProvider =
  | 'DETECTED_CDN_PROVIDER_CLOUDFLARE'
  | 'DETECTED_CDN_PROVIDER_UNSPECIFIED'
  | 'UNRECOGNIZED';

export type CanvasViewMergePreview = {
  __typename?: 'CanvasViewMergePreview';
  mutations: Array<Scalars['JSON']['output']>;
  state: Scalars['JSON']['output'];
};

/** The type of error that occurred during certificate issuance */
export type CertificateErrorType =
  | 'CERTIFICATE_ERROR_TYPE_AUTHORIZATION_FAILED'
  | 'CERTIFICATE_ERROR_TYPE_DNS_VALIDATION'
  | 'CERTIFICATE_ERROR_TYPE_INTERNAL'
  | 'CERTIFICATE_ERROR_TYPE_KEY_GENERATION'
  | 'CERTIFICATE_ERROR_TYPE_ORDER_CREATION'
  | 'CERTIFICATE_ERROR_TYPE_RATE_LIMIT'
  | 'CERTIFICATE_ERROR_TYPE_UNSPECIFIED'
  | 'UNRECOGNIZED';

export type CertificatePublicData = {
  __typename?: 'CertificatePublicData';
  domainNames: Array<Scalars['String']['output']>;
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  fingerprintSha256: Scalars['String']['output'];
  issuedAt?: Maybe<Scalars['DateTime']['output']>;
  keyType: KeyType;
};

export type CertificateStatus =
  | 'CERTIFICATE_STATUS_TYPE_ISSUE_FAILED'
  | 'CERTIFICATE_STATUS_TYPE_ISSUING'
  | 'CERTIFICATE_STATUS_TYPE_UNSPECIFIED'
  | 'CERTIFICATE_STATUS_TYPE_VALID'
  | 'CERTIFICATE_STATUS_TYPE_VALIDATING_OWNERSHIP'
  | 'UNRECOGNIZED';

export type CertificateStatusDetailed =
  | 'CERTIFICATE_STATUS_TYPE_DETAILED_CLEANING_UP'
  | 'CERTIFICATE_STATUS_TYPE_DETAILED_COMPLETE'
  | 'CERTIFICATE_STATUS_TYPE_DETAILED_CREATING_ORDER'
  | 'CERTIFICATE_STATUS_TYPE_DETAILED_DOWNLOADING_CERTIFICATE'
  | 'CERTIFICATE_STATUS_TYPE_DETAILED_FAILED'
  | 'CERTIFICATE_STATUS_TYPE_DETAILED_FETCHING_AUTHORIZATIONS'
  | 'CERTIFICATE_STATUS_TYPE_DETAILED_FINALIZING_ORDER'
  | 'CERTIFICATE_STATUS_TYPE_DETAILED_GENERATING_KEYS'
  | 'CERTIFICATE_STATUS_TYPE_DETAILED_INITIATING_CHALLENGES'
  | 'CERTIFICATE_STATUS_TYPE_DETAILED_POLLING_AUTHORIZATIONS'
  | 'CERTIFICATE_STATUS_TYPE_DETAILED_PRESENTING_CHALLENGES'
  | 'CERTIFICATE_STATUS_TYPE_DETAILED_UNSPECIFIED'
  | 'UNRECOGNIZED';

export type ChangeOperationResult = {
  __typename?: 'ChangeOperationResult';
  kind: Scalars['String']['output'];
  outputs?: Maybe<Scalars['JSON']['output']>;
  path?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  summary?: Maybe<Scalars['String']['output']>;
};

export type ChangeSetApplyResult = {
  __typename?: 'ChangeSetApplyResult';
  changes: Array<ChangeOperationResult>;
  deploymentId?: Maybe<Scalars['String']['output']>;
  diagnostics: Scalars['JSON']['output'];
  id: Scalars['String']['output'];
  stagedPatchId?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
};

export type ChangeSetPreview = {
  __typename?: 'ChangeSetPreview';
  changeSet: Scalars['JSON']['output'];
  diagnostics: Scalars['JSON']['output'];
  effects: Scalars['JSON']['output'];
};

export type ChangelogSendInput = {
  changelogId: Scalars['String']['input'];
  changelogSlug: Scalars['String']['input'];
  changelogTitle: Scalars['String']['input'];
  isTestEmail: Scalars['Boolean']['input'];
};

export type ChatAttachmentInput = {
  content: Scalars['String']['input'];
  mimeType: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type ChatMessage = {
  __typename?: 'ChatMessage';
  content: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  parts: Array<ChatMessagePart>;
  role: ChatMessageRole;
};

export type ChatMessageAttachmentPart = {
  __typename?: 'ChatMessageAttachmentPart';
  content: Scalars['String']['output'];
  mimeType: Scalars['String']['output'];
  name: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type ChatMessagePart = ChatMessageAttachmentPart | ChatMessageTextPart | ChatMessageToolCallPart;

export type ChatMessageRole =
  | 'assistant'
  | 'system'
  | 'tool'
  | 'user';

export type ChatMessageTextPart = {
  __typename?: 'ChatMessageTextPart';
  content: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type ChatMessageToolCallPart = {
  __typename?: 'ChatMessageToolCallPart';
  args?: Maybe<Scalars['JSON']['output']>;
  id: Scalars['String']['output'];
  isError?: Maybe<Scalars['Boolean']['output']>;
  result?: Maybe<Scalars['JSON']['output']>;
  toolName: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type ChatSendMessageResponse = {
  __typename?: 'ChatSendMessageResponse';
  streamId: Scalars['String']['output'];
  threadId: Scalars['String']['output'];
};

export type ChatSuggestion = {
  __typename?: 'ChatSuggestion';
  label: Scalars['String']['output'];
  message: Scalars['String']['output'];
};

export type ChatThread = {
  __typename?: 'ChatThread';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  resourceId: Scalars['String']['output'];
  title?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type ClearDomainTrafficLimitInput = {
  domainName: Scalars['String']['input'];
};

export type CliEventTrackInput = {
  agentSessionId?: InputMaybe<Scalars['String']['input']>;
  arch: Scalars['String']['input'];
  caller?: InputMaybe<Scalars['String']['input']>;
  cliVersion: Scalars['String']['input'];
  command: Scalars['String']['input'];
  durationMs: Scalars['Int']['input'];
  environmentId?: InputMaybe<Scalars['String']['input']>;
  errorClass?: InputMaybe<Scalars['String']['input']>;
  errorMessage?: InputMaybe<Scalars['String']['input']>;
  installRequestId?: InputMaybe<Scalars['String']['input']>;
  isCi: Scalars['Boolean']['input'];
  os: Scalars['String']['input'];
  projectId?: InputMaybe<Scalars['String']['input']>;
  serviceId?: InputMaybe<Scalars['String']['input']>;
  sessionId?: InputMaybe<Scalars['String']['input']>;
  subCommand?: InputMaybe<Scalars['String']['input']>;
  success: Scalars['Boolean']['input'];
  workspaceId?: InputMaybe<Scalars['String']['input']>;
};

export type ClickhouseBackpressureStatus = {
  __typename?: 'ClickhouseBackpressureStatus';
  billingEnabled: Scalars['Boolean']['output'];
  billingMaxConcurrent: Scalars['Int']['output'];
  logsMaxConcurrent: Scalars['Int']['output'];
  metricsMaxConcurrent: Scalars['Int']['output'];
};

export type Cluster = {
  __typename?: 'Cluster';
  id: Scalars['String']['output'];
  label?: Maybe<Scalars['String']['output']>;
  namespace: Scalars['String']['output'];
  overlayHIDPrefix: Scalars['Int']['output'];
  regionId: Scalars['String']['output'];
};

export type CnameCheck = {
  __typename?: 'CnameCheck';
  link?: Maybe<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  status: CnameCheckStatus;
};

export type CnameCheckStatus =
  | 'ERROR'
  | 'INFO'
  | 'INVALID'
  | 'VALID'
  | 'WAITING';

export type ComplianceAgreementsInfo = {
  __typename?: 'ComplianceAgreementsInfo';
  /** Whether the workspace has a signed Business Associate Agreement (HIPAA) */
  hasBAA: Scalars['Boolean']['output'];
  /** Whether the workspace has a Data Processing Agreement (GDPR) */
  hasDPA: Scalars['Boolean']['output'];
};

export type CompositeScore = {
  __typename?: 'CompositeScore';
  accountScore: Scalars['Float']['output'];
  clashingSessionsScore: Scalars['Float']['output'];
  compositeScore: Scalars['Float']['output'];
  contributionsScore: Scalars['Float']['output'];
  flaggedRepos: Array<Scalars['String']['output']>;
  networkScore: Scalars['Float']['output'];
  profileScore: Scalars['Float']['output'];
  repoScore: Scalars['Float']['output'];
  totalRepos: Scalars['Int']['output'];
};

export type ComputeRuntime =
  | 'COMPUTE_RUNTIME_CONTAINERD'
  | 'COMPUTE_RUNTIME_DOCKER'
  | 'COMPUTE_RUNTIME_GVISOR'
  | 'COMPUTE_RUNTIME_KVM'
  | 'COMPUTE_RUNTIME_PODMAN'
  | 'COMPUTE_RUNTIME_UNKNOWN'
  | 'UNRECOGNIZED';

export type ConnectedServiceInstance = {
  __typename?: 'ConnectedServiceInstance';
  environmentId: Scalars['String']['output'];
  projectId: Scalars['String']['output'];
  serviceId: Scalars['String']['output'];
  serviceName?: Maybe<Scalars['String']['output']>;
};

export type Container = Node & {
  __typename?: 'Container';
  archiveUrl?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  environment: Environment;
  environmentId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  migratedAt?: Maybe<Scalars['DateTime']['output']>;
  plugin: Plugin;
  pluginId: Scalars['String']['output'];
};

export type ContainerInfo = {
  __typename?: 'ContainerInfo';
  host: Scalars['String']['output'];
  id: Scalars['String']['output'];
  image: Scalars['String']['output'];
  labels: Array<ContainerLabel>;
  runtime: ComputeRuntime;
  status: Scalars['String']['output'];
};

export type ContainerInstance = {
  __typename?: 'ContainerInstance';
  containerId: Scalars['String']['output'];
  hostname: Scalars['String']['output'];
  image: Scalars['String']['output'];
  labels: Scalars['JSON']['output'];
  projectId?: Maybe<Scalars['String']['output']>;
  runtime: ComputeRuntime;
  status: Scalars['String']['output'];
  type: ContainerType;
};

export type ContainerLabel = {
  __typename?: 'ContainerLabel';
  key: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type ContainerType =
  | 'PLUGIN'
  | 'SERVICE'
  | 'UNKNOWN';

export type CreateNotificationRuleInput = {
  channelConfigs: Array<Scalars['NotificationChannelConfig']['input']>;
  ephemeralEnvironments?: InputMaybe<Scalars['Boolean']['input']>;
  eventTypes: Array<Scalars['String']['input']>;
  projectId?: InputMaybe<Scalars['String']['input']>;
  severities?: InputMaybe<Array<NotificationSeverity>>;
  workspaceId: Scalars['String']['input'];
};

export type CreateSupportThreadInput = {
  body: Scalars['String']['input'];
  subject: Scalars['String']['input'];
  topicSlug: Scalars['String']['input'];
};

export type CreateWithdrawalAccountInput = {
  country: Scalars['String']['input'];
  customerId: Scalars['String']['input'];
};

export type Credit = Node & {
  __typename?: 'Credit';
  amount: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  customerId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  memo?: Maybe<Scalars['String']['output']>;
  type: CreditType;
  updatedAt: Scalars['DateTime']['output'];
};

export type CreditType =
  | 'APPLIED'
  | 'CREDIT'
  | 'DEBIT'
  | 'STRIPE'
  | 'TRANSFER'
  | 'WAIVED';

export type CreditWithdrawalInfo = {
  __typename?: 'CreditWithdrawalInfo';
  amount: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
};

export type CryptominerDetection = {
  __typename?: 'CryptominerDetection';
  containerId: Scalars['String']['output'];
  deploymentId: Scalars['String']['output'];
  deploymentInstanceId: Scalars['String']['output'];
  detectionMethods: Array<Scalars['String']['output']>;
  environmentId: Scalars['String']['output'];
  hostname: Scalars['String']['output'];
  id: Scalars['String']['output'];
  processes: Array<DetectedProcess>;
  projectId: Scalars['String']['output'];
  receivedAt: Scalars['Float']['output'];
  service?: Maybe<CryptominerDetectionServiceInfo>;
  serviceId: Scalars['String']['output'];
  timestamp: Scalars['String']['output'];
};

export type CryptominerDetectionServiceInfo = {
  __typename?: 'CryptominerDetectionServiceInfo';
  icon?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  projectName: Scalars['String']['output'];
  workspaceBanned: Scalars['Boolean']['output'];
  workspaceId: Scalars['String']['output'];
  workspaceName: Scalars['String']['output'];
};

export type CustomDomain = Domain & {
  __typename?: 'CustomDomain';
  adminService?: Maybe<Service>;
  /** @deprecated Removed; always null. */
  cdnMode?: Maybe<Scalars['String']['output']>;
  /** @deprecated Use the `status` field instead. */
  cnameCheck: CnameCheck;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  domain: Scalars['String']['output'];
  edgeId?: Maybe<Scalars['String']['output']>;
  environmentId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isRailwayDomain: Scalars['Boolean']['output'];
  projectId?: Maybe<Scalars['String']['output']>;
  serviceId: Scalars['String']['output'];
  status: CustomDomainStatus;
  syncStatus: CustomDomainSyncStatus;
  targetPort?: Maybe<Scalars['Int']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type CustomDomainCreateInput = {
  domain: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
  targetPort?: InputMaybe<Scalars['Int']['input']>;
};

export type CustomDomainStatus = {
  __typename?: 'CustomDomainStatus';
  cdnProvider?: Maybe<CdnProvider>;
  /** Human-readable error message when certificate issuance fails */
  certificateErrorMessage?: Maybe<Scalars['String']['output']>;
  /** Structured error type for programmatic handling */
  certificateErrorType?: Maybe<CertificateErrorType>;
  /** Whether the certificate issuance can be retried */
  certificateRetryable?: Maybe<Scalars['Boolean']['output']>;
  certificateStatus: CertificateStatus;
  certificateStatusDetailed?: Maybe<CertificateStatusDetailed>;
  certificates?: Maybe<Array<CertificatePublicData>>;
  dnsRecords: Array<DnsRecords>;
  /** Domain Connect support information for one-click DNS setup */
  domainConnect?: Maybe<DomainConnectInfo>;
  verificationDnsHost?: Maybe<Scalars['String']['output']>;
  verificationToken?: Maybe<Scalars['String']['output']>;
  verified: Scalars['Boolean']['output'];
};

export type CustomDomainSyncStatus =
  | 'ACTIVE'
  | 'CREATING'
  | 'DELETED'
  | 'DELETING'
  | 'UNSPECIFIED'
  | 'UPDATING';

export type Customer = Node & {
  __typename?: 'Customer';
  /** The total amount of credits that have been applied during the current billing period. */
  appliedCredits: Scalars['Float']['output'];
  billingAddress?: Maybe<CustomerAddress>;
  billingEmail?: Maybe<Scalars['String']['output']>;
  billingPeriod: BillingPeriod;
  /** The total amount of unused credits for the customer. */
  creditBalance: Scalars['Float']['output'];
  credits: CustomerCreditsConnection;
  /** The current usage for the customer. This value is cached and may not be up to date. */
  currentUsage: Scalars['Float']['output'];
  defaultPaymentMethod?: Maybe<PaymentMethod>;
  defaultPaymentMethodId?: Maybe<Scalars['String']['output']>;
  /** Whether this workspace was referred via an admin referral code. */
  hasAdminReferralCredit: Scalars['Boolean']['output'];
  hasExhaustedFreePlan: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  invoices: Array<CustomerInvoice>;
  isPrepaying: Scalars['Boolean']['output'];
  isTrialing: Scalars['Boolean']['output'];
  isUsageSubscriber: Scalars['Boolean']['output'];
  isWithdrawingToCredits: Scalars['Boolean']['output'];
  /** The monthly discount amount for the customer's referral code. */
  monthlyReferralCodeDiscount?: Maybe<MonthlyReferralCodeDiscount>;
  planLimitOverride?: Maybe<PlanLimitOverride>;
  remainingUsageCreditBalance: Scalars['Float']['output'];
  spendCommitment?: Maybe<SpendCommitment>;
  state: SubscriptionState;
  stripeCustomerId: Scalars['String']['output'];
  subscriptionResolutionWorkflowId?: Maybe<Scalars['String']['output']>;
  subscriptions: Array<CustomerSubscription>;
  supportedWithdrawalPlatforms: Array<WithdrawalPlatformTypes>;
  taxIds: Array<CustomerTaxId>;
  trialDaysRemaining: Scalars['Int']['output'];
  usageLimit?: Maybe<UsageLimit>;
  volumeDeletionScheduledAt?: Maybe<Scalars['DateTime']['output']>;
  workspace: Workspace;
};


export type CustomerCreditsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type CustomerAddress = {
  __typename?: 'CustomerAddress';
  city?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  line1?: Maybe<Scalars['String']['output']>;
  line2?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  postalCode?: Maybe<Scalars['String']['output']>;
  state?: Maybe<Scalars['String']['output']>;
};

export type CustomerApplyCreditInput = {
  amountDollars: Scalars['Float']['input'];
  memo: Scalars['String']['input'];
};

export type CustomerBillingAddressInput = {
  city: Scalars['String']['input'];
  country: Scalars['String']['input'];
  line1: Scalars['String']['input'];
  line2?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  postalCode: Scalars['String']['input'];
  state?: InputMaybe<Scalars['String']['input']>;
};

export type CustomerCancelIncompletePaymentIntentInput = {
  paymentIntentId: Scalars['String']['input'];
};

export type CustomerCancelIncompleteSubscriptionInput = {
  isFreePlanUpgrade?: InputMaybe<Scalars['Boolean']['input']>;
  revertToPlan?: InputMaybe<Plan>;
  subscriptionId: Scalars['String']['input'];
};

export type CustomerCompleteSpendCommitmentSubscriptionInput = {
  invoiceId: Scalars['String']['input'];
};

export type CustomerCompleteUsageSubscriptionV2Input = {
  plan: Plan;
  posthogSessionId?: InputMaybe<Scalars['String']['input']>;
  subscriptionId: Scalars['String']['input'];
};

export type CustomerCreateBillingPortalInput = {
  redirectUrl: Scalars['String']['input'];
};

export type CustomerCreateUsageSubscriptionV2Input = {
  paymentMethodId: Scalars['String']['input'];
  plan: Plan;
  posthogSessionId?: InputMaybe<Scalars['String']['input']>;
};

export type CustomerCreateUsageSubscriptionV2Response = {
  __typename?: 'CustomerCreateUsageSubscriptionV2Response';
  isFreePlanUpgrade?: Maybe<Scalars['Boolean']['output']>;
  paymentIntentClientSecret?: Maybe<Scalars['String']['output']>;
  subscriptionId: Scalars['String']['output'];
  subscriptionStatus: StripeSubscriptionStatus;
};

export type CustomerCreditsConnection = {
  __typename?: 'CustomerCreditsConnection';
  edges: Array<CustomerCreditsConnectionEdge>;
  pageInfo: PageInfo;
};

export type CustomerCreditsConnectionEdge = {
  __typename?: 'CustomerCreditsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Credit;
};

export type CustomerInvoice = {
  __typename?: 'CustomerInvoice';
  amountDue: Scalars['Float']['output'];
  amountPaid: Scalars['Float']['output'];
  hostedURL?: Maybe<Scalars['String']['output']>;
  invoiceId: Scalars['String']['output'];
  items: Array<SubscriptionItem>;
  lastPaymentError?: Maybe<Scalars['String']['output']>;
  paymentIntentStatus?: Maybe<Scalars['String']['output']>;
  pdfURL?: Maybe<Scalars['String']['output']>;
  periodEnd: Scalars['String']['output'];
  periodStart: Scalars['String']['output'];
  reissuedInvoiceFrom?: Maybe<Scalars['String']['output']>;
  reissuedInvoiceOf?: Maybe<Scalars['String']['output']>;
  spendCommitmentPrepayment?: Maybe<Scalars['Boolean']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  subscriptionId?: Maybe<Scalars['String']['output']>;
  subscriptionStatus?: Maybe<Scalars['String']['output']>;
  total: Scalars['Int']['output'];
};

export type CustomerPurchaseCreditsInput = {
  amountDollars: Scalars['Int']['input'];
  paymentMethodId?: InputMaybe<Scalars['String']['input']>;
};

export type CustomerReplacePaymentMethodInput = {
  paymentMethodId: Scalars['String']['input'];
  validateWithHold: Scalars['Boolean']['input'];
};

export type CustomerReplacePaymentMethodResponse = {
  __typename?: 'CustomerReplacePaymentMethodResponse';
  paymentIntentClientSecret?: Maybe<Scalars['String']['output']>;
  paymentIntentStatus: StripePaymentIntentStatus;
};

export type CustomerSubscribeToSpendCommitmentInput = {
  minSpendAmountCents: Scalars['Int']['input'];
};

export type CustomerSubscribeToSpendCommitmentResponse = {
  __typename?: 'CustomerSubscribeToSpendCommitmentResponse';
  invoiceId: Scalars['String']['output'];
  paymentIntentClientSecret?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type CustomerSubscription = {
  __typename?: 'CustomerSubscription';
  billingCycleAnchor: Scalars['DateTime']['output'];
  cancelAt?: Maybe<Scalars['String']['output']>;
  cancelAtPeriodEnd: Scalars['Boolean']['output'];
  couponId?: Maybe<Scalars['String']['output']>;
  discounts: Array<SubscriptionDiscount>;
  id: Scalars['String']['output'];
  items: Array<SubscriptionItem>;
  latestInvoiceId: Scalars['String']['output'];
  nextInvoiceCurrentTotal: Scalars['Int']['output'];
  nextInvoiceDate: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

export type CustomerTaxId = {
  __typename?: 'CustomerTaxId';
  id: Scalars['String']['output'];
  type: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type CustomerTransferCreditInput = {
  amountDollars: Scalars['Int']['input'];
  memo: Scalars['String']['input'];
};

export type CustomerUpdateBillingDetailsInput = {
  billingAddress?: InputMaybe<CustomerBillingAddressInput>;
  taxId?: InputMaybe<TaxIdInput>;
};

export type CustomerUpdateBillingEmailInput = {
  email: Scalars['String']['input'];
};

export type CustomerVoidIncompleteSpendCommitmentInvoiceInput = {
  invoiceId: Scalars['String']['input'];
};

export type DnsRecordPurpose =
  | 'DNS_RECORD_PURPOSE_ACME_DNS01_CHALLENGE'
  | 'DNS_RECORD_PURPOSE_TRAFFIC_ROUTE'
  | 'DNS_RECORD_PURPOSE_UNSPECIFIED'
  | 'UNRECOGNIZED';

export type DnsRecordStatus =
  | 'DNS_RECORD_STATUS_PROPAGATED'
  | 'DNS_RECORD_STATUS_REQUIRES_UPDATE'
  | 'DNS_RECORD_STATUS_UNSPECIFIED'
  | 'UNRECOGNIZED';

export type DnsRecordType =
  | 'DNS_RECORD_TYPE_A'
  | 'DNS_RECORD_TYPE_CNAME'
  | 'DNS_RECORD_TYPE_NS'
  | 'DNS_RECORD_TYPE_TXT'
  | 'DNS_RECORD_TYPE_UNSPECIFIED'
  | 'UNRECOGNIZED';

export type DnsRecords = {
  __typename?: 'DNSRecords';
  currentValue: Scalars['String']['output'];
  fqdn: Scalars['String']['output'];
  hostlabel: Scalars['String']['output'];
  purpose: DnsRecordPurpose;
  recordType: DnsRecordType;
  requiredValue: Scalars['String']['output'];
  status: DnsRecordStatus;
  zone: Scalars['String']['output'];
};

export type DatabasePasswordResetInput = {
  databaseType: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};

export type DatabasePasswordResetResponse = {
  __typename?: 'DatabasePasswordResetResponse';
  newPassword: Scalars['String']['output'];
  updatedVariables: Scalars['JSON']['output'];
};

export type DeployReferenceStats = {
  __typename?: 'DeployReferenceStats';
  avgSuccessfulThisHour: Scalars['Int']['output'];
};

export type Deployment = Node & {
  __typename?: 'Deployment';
  canRedeploy: Scalars['Boolean']['output'];
  canRollback: Scalars['Boolean']['output'];
  createdAt: Scalars['DateTime']['output'];
  creator?: Maybe<DeploymentCreator>;
  /** Check if a deployment's instances have all stopped */
  deploymentStopped: Scalars['Boolean']['output'];
  diagnosis?: Maybe<Scalars['DeploymentDiagnosis']['output']>;
  environment: Environment;
  environmentId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  instances: Array<DeploymentDeploymentInstance>;
  meta?: Maybe<Scalars['DeploymentMeta']['output']>;
  projectId: Scalars['String']['output'];
  replicaStatus?: Maybe<DeploymentReplicaStatus>;
  service: Service;
  serviceId?: Maybe<Scalars['String']['output']>;
  snapshotId?: Maybe<Scalars['String']['output']>;
  sockets: Array<DeploymentSocket>;
  staticUrl?: Maybe<Scalars['String']['output']>;
  status: DeploymentStatus;
  statusUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  suggestAddServiceDomain: Scalars['Boolean']['output'];
  updatedAt: Scalars['DateTime']['output'];
  url?: Maybe<Scalars['String']['output']>;
};

export type DeploymentAssignmentState =
  | 'DEPLOYMENT_ASSIGNMENT_STATE_ASSIGNED'
  | 'DEPLOYMENT_ASSIGNMENT_STATE_PLACED'
  | 'DEPLOYMENT_ASSIGNMENT_STATE_UNKNOWN'
  | 'UNRECOGNIZED';

export type DeploymentByDomain = {
  __typename?: 'DeploymentByDomain';
  activeDeployment?: Maybe<Deployment>;
  latestDeployment?: Maybe<Deployment>;
  projectId?: Maybe<Scalars['String']['output']>;
};

export type DeploymentCreator = {
  __typename?: 'DeploymentCreator';
  avatar?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
};

export type DeploymentDeploymentInstance = {
  __typename?: 'DeploymentDeploymentInstance';
  id: Scalars['String']['output'];
  status: DeploymentInstanceStatus;
};

export type DeploymentEvent = Node & {
  __typename?: 'DeploymentEvent';
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  payload?: Maybe<DeploymentEventPayload>;
  step: DeploymentEventStep;
};

export type DeploymentEventPayload = {
  __typename?: 'DeploymentEventPayload';
  error?: Maybe<Scalars['String']['output']>;
};

export type DeploymentEventStep =
  | 'BUILD_IMAGE'
  | 'CONFIGURE_NETWORK'
  | 'CREATE_CONTAINER'
  | 'DRAIN_INSTANCES'
  | 'HEALTHCHECK'
  | 'MIGRATE_VOLUMES'
  | 'PRE_DEPLOY_COMMAND'
  | 'PUBLISH_IMAGE'
  | 'SNAPSHOT_CODE'
  | 'WAIT_FOR_DEPENDENCIES';

export type DeploymentInstanceAssignment = {
  __typename?: 'DeploymentInstanceAssignment';
  assignedAt: Scalars['String']['output'];
  computeNodeId: Scalars['String']['output'];
  containerId?: Maybe<Scalars['String']['output']>;
  deploymentId: Scalars['String']['output'];
  instanceId: Scalars['String']['output'];
  placedAt?: Maybe<Scalars['String']['output']>;
  port?: Maybe<Scalars['Int']['output']>;
  stacker?: Maybe<Stacker>;
  state: DeploymentAssignmentState;
};

export type DeploymentInstanceExecution = Node & {
  __typename?: 'DeploymentInstanceExecution';
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  deploymentId: Scalars['String']['output'];
  deploymentMeta: Scalars['DeploymentMeta']['output'];
  id: Scalars['ID']['output'];
  status: DeploymentInstanceStatus;
  updatedAt: Scalars['DateTime']['output'];
};

export type DeploymentInstanceExecutionCreateInput = {
  serviceInstanceId: Scalars['String']['input'];
};

export type DeploymentInstanceExecutionInput = {
  deploymentId: Scalars['String']['input'];
};

export type DeploymentInstanceExecutionListInput = {
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};

export type DeploymentInstanceStatus =
  | 'CRASHED'
  | 'CREATED'
  | 'EXITED'
  | 'INITIALIZING'
  | 'REMOVED'
  | 'REMOVING'
  | 'RESTARTING'
  | 'RUNNING'
  | 'SKIPPED'
  | 'STOPPED';

export type DeploymentListInput = {
  environmentId?: InputMaybe<Scalars['String']['input']>;
  includeDeleted?: InputMaybe<Scalars['Boolean']['input']>;
  projectId?: InputMaybe<Scalars['String']['input']>;
  serviceId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<DeploymentStatusInput>;
};

export type DeploymentReplicaStatus = {
  __typename?: 'DeploymentReplicaStatus';
  crashed: Scalars['Int']['output'];
  exited: Scalars['Int']['output'];
  running: Scalars['Int']['output'];
  stopped: Scalars['Boolean']['output'];
  total: Scalars['Int']['output'];
};

export type DeploymentSnapshot = Node & {
  __typename?: 'DeploymentSnapshot';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  updatedAt: Scalars['DateTime']['output'];
  variables: Scalars['EnvironmentVariables']['output'];
};

export type DeploymentSocket = {
  __typename?: 'DeploymentSocket';
  ipv6: Scalars['Boolean']['output'];
  port: Scalars['Int']['output'];
  processName: Scalars['String']['output'];
  updatedAt: Scalars['Int']['output'];
};

export type DeploymentStatus =
  | 'BUILDING'
  | 'CRASHED'
  | 'DEPLOYING'
  | 'FAILED'
  | 'INITIALIZING'
  | 'NEEDS_APPROVAL'
  | 'QUEUED'
  | 'REMOVED'
  | 'REMOVING'
  | 'SKIPPED'
  | 'SLEEPING'
  | 'SUCCESS'
  | 'WAITING';

export type DeploymentStatusInput = {
  in?: InputMaybe<Array<DeploymentStatus>>;
  notIn?: InputMaybe<Array<DeploymentStatus>>;
};

export type DeploymentTrigger = Node & {
  __typename?: 'DeploymentTrigger';
  baseEnvironmentOverrideId?: Maybe<Scalars['String']['output']>;
  branch: Scalars['String']['output'];
  checkSuites: Scalars['Boolean']['output'];
  environmentId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  projectId: Scalars['String']['output'];
  provider: Scalars['String']['output'];
  repository: Scalars['String']['output'];
  serviceId?: Maybe<Scalars['String']['output']>;
  validCheckSuites: Scalars['Int']['output'];
};

export type DeploymentTriggerCreateInput = {
  branch: Scalars['String']['input'];
  checkSuites?: InputMaybe<Scalars['Boolean']['input']>;
  environmentId: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
  provider: Scalars['String']['input'];
  repository: Scalars['String']['input'];
  rootDirectory?: InputMaybe<Scalars['String']['input']>;
  serviceId: Scalars['String']['input'];
};

export type DeploymentTriggerUpdateInput = {
  branch?: InputMaybe<Scalars['String']['input']>;
  checkSuites?: InputMaybe<Scalars['Boolean']['input']>;
  repository?: InputMaybe<Scalars['String']['input']>;
  rootDirectory?: InputMaybe<Scalars['String']['input']>;
};

export type DeploymentsNeedApproval =
  | 'ALWAYS'
  | 'DEFAULT'
  | 'NEVER';

export type DetectedProcess = {
  __typename?: 'DetectedProcess';
  cmdline: Scalars['String']['output'];
  comm: Scalars['String']['output'];
  cpuPercent: Scalars['Float']['output'];
  detectionMethod: Scalars['String']['output'];
  exe: Scalars['String']['output'];
  matchedSignatures: Array<Scalars['String']['output']>;
  pid: Scalars['String']['output'];
};

export type DisableServiceCdnInput = {
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};

export type DockerComposeImport = {
  __typename?: 'DockerComposeImport';
  errors: Array<Scalars['String']['output']>;
  patch?: Maybe<Scalars['EnvironmentConfig']['output']>;
};

export type Domain = {
  adminService?: Maybe<Service>;
  /** @deprecated Removed; always null. */
  cdnMode?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  domain: Scalars['String']['output'];
  edgeId?: Maybe<Scalars['String']['output']>;
  environmentId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  projectId?: Maybe<Scalars['String']['output']>;
  serviceId: Scalars['String']['output'];
  targetPort?: Maybe<Scalars['Int']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type DomainAvailable = {
  __typename?: 'DomainAvailable';
  available: Scalars['Boolean']['output'];
  message: Scalars['String']['output'];
};

/** Information about Domain Connect support for a domain */
export type DomainConnectInfo = {
  __typename?: 'DomainConnectInfo';
  providerLogoUrl?: Maybe<Scalars['String']['output']>;
  providerName?: Maybe<Scalars['String']['output']>;
  supported: Scalars['Boolean']['output'];
};

/** Result from verifying Domain Connect state */
export type DomainConnectStateVerifyResult = {
  __typename?: 'DomainConnectStateVerifyResult';
  /** The domain ID if valid */
  domainId?: Maybe<Scalars['String']['output']>;
  /** URL to redirect user back to */
  returnUrl?: Maybe<Scalars['String']['output']>;
  /** Whether the state is valid */
  valid: Scalars['Boolean']['output'];
};

/** Result from generating a Domain Connect URL */
export type DomainConnectUrlResult = {
  __typename?: 'DomainConnectURLResult';
  /** The URL to redirect the user to for DNS configuration */
  applyUrl: Scalars['String']['output'];
};

export type DomainTrafficLimitInput = {
  domainName: Scalars['String']['input'];
  maxConnections: Scalars['Int']['input'];
  maxHttpRequestsPerSecond: Scalars['Int']['input'];
  maxRequestsPerConnection: Scalars['Int']['input'];
};

export type DomainWithStatus = {
  __typename?: 'DomainWithStatus';
  cdnProvider?: Maybe<CdnProvider>;
  /** Human-readable error message when certificate issuance fails */
  certificateErrorMessage?: Maybe<Scalars['String']['output']>;
  /** Structured error type for programmatic handling */
  certificateErrorType?: Maybe<CertificateErrorType>;
  /** Whether the certificate issuance can be retried */
  certificateRetryable?: Maybe<Scalars['Boolean']['output']>;
  certificateStatus: CertificateStatus;
  certificateStatusDetailed?: Maybe<CertificateStatusDetailed>;
  certificates?: Maybe<Array<CertificatePublicData>>;
  dnsRecords: Array<DnsRecords>;
  domain?: Maybe<Domain>;
};

export type DrainInstanceResult = {
  __typename?: 'DrainInstanceResult';
  deleted?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['String']['output'];
  migrated: Scalars['Boolean']['output'];
  newRegion?: Maybe<Scalars['String']['output']>;
  newRuntime?: Maybe<Scalars['String']['output']>;
  oldRuntime?: Maybe<Scalars['String']['output']>;
};

export type DrainPayloadsType =
  | 'DEPLOYMENT_INSTANCES'
  | 'DETACHED_VOLUME_INSTANCES';

export type DrainStackerFilters = {
  __typename?: 'DrainStackerFilters';
  allowStaticIPs?: Maybe<Scalars['Boolean']['output']>;
  allowedPlans: Array<Scalars['String']['output']>;
  allowedRuntimes: Array<Scalars['String']['output']>;
  cron?: Maybe<Scalars['Boolean']['output']>;
  drainPayloadsType: DrainPayloadsType;
  stateless?: Maybe<Scalars['Boolean']['output']>;
};

export type DrainStackerOptions = {
  __typename?: 'DrainStackerOptions';
  batchSize?: Maybe<Scalars['Int']['output']>;
  forceRepushExistingImages?: Maybe<Scalars['Boolean']['output']>;
  newRegion?: Maybe<Scalars['String']['output']>;
  selectedIDs?: Maybe<Array<Scalars['String']['output']>>;
};

export type DrainStackerOptionsInput = {
  batchSize?: InputMaybe<Scalars['Int']['input']>;
  forceRepushExistingImages?: InputMaybe<Scalars['Boolean']['input']>;
  newRegion?: InputMaybe<Scalars['String']['input']>;
  selectedIDs?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type DrainStackerProgress = {
  __typename?: 'DrainStackerProgress';
  awaitingConfirmationTime?: Maybe<Scalars['BigInt']['output']>;
  drainOptions?: Maybe<DrainStackerOptions>;
  draining: Scalars['Boolean']['output'];
  excludedDeploymentInstances: Array<ExcludedDeploymentInstance>;
  excludedVolumeInstances: Array<ExcludedVolumeInstance>;
  filters: DrainStackerFilters;
  matchingDeploymentInstances: Array<MatchingDeploymentInstance>;
  matchingVolumeInstances: Array<MatchingVolumeInstance>;
  migrationResults: Array<Maybe<DrainInstanceResult>>;
  migrationsCompleted: Array<Scalars['String']['output']>;
  migrationsSkipped: Array<Scalars['String']['output']>;
  migrationsTimedOut: Array<Scalars['String']['output']>;
  migrationsTriggered: Array<Scalars['String']['output']>;
  migrationsTriggeredFailed: Array<Scalars['String']['output']>;
  scannedDeploymentInstances: Scalars['Int']['output'];
  scannedVolumeInstances: Scalars['Int']['output'];
  searching: Scalars['Boolean']['output'];
  startTime: Scalars['BigInt']['output'];
  totalStackerDeploymentInstanceCount: Scalars['Int']['output'];
  totalStackerVolumeInstanceCount: Scalars['Int']['output'];
};

export type DrainStackerWorkflowInfo = {
  __typename?: 'DrainStackerWorkflowInfo';
  stackerId: Scalars['String']['output'];
  workflowId: Scalars['String']['output'];
};

export type EarningDetails = {
  __typename?: 'EarningDetails';
  availableBalance: Scalars['Float']['output'];
  bountyEarnings30d: Scalars['Float']['output'];
  bountyEarningsLifetime: Scalars['Float']['output'];
  lifetimeCashWithdrawals: Scalars['Float']['output'];
  lifetimeCreditWithdrawals: Scalars['Float']['output'];
  lifetimeEarnings: Scalars['Float']['output'];
  referralEarnings30d: Scalars['Float']['output'];
  referralEarningsLifetime: Scalars['Float']['output'];
  templateEarnings30d: Scalars['Float']['output'];
  templateEarningsLifetime: Scalars['Float']['output'];
  threadEarnings30d: Scalars['Float']['output'];
  threadEarningsLifetime: Scalars['Float']['output'];
};

export type EdgeCachingConfig = {
  __typename?: 'EdgeCachingConfig';
  defaultTtlSeconds: Scalars['Int']['output'];
  htmlCaching: Scalars['String']['output'];
  mode: Scalars['String']['output'];
  purgeOnDeploy: PurgeOnDeploy;
  staleWhileRevalidate: StaleWhileRevalidateConfig;
};

export type EdgeCachingConfigInput = {
  defaultTtlSeconds?: InputMaybe<Scalars['Int']['input']>;
  htmlCaching?: InputMaybe<Scalars['String']['input']>;
  mode?: InputMaybe<Scalars['String']['input']>;
  purgeOnDeploy?: InputMaybe<PurgeOnDeploy>;
  staleWhileRevalidate?: InputMaybe<StaleWhileRevalidateInput>;
};

export type EdgeConfig = {
  __typename?: 'EdgeConfig';
  caching?: Maybe<EdgeCachingConfig>;
  enabled: Scalars['Boolean']['output'];
  id: Scalars['String']['output'];
  purgeEpoch: Scalars['Int']['output'];
  purgeEpochByKind: Scalars['JSON']['output'];
};

export type EdgeConfigInput = {
  caching?: InputMaybe<EdgeCachingConfigInput>;
};

export type EdgeEntrypoint = {
  __typename?: 'EdgeEntrypoint';
  /** The capabilities of the edge entrypoint. */
  capabilities: Array<EdgeEntrypointCapability>;
  description?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  publicID: Scalars['String']['output'];
};

/** The capabilities of an edge entrypoint. */
export type EdgeEntrypointCapability =
  | 'EDGE_ENTRYPOINT_CAPABILITY_TARGET_PORTS'
  | 'EDGE_ENTRYPOINT_CAPABILITY_UNSPECIFIED'
  | 'UNRECOGNIZED';

export type EgressGateway = {
  __typename?: 'EgressGateway';
  ipv4: Scalars['String']['output'];
  region: Scalars['String']['output'];
  zone?: Maybe<Scalars['String']['output']>;
};

export type EgressGatewayCreateInput = {
  environmentId: Scalars['String']['input'];
  region?: InputMaybe<Scalars['String']['input']>;
  serviceId: Scalars['String']['input'];
};

export type EgressGatewayServiceTargetInput = {
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};

export type EnableServiceCdnInput = {
  config?: InputMaybe<EdgeConfigInput>;
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};

export type EnrichedDeploymentInstance = {
  __typename?: 'EnrichedDeploymentInstance';
  deploymentId: Scalars['String']['output'];
  environmentId: Scalars['String']['output'];
  hasStaticIp: Scalars['Boolean']['output'];
  id: Scalars['String']['output'];
  isCron: Scalars['Boolean']['output'];
  isDeleted: Scalars['Boolean']['output'];
  isStateless: Scalars['Boolean']['output'];
  plan: SubscriptionPlanType;
  projectId: Scalars['String']['output'];
  replicas: Scalars['Int']['output'];
  runtime: Scalars['String']['output'];
  serviceId: Scalars['String']['output'];
  serviceInstanceId: Scalars['String']['output'];
  volumeInstanceId?: Maybe<Scalars['String']['output']>;
};

export type EnterpriseDemoRequestInput = {
  attribution?: InputMaybe<Scalars['String']['input']>;
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  spend?: InputMaybe<Scalars['String']['input']>;
};

export type Environment = Node & {
  __typename?: 'Environment';
  access: EnvironmentAccess;
  bucketInstances: EnvironmentBucketInstancesConnection;
  canAccess: Scalars['Boolean']['output'];
  config: Scalars['EnvironmentConfig']['output'];
  createdAt: Scalars['DateTime']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  deploymentTriggers: EnvironmentDeploymentTriggersConnection;
  deployments: EnvironmentDeploymentsConnection;
  id: Scalars['ID']['output'];
  isEphemeral: Scalars['Boolean']['output'];
  latestCommittedPatch?: Maybe<EnvironmentPatch>;
  meta?: Maybe<EnvironmentMeta>;
  name: Scalars['String']['output'];
  patches: EnvironmentPatchesConnection;
  projectId: Scalars['String']['output'];
  serviceInstances: EnvironmentServiceInstancesConnection;
  /** Count of online vs crashed services in this environment */
  serviceStatus?: Maybe<ServiceStatus>;
  sourceEnvironment?: Maybe<Environment>;
  unmergedChangesCount?: Maybe<Scalars['Int']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  variables: EnvironmentVariablesConnection;
  volumeInstances: EnvironmentVolumeInstancesConnection;
};


export type EnvironmentBucketInstancesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type EnvironmentConfigArgs = {
  decryptVariables?: InputMaybe<Scalars['Boolean']['input']>;
};


export type EnvironmentDeploymentTriggersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type EnvironmentDeploymentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type EnvironmentPatchesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<EnvironmentPatchStatus>;
};


export type EnvironmentServiceInstancesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type EnvironmentVariablesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type EnvironmentVolumeInstancesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type EnvironmentAccess =
  | 'RESTRICTED'
  | 'UNRESTRICTED';

export type EnvironmentBucketInstancesConnection = {
  __typename?: 'EnvironmentBucketInstancesConnection';
  edges: Array<EnvironmentBucketInstancesConnectionEdge>;
  pageInfo: PageInfo;
};

export type EnvironmentBucketInstancesConnectionEdge = {
  __typename?: 'EnvironmentBucketInstancesConnectionEdge';
  cursor: Scalars['String']['output'];
  node: BucketInstance;
};

export type EnvironmentCreateInput = {
  /** If true, the changes will be applied in the background and the mutation will return immediately. If false, the mutation will wait for the changes to be applied before returning. */
  applyChangesInBackground?: InputMaybe<Scalars['Boolean']['input']>;
  ephemeral?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
  /** When committing the changes immediately, skip any initial deployments. */
  skipInitialDeploys?: InputMaybe<Scalars['Boolean']['input']>;
  /** Create the environment with all of the services, volumes, configuration, and variables from this source environment. */
  sourceEnvironmentId?: InputMaybe<Scalars['String']['input']>;
  /** Stage the initial changes for the environment. If false (default), the changes will be committed immediately. */
  stageInitialChanges?: InputMaybe<Scalars['Boolean']['input']>;
};

export type EnvironmentDeploymentTriggersConnection = {
  __typename?: 'EnvironmentDeploymentTriggersConnection';
  edges: Array<EnvironmentDeploymentTriggersConnectionEdge>;
  pageInfo: PageInfo;
};

export type EnvironmentDeploymentTriggersConnectionEdge = {
  __typename?: 'EnvironmentDeploymentTriggersConnectionEdge';
  cursor: Scalars['String']['output'];
  node: DeploymentTrigger;
};

export type EnvironmentDeploymentsConnection = {
  __typename?: 'EnvironmentDeploymentsConnection';
  edges: Array<EnvironmentDeploymentsConnectionEdge>;
  pageInfo: PageInfo;
};

export type EnvironmentDeploymentsConnectionEdge = {
  __typename?: 'EnvironmentDeploymentsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Deployment;
};

export type EnvironmentMeta = {
  __typename?: 'EnvironmentMeta';
  baseBranch?: Maybe<Scalars['String']['output']>;
  branch?: Maybe<Scalars['String']['output']>;
  latestSuccessfulGitHubDeploymentId?: Maybe<Scalars['Int']['output']>;
  prCommentId?: Maybe<Scalars['Int']['output']>;
  prNumber?: Maybe<Scalars['Int']['output']>;
  prRepo?: Maybe<Scalars['String']['output']>;
  prTitle?: Maybe<Scalars['String']['output']>;
  skippedResourceIds?: Maybe<Scalars['SkippedResourceIds']['output']>;
};

export type EnvironmentPatch = Node & {
  __typename?: 'EnvironmentPatch';
  appliedAt?: Maybe<Scalars['DateTime']['output']>;
  appliedBy?: Maybe<AppliedByMember>;
  createdAt: Scalars['DateTime']['output'];
  environment: Environment;
  environmentId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  lastAppliedError?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  meta?: Maybe<Scalars['EnvironmentPatchMeta']['output']>;
  patch: Scalars['EnvironmentConfig']['output'];
  previousEnvironmentConfig: Scalars['EnvironmentConfig']['output'];
  status: EnvironmentPatchStatus;
  updatedAt: Scalars['DateTime']['output'];
};


export type EnvironmentPatchPatchArgs = {
  decryptVariables?: InputMaybe<Scalars['Boolean']['input']>;
};


export type EnvironmentPatchPreviousEnvironmentConfigArgs = {
  decryptVariables?: InputMaybe<Scalars['Boolean']['input']>;
};

export type EnvironmentPatchProgress = {
  __typename?: 'EnvironmentPatchProgress';
  message: Scalars['String']['output'];
  patchId: Scalars['String']['output'];
  resourceId?: Maybe<Scalars['String']['output']>;
  resourceType?: Maybe<Scalars['String']['output']>;
  status: EnvironmentPatchProgressStatus;
  timestamp: Scalars['DateTime']['output'];
};

export type EnvironmentPatchProgressStatus =
  | 'COMPLETED'
  | 'FAILED'
  | 'IN_PROGRESS';

export type EnvironmentPatchStatus =
  | 'APPLYING'
  | 'COMMITTED'
  | 'STAGED';

export type EnvironmentPatchesConnection = {
  __typename?: 'EnvironmentPatchesConnection';
  edges: Array<EnvironmentPatchesConnectionEdge>;
  pageInfo: PageInfo;
};

export type EnvironmentPatchesConnectionEdge = {
  __typename?: 'EnvironmentPatchesConnectionEdge';
  cursor: Scalars['String']['output'];
  node: EnvironmentPatch;
};

export type EnvironmentRenameInput = {
  name: Scalars['String']['input'];
};

export type EnvironmentServiceInstancesConnection = {
  __typename?: 'EnvironmentServiceInstancesConnection';
  edges: Array<EnvironmentServiceInstancesConnectionEdge>;
  pageInfo: PageInfo;
};

export type EnvironmentServiceInstancesConnectionEdge = {
  __typename?: 'EnvironmentServiceInstancesConnectionEdge';
  cursor: Scalars['String']['output'];
  node: ServiceInstance;
};

export type EnvironmentTriggersDeployInput = {
  environmentId: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};

export type EnvironmentVariableType =
  | 'Provided';

export type EnvironmentVariablesConnection = {
  __typename?: 'EnvironmentVariablesConnection';
  edges: Array<EnvironmentVariablesConnectionEdge>;
  pageInfo: PageInfo;
};

export type EnvironmentVariablesConnectionEdge = {
  __typename?: 'EnvironmentVariablesConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Variable;
};

export type EnvironmentVolumeInstancesConnection = {
  __typename?: 'EnvironmentVolumeInstancesConnection';
  edges: Array<EnvironmentVolumeInstancesConnectionEdge>;
  pageInfo: PageInfo;
};

export type EnvironmentVolumeInstancesConnectionEdge = {
  __typename?: 'EnvironmentVolumeInstancesConnectionEdge';
  cursor: Scalars['String']['output'];
  node: VolumeInstance;
};

/** The estimated usage of a single measurement. */
export type EstimatedUsage = {
  __typename?: 'EstimatedUsage';
  /** The estimated value. */
  estimatedValue: Scalars['Float']['output'];
  /** The measurement that was estimated. */
  measurement: MetricMeasurement;
  projectId: Scalars['String']['output'];
};

export type EtcdQuorum = {
  __typename?: 'EtcdQuorum';
  dbSizeInUseMb?: Maybe<Scalars['Float']['output']>;
  dbSizeMb?: Maybe<Scalars['Float']['output']>;
  defragRecommended?: Maybe<Scalars['Boolean']['output']>;
  healthy: Scalars['Int']['output'];
  leaderChanges?: Maybe<Scalars['Float']['output']>;
  total: Scalars['Int']['output'];
};

export type Event = Node & {
  __typename?: 'Event';
  action: Scalars['String']['output'];
  /** Minimal event payload for activity feed list rendering. Avoids returning large deployment payload fields like commit messages. */
  activityPayload?: Maybe<Scalars['JSON']['output']>;
  createdAt: Scalars['DateTime']['output'];
  environment?: Maybe<Environment>;
  environmentId?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  object: Scalars['String']['output'];
  payload?: Maybe<Scalars['JSON']['output']>;
  project: Project;
  projectId?: Maybe<Scalars['String']['output']>;
  severity: EventSeverity;
};

export type EventBatchTrackInput = {
  events: Array<EventTrackInput>;
};

export type EventFilterInput = {
  action?: InputMaybe<EventStringListFilter>;
  object?: InputMaybe<EventStringListFilter>;
  serviceId?: InputMaybe<EventStringListFilter>;
};

export type EventSeverity =
  | 'CRITICAL'
  | 'INFO'
  | 'NOTICE'
  | 'WARNING';

export type EventStringListFilter = {
  in?: InputMaybe<Array<Scalars['String']['input']>>;
  notIn?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type EventTrackInput = {
  eventName: Scalars['String']['input'];
  properties?: InputMaybe<Scalars['EventProperties']['input']>;
  ts: Scalars['String']['input'];
};

export type ExcludedDeploymentInstance = {
  __typename?: 'ExcludedDeploymentInstance';
  environmentId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  projectId: Scalars['String']['output'];
  reason: Scalars['String']['output'];
  serviceId?: Maybe<Scalars['String']['output']>;
};

export type ExcludedVolumeInstance = {
  __typename?: 'ExcludedVolumeInstance';
  environmentId: Scalars['String']['output'];
  externalId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  projectId: Scalars['String']['output'];
  reason: Scalars['String']['output'];
  serviceId?: Maybe<Scalars['String']['output']>;
  volumeId: Scalars['String']['output'];
};

export type ExplicitOwnerInput = {
  /** The ID of the owner */
  id: Scalars['String']['input'];
  /** The type of owner */
  type?: InputMaybe<ResourceOwnerType>;
};

export type ExternalWorkspace = {
  __typename?: 'ExternalWorkspace';
  /** @deprecated Deprecated regions are no longer supported. */
  allowDeprecatedRegions?: Maybe<Scalars['Boolean']['output']>;
  avatar?: Maybe<Scalars['String']['output']>;
  banReason?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  currentSessionHasAccess?: Maybe<Scalars['Boolean']['output']>;
  customerId?: Maybe<Scalars['String']['output']>;
  customerState: SubscriptionState;
  discordRole?: Maybe<Scalars['String']['output']>;
  has2FAEnforcement: Scalars['Boolean']['output'];
  hasAutomaticDiagnosis: Scalars['Boolean']['output'];
  /** @deprecated Deprecated in favour of the SpendCommitment schema. */
  hasBAA: Scalars['Boolean']['output'];
  hasGuardrailsAccess: Scalars['Boolean']['output'];
  /** @deprecated Deprecated in favour of the SpendCommitment schema. */
  hasRBAC: Scalars['Boolean']['output'];
  hasSAML: Scalars['Boolean']['output'];
  id: Scalars['String']['output'];
  isTrialing?: Maybe<Scalars['Boolean']['output']>;
  name: Scalars['String']['output'];
  plan: Plan;
  preferredRegion?: Maybe<Scalars['String']['output']>;
  projects: Array<Project>;
  redactedDueTo2FAPending: Scalars['Boolean']['output'];
  subscriptionPlanLimit?: Maybe<Scalars['SubscriptionPlanLimit']['output']>;
  supportTierOverride?: Maybe<Scalars['String']['output']>;
  teamId?: Maybe<Scalars['String']['output']>;
};

export type FeatureFlagToggleInput = {
  flag: ActiveFeatureFlag;
  /** Admin-only field to toggle flags for users */
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type FunctionRuntime = {
  __typename?: 'FunctionRuntime';
  /** The image of the function runtime */
  image: Scalars['String']['output'];
  /** The latest version of the function runtime */
  latestVersion: FunctionRuntimeVersion;
  /** The name of the function runtime */
  name: FunctionRuntimeName;
  /** The versions of the function runtime */
  versions: Array<FunctionRuntimeVersion>;
};

/** Supported function runtime environments */
export type FunctionRuntimeName =
  | 'bun';

export type FunctionRuntimeVersion = {
  __typename?: 'FunctionRuntimeVersion';
  image: Scalars['String']['output'];
  tag: Scalars['String']['output'];
};

export type GenAiTextBlock = {
  __typename?: 'GenAITextBlock';
  text: Scalars['String']['output'];
};

export type GitHubAccess = {
  __typename?: 'GitHubAccess';
  hasAccess: Scalars['Boolean']['output'];
  isPublic: Scalars['Boolean']['output'];
};

export type GitHubBranch = {
  __typename?: 'GitHubBranch';
  name: Scalars['String']['output'];
};

export type GitHubCheck = {
  __typename?: 'GitHubCheck';
  name: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

export type GitHubEvent = {
  __typename?: 'GitHubEvent';
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  type: Scalars['String']['output'];
};

export type GitHubPrInfo = {
  __typename?: 'GitHubPRInfo';
  additions: Scalars['Int']['output'];
  author: Scalars['String']['output'];
  body: Scalars['String']['output'];
  changedFiles: Scalars['Int']['output'];
  checks: Array<GitHubCheck>;
  deletions: Scalars['Int']['output'];
  mergeable?: Maybe<Scalars['Boolean']['output']>;
  state: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type GitHubRepo = {
  __typename?: 'GitHubRepo';
  defaultBranch: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  fullName: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  installationId: Scalars['String']['output'];
  isPrivate: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  ownerAvatarUrl?: Maybe<Scalars['String']['output']>;
};

export type GitHubRepoDeployInput = {
  branch?: InputMaybe<Scalars['String']['input']>;
  environmentId?: InputMaybe<Scalars['String']['input']>;
  projectId: Scalars['String']['input'];
  repo: Scalars['String']['input'];
};

export type GitHubRepoFile = {
  __typename?: 'GitHubRepoFile';
  mode?: Maybe<Scalars['String']['output']>;
  path?: Maybe<Scalars['String']['output']>;
  sha?: Maybe<Scalars['String']['output']>;
  size?: Maybe<Scalars['Int']['output']>;
  type?: Maybe<Scalars['String']['output']>;
  url?: Maybe<Scalars['String']['output']>;
};

export type GitHubRepoUpdateInput = {
  environmentId: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};

export type GitHubRepoWithoutInstallation = {
  __typename?: 'GitHubRepoWithoutInstallation';
  defaultBranch: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  fullName: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  isPrivate: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
};

/** An SSH public key from GitHub. */
export type GitHubSshKey = {
  __typename?: 'GitHubSshKey';
  id: Scalars['Int']['output'];
  key: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type GithubAuth = {
  __typename?: 'GithubAuth';
  status: GithubAuthStatus;
};

export type GithubAuthStatus =
  | 'NOT_CONNECTED'
  | 'OK'
  | 'REAUTH_REQUIRED';

export type GithubBackpressureActiveDeploymentEntry = {
  __typename?: 'GithubBackpressureActiveDeploymentEntry';
  addedAt: Scalars['DateTime']['output'];
  dbCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  dbStatus?: Maybe<Scalars['String']['output']>;
  deploymentId: Scalars['String']['output'];
  environmentId: Scalars['String']['output'];
  serviceId: Scalars['String']['output'];
};

export type GithubBackpressureCleanupResult = {
  __typename?: 'GithubBackpressureCleanupResult';
  removed: Array<GithubBackpressureRemovedStaleEntry>;
  removedCount: Scalars['Int']['output'];
};

export type GithubBackpressureInspection = {
  __typename?: 'GithubBackpressureInspection';
  plans: Array<GithubBackpressurePlanInspection>;
  totalActive: Scalars['Int']['output'];
  totalStale: Scalars['Int']['output'];
};

export type GithubBackpressurePlanConfig = {
  __typename?: 'GithubBackpressurePlanConfig';
  enabled: Scalars['Boolean']['output'];
  maxConcurrent: Scalars['Int']['output'];
};

export type GithubBackpressurePlanInspection = {
  __typename?: 'GithubBackpressurePlanInspection';
  activeCount: Scalars['Int']['output'];
  deployments: Array<GithubBackpressureActiveDeploymentEntry>;
  plan: Scalars['String']['output'];
  staleCount: Scalars['Int']['output'];
};

export type GithubBackpressurePlanStatus = {
  __typename?: 'GithubBackpressurePlanStatus';
  activeCount: Scalars['Int']['output'];
  config: GithubBackpressurePlanConfig;
  queuedCount: Scalars['Int']['output'];
};

export type GithubBackpressurePlanType =
  | 'enterprise'
  | 'free'
  | 'hobby'
  | 'pro'
  | 'trial';

export type GithubBackpressureQueueAnalysis = {
  __typename?: 'GithubBackpressureQueueAnalysis';
  duplicateCount: Scalars['Int']['output'];
  fetchTimeMs: Scalars['Int']['output'];
  groupTimeMs: Scalars['Int']['output'];
  perPlan: Array<GithubBackpressureQueueAnalysisPlan>;
  topSpammers: Array<GithubBackpressureQueueSpammer>;
  totalQueued: Scalars['Int']['output'];
  uniqueServiceInstances: Scalars['Int']['output'];
};

export type GithubBackpressureQueueAnalysisPlan = {
  __typename?: 'GithubBackpressureQueueAnalysisPlan';
  duplicates: Scalars['Int']['output'];
  plan: Scalars['String']['output'];
  total: Scalars['Int']['output'];
  uniqueInstances: Scalars['Int']['output'];
};

export type GithubBackpressureQueueSpammer = {
  __typename?: 'GithubBackpressureQueueSpammer';
  duplicateCount: Scalars['Int']['output'];
  projectId?: Maybe<Scalars['String']['output']>;
  repoUrl: Scalars['String']['output'];
  serviceId: Scalars['String']['output'];
  workspaceId?: Maybe<Scalars['String']['output']>;
};

export type GithubBackpressureQueuedDeploymentEntry = {
  __typename?: 'GithubBackpressureQueuedDeploymentEntry';
  dbCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  dbStatus?: Maybe<Scalars['String']['output']>;
  deploymentId: Scalars['String']['output'];
  environmentId: Scalars['String']['output'];
  plan: Scalars['String']['output'];
  queuedAt: Scalars['DateTime']['output'];
  repoRef: Scalars['String']['output'];
  repoUrl: Scalars['String']['output'];
  serviceId: Scalars['String']['output'];
};

export type GithubBackpressureQueuedInspection = {
  __typename?: 'GithubBackpressureQueuedInspection';
  plans: Array<GithubBackpressureQueuedPlanInspection>;
  totalQueued: Scalars['Int']['output'];
  totalStale: Scalars['Int']['output'];
};

export type GithubBackpressureQueuedPlanInspection = {
  __typename?: 'GithubBackpressureQueuedPlanInspection';
  deployments: Array<GithubBackpressureQueuedDeploymentEntry>;
  plan: Scalars['String']['output'];
  queuedCount: Scalars['Int']['output'];
  staleCount: Scalars['Int']['output'];
};

export type GithubBackpressureRemovedStaleEntry = {
  __typename?: 'GithubBackpressureRemovedStaleEntry';
  addedAt: Scalars['DateTime']['output'];
  dbStatus?: Maybe<Scalars['String']['output']>;
  deploymentId: Scalars['String']['output'];
  environmentId: Scalars['String']['output'];
  plan: Scalars['String']['output'];
  serviceId: Scalars['String']['output'];
};

export type GithubBackpressureStatus = {
  __typename?: 'GithubBackpressureStatus';
  alertThreshold: Scalars['Int']['output'];
  deploymentStatusDisabled: Scalars['Boolean']['output'];
  enterprise: GithubBackpressurePlanStatus;
  failedMessage: Scalars['String']['output'];
  free: GithubBackpressurePlanStatus;
  hobby: GithubBackpressurePlanStatus;
  pro: GithubBackpressurePlanStatus;
  queuedMessage: Scalars['String']['output'];
  totalActive: Scalars['Int']['output'];
  totalQueued: Scalars['Int']['output'];
  trial: GithubBackpressurePlanStatus;
};

export type GithubRefreshStatus =
  | 'completed'
  | 'error'
  | 'running';

export type GithubRefreshStatusResult = {
  __typename?: 'GithubRefreshStatusResult';
  errorMessage?: Maybe<Scalars['String']['output']>;
  status: GithubRefreshStatus;
};

export type Group = Node & {
  __typename?: 'Group';
  color?: Maybe<Scalars['String']['output']>;
  groupId?: Maybe<Scalars['String']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isCollapsed?: Maybe<Scalars['Boolean']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  project: Project;
  projectId: Scalars['String']['output'];
};

export type GroupCreateInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  isCollapsed?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  projectId: Scalars['String']['input'];
};

export type GroupSet = {
  groupId?: InputMaybe<Scalars['String']['input']>;
  nodeId: Scalars['String']['input'];
};

export type GroupSetInput = {
  nodes: Array<GroupSet>;
};

export type GroupUpdateInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  isCollapsed?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type GroupedUsageAnomaliesInput = {
  filters: GroupedUsageAnomaliesInputFilters;
};

export type GroupedUsageAnomaliesInputFilters = {
  needsAction: Scalars['Boolean']['input'];
};

export type GroupedUsageAnomaly = {
  __typename?: 'GroupedUsageAnomaly';
  anomalies: Array<UsageAnomaly>;
  service: Service;
};

export type HelpStationAdminContextCustomerInfo = {
  __typename?: 'HelpStationAdminContextCustomerInfo';
  /** Average monthly spend based on last 3 paid Stripe invoices (in dollars) */
  avgMonthlySpend?: Maybe<Scalars['Float']['output']>;
  /** Total unused promotional credits in dollars */
  creditBalance: Scalars['Float']['output'];
  credits: HelpStationAdminContextCustomerInfoCreditsConnection;
  defaultPaymentMethod?: Maybe<PaymentMethod>;
  /** Whether this workspace was referred via an admin referral code (e.g., Lenny promotion) */
  hasAdminReferralCredit: Scalars['Boolean']['output'];
  id: Scalars['String']['output'];
  isPrepaying: Scalars['Boolean']['output'];
  isTrialing: Scalars['Boolean']['output'];
  spendCommitment?: Maybe<SpendCommitment>;
  state: SubscriptionState;
  stripeCustomerId: Scalars['String']['output'];
  subscriptions: Array<CustomerSubscription>;
};


export type HelpStationAdminContextCustomerInfoCreditsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type HelpStationAdminContextCustomerInfoCreditsConnection = {
  __typename?: 'HelpStationAdminContextCustomerInfoCreditsConnection';
  edges: Array<HelpStationAdminContextCustomerInfoCreditsConnectionEdge>;
  pageInfo: PageInfo;
};

export type HelpStationAdminContextCustomerInfoCreditsConnectionEdge = {
  __typename?: 'HelpStationAdminContextCustomerInfoCreditsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Credit;
};

export type HelpStationAdminContextUserInfo = {
  __typename?: 'HelpStationAdminContextUserInfo';
  avatar?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
  username?: Maybe<Scalars['String']['output']>;
  /** Workspaces user is member of */
  workspaces: Array<HelpStationAdminContextWorkspaceInfo>;
};

export type HelpStationAdminContextWorkspaceInfo = {
  __typename?: 'HelpStationAdminContextWorkspaceInfo';
  adoptionLevel: Scalars['Float']['output'];
  avatar?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  customer: HelpStationAdminContextCustomerInfo;
  /** @deprecated Deprecated in favour of the SpendCommitment schema. */
  hasBAA?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['String']['output'];
  /** Timestamp of the most recent deployment across all projects */
  lastDeploymentAt?: Maybe<Scalars['DateTime']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  permissions: Array<HelpStationAdminContextWorkspacePermission>;
  plan: Plan;
  slackChannelId?: Maybe<Scalars['String']['output']>;
  supportTierOverride?: Maybe<SupportTierOverride>;
};

export type HelpStationAdminContextWorkspaceMemberUserInfo = {
  __typename?: 'HelpStationAdminContextWorkspaceMemberUserInfo';
  avatar?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
  username?: Maybe<Scalars['String']['output']>;
};

export type HelpStationAdminContextWorkspacePermission = {
  __typename?: 'HelpStationAdminContextWorkspacePermission';
  role: TeamRole;
  user: HelpStationAdminContextWorkspaceMemberUserInfo;
  workspaceId: Scalars['String']['output'];
};

export type HelpStationAuditLogEntry = {
  __typename?: 'HelpStationAuditLogEntry';
  actorEmail?: Maybe<Scalars['String']['output']>;
  actorTokenName?: Maybe<Scalars['String']['output']>;
  actorTokenType?: Maybe<Scalars['String']['output']>;
  actorType: Scalars['String']['output'];
  actorUserId?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  environmentId?: Maybe<Scalars['String']['output']>;
  eventType: Scalars['String']['output'];
  id: Scalars['String']['output'];
  payload?: Maybe<Scalars['String']['output']>;
  projectId?: Maybe<Scalars['String']['output']>;
};

export type HelpStationDnsRecord = {
  __typename?: 'HelpStationDnsRecord';
  currentValue: Scalars['String']['output'];
  fqdn: Scalars['String']['output'];
  hostLabel: Scalars['String']['output'];
  purpose: Scalars['String']['output'];
  recordType: Scalars['String']['output'];
  requiredValue: Scalars['String']['output'];
  status: Scalars['String']['output'];
  zone: Scalars['String']['output'];
};

export type HelpStationDomainInfo = {
  __typename?: 'HelpStationDomainInfo';
  domain: Scalars['String']['output'];
  environmentId: Scalars['String']['output'];
  environmentName: Scalars['String']['output'];
  projectId: Scalars['String']['output'];
  projectName: Scalars['String']['output'];
  serviceId: Scalars['String']['output'];
  serviceName: Scalars['String']['output'];
};

export type HelpStationDomainLookupResult = {
  __typename?: 'HelpStationDomainLookupResult';
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  domain: Scalars['String']['output'];
  domainId?: Maybe<Scalars['String']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  found: Scalars['Boolean']['output'];
  service?: Maybe<HelpStationDomainLookupService>;
  workspace?: Maybe<HelpStationDomainLookupWorkspace>;
};

export type HelpStationDomainLookupService = {
  __typename?: 'HelpStationDomainLookupService';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  projectId: Scalars['String']['output'];
  projectName: Scalars['String']['output'];
};

export type HelpStationDomainLookupWorkspace = {
  __typename?: 'HelpStationDomainLookupWorkspace';
  adminEmails: Array<Scalars['String']['output']>;
  adminUserIds: Array<Scalars['String']['output']>;
  banReason?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  isPro: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
};

export type HelpStationDomainOwnershipResult = {
  __typename?: 'HelpStationDomainOwnershipResult';
  domain: Scalars['String']['output'];
  onRailway: Scalars['Boolean']['output'];
  ownedByUser: Scalars['Boolean']['output'];
};

export type HelpStationDomainStatusResult = {
  __typename?: 'HelpStationDomainStatusResult';
  certificateErrorMessage?: Maybe<Scalars['String']['output']>;
  certificateErrorType?: Maybe<Scalars['String']['output']>;
  certificateStatus: Scalars['String']['output'];
  certificateStatusDetailed?: Maybe<Scalars['String']['output']>;
  dnsRecords: Array<HelpStationDnsRecord>;
  domain: Scalars['String']['output'];
  environmentId?: Maybe<Scalars['String']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  found: Scalars['Boolean']['output'];
  service?: Maybe<HelpStationDomainLookupService>;
  verificationDnsHost?: Maybe<Scalars['String']['output']>;
  verificationToken?: Maybe<Scalars['String']['output']>;
  verified: Scalars['Boolean']['output'];
};

export type HelpStationEnvironmentInfoV2 = {
  __typename?: 'HelpStationEnvironmentInfoV2';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  services: Array<HelpStationServiceInfoV2>;
};

export type HelpStationLogEntry = {
  __typename?: 'HelpStationLogEntry';
  deploymentId?: Maybe<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  serviceId?: Maybe<Scalars['String']['output']>;
  severity?: Maybe<Scalars['String']['output']>;
  timestamp: Scalars['String']['output'];
};

export type HelpStationNetworkConnection = {
  __typename?: 'HelpStationNetworkConnection';
  droppedCount: Scalars['Int']['output'];
  dstAddr: Scalars['String']['output'];
  dstPort: Scalars['Int']['output'];
  firstSeen: Scalars['String']['output'];
  flowCount: Scalars['Int']['output'];
  l4Protocol: Scalars['String']['output'];
  lastSeen: Scalars['String']['output'];
  peerKind: Scalars['String']['output'];
  peerServiceId?: Maybe<Scalars['String']['output']>;
  srcAddr: Scalars['String']['output'];
  srcPort: Scalars['Int']['output'];
  totalBytes: Scalars['Int']['output'];
  totalPackets: Scalars['Int']['output'];
};

export type HelpStationNetworkFlowLog = {
  __typename?: 'HelpStationNetworkFlowLog';
  byteCount: Scalars['Int']['output'];
  captureEnd: Scalars['String']['output'];
  captureStart: Scalars['String']['output'];
  deploymentId: Scalars['String']['output'];
  direction: Scalars['String']['output'];
  dropCause?: Maybe<Scalars['String']['output']>;
  dstAddr: Scalars['String']['output'];
  dstPort: Scalars['Int']['output'];
  flowId: Scalars['String']['output'];
  l4LatencyMs: Scalars['Float']['output'];
  l4Protocol: Scalars['String']['output'];
  packetCount: Scalars['Int']['output'];
  peerKind: Scalars['String']['output'];
  peerServiceId?: Maybe<Scalars['String']['output']>;
  serviceId: Scalars['String']['output'];
  srcAddr: Scalars['String']['output'];
  srcPort: Scalars['Int']['output'];
};

export type HelpStationPlanLimitOverrideScopedOp =
  | 'set'
  | 'unset';

export type HelpStationPlanLimitOverrideScopedResult = {
  __typename?: 'HelpStationPlanLimitOverrideScopedResult';
  afterValue?: Maybe<Scalars['JSON']['output']>;
  beforeValue?: Maybe<Scalars['JSON']['output']>;
  changed: Scalars['Boolean']['output'];
  removed: Scalars['Boolean']['output'];
};

export type HelpStationPlanLimitOverrideUpsertScopedInput = {
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  op: HelpStationPlanLimitOverrideScopedOp;
  path: Scalars['String']['input'];
  value?: InputMaybe<Scalars['JSON']['input']>;
  workspaceId: Scalars['String']['input'];
};

export type HelpStationProjectInfo = {
  __typename?: 'HelpStationProjectInfo';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  services: Array<HelpStationServiceInfo>;
};

export type HelpStationProjectInfoV2 = {
  __typename?: 'HelpStationProjectInfoV2';
  environments: Array<HelpStationEnvironmentInfoV2>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type HelpStationProjectVolume = {
  __typename?: 'HelpStationProjectVolume';
  currentSizeMB: Scalars['Float']['output'];
  environmentId: Scalars['String']['output'];
  environmentName: Scalars['String']['output'];
  isForked: Scalars['Boolean']['output'];
  lastOnlineResizeFailedAt?: Maybe<Scalars['DateTime']['output']>;
  mountPath: Scalars['String']['output'];
  name: Scalars['String']['output'];
  planMaxSizeMB: Scalars['Int']['output'];
  serviceId?: Maybe<Scalars['String']['output']>;
  serviceName?: Maybe<Scalars['String']['output']>;
  sizeMB: Scalars['Int']['output'];
  state?: Maybe<Scalars['String']['output']>;
  volumeId: Scalars['String']['output'];
  volumeInstanceId: Scalars['String']['output'];
  workspaceId: Scalars['String']['output'];
  workspaceName: Scalars['String']['output'];
};

export type HelpStationRailwayDomainInfo = {
  __typename?: 'HelpStationRailwayDomainInfo';
  domain: Scalars['String']['output'];
  id: Scalars['String']['output'];
  isTransferEligible: Scalars['Boolean']['output'];
  registeredAt: Scalars['DateTime']['output'];
  status: Scalars['String']['output'];
  transferEligibleAt: Scalars['DateTime']['output'];
};

export type HelpStationResizeVolumeInput = {
  preferOnline: Scalars['Boolean']['input'];
  reason: Scalars['String']['input'];
  targetSizeMB: Scalars['Int']['input'];
  volumeInstanceId: Scalars['String']['input'];
};

export type HelpStationResizeVolumeMode =
  | 'OFFLINE'
  | 'ONLINE';

export type HelpStationResizeVolumeResult = {
  __typename?: 'HelpStationResizeVolumeResult';
  mode: HelpStationResizeVolumeMode;
};

export type HelpStationServiceInfo = {
  __typename?: 'HelpStationServiceInfo';
  id: Scalars['String']['output'];
  latestDeploymentStatus?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
};

export type HelpStationServiceInfoV2 = {
  __typename?: 'HelpStationServiceInfoV2';
  hasVolume: Scalars['Boolean']['output'];
  id: Scalars['String']['output'];
  latestDeploymentAt?: Maybe<Scalars['String']['output']>;
  latestDeploymentStatus?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
};

export type HelpStationServiceUsage = {
  __typename?: 'HelpStationServiceUsage';
  cpuDollars: Scalars['Float']['output'];
  diskDollars: Scalars['Float']['output'];
  memoryDollars: Scalars['Float']['output'];
  networkDollars: Scalars['Float']['output'];
  projectId: Scalars['String']['output'];
  projectName: Scalars['String']['output'];
  serviceId: Scalars['String']['output'];
  serviceName: Scalars['String']['output'];
  totalDollars: Scalars['Float']['output'];
};

export type HelpStationThreadLookupResult = {
  __typename?: 'HelpStationThreadLookupResult';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  isPrivate: Scalars['Boolean']['output'];
  slug: Scalars['String']['output'];
  status: Scalars['String']['output'];
  subject: Scalars['String']['output'];
  topicDisplayName?: Maybe<Scalars['String']['output']>;
  topicSlug: Scalars['String']['output'];
};

export type HelpStationThreadSidebarInfo = {
  __typename?: 'HelpStationThreadSidebarInfo';
  users: Array<HelpStationAdminContextUserInfo>;
  workspaces: Array<HelpStationAdminContextWorkspaceInfo>;
};

export type HelpStationThreadTemplateInfo = {
  __typename?: 'HelpStationThreadTemplateInfo';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type HelpStationUserDomainsInfo = {
  __typename?: 'HelpStationUserDomainsInfo';
  domains: Array<HelpStationDomainInfo>;
  workspaceId: Scalars['String']['output'];
  workspaceName: Scalars['String']['output'];
};

export type HelpStationWorkspaceLimitsView = {
  __typename?: 'HelpStationWorkspaceLimitsView';
  baseLimit: Scalars['SubscriptionPlanLimit']['output'];
  effectiveLimit: Scalars['SubscriptionPlanLimit']['output'];
  limitsVersion: LimitsVersion;
  overrideConfig?: Maybe<Scalars['JSON']['output']>;
  overrideExpiresAt?: Maybe<Scalars['DateTime']['output']>;
  plan: Scalars['String']['output'];
};

export type HelpStationWorkspaceServicesInfo = {
  __typename?: 'HelpStationWorkspaceServicesInfo';
  projects: Array<HelpStationProjectInfo>;
  workspaceId: Scalars['String']['output'];
  workspaceName: Scalars['String']['output'];
};

export type HelpStationWorkspaceServicesInfoV2 = {
  __typename?: 'HelpStationWorkspaceServicesInfoV2';
  projects: Array<HelpStationProjectInfoV2>;
  workspaceId: Scalars['String']['output'];
  workspaceName: Scalars['String']['output'];
};

export type HelpStationWorkspaceUsage = {
  __typename?: 'HelpStationWorkspaceUsage';
  /** Railway Agent token usage spend for this billing period. Metered separately from compute; appears on Stripe invoices as the AgentUsage line item. */
  agentUsageDollars: Scalars['Float']['output'];
  /** Workspace's hard limit on Railway Agent spend in dollars. Null when no limit is set. */
  agentUsageHardLimitDollars?: Maybe<Scalars['Float']['output']>;
  /** Workspace's soft (warning) limit on Railway Agent spend in dollars. Null when no limit is set. */
  agentUsageSoftLimitDollars?: Maybe<Scalars['Float']['output']>;
  billingPeriodEnd: Scalars['DateTime']['output'];
  billingPeriodStart: Scalars['DateTime']['output'];
  creditsRemaining: Scalars['Float']['output'];
  includedCredits: Scalars['Float']['output'];
  plan: Scalars['String']['output'];
  services: Array<HelpStationServiceUsage>;
  totalUsageDollars: Scalars['Float']['output'];
  workspaceId: Scalars['String']['output'];
  workspaceName: Scalars['String']['output'];
};

export type HerokuApp = {
  __typename?: 'HerokuApp';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type HerokuImportVariablesInput = {
  environmentId: Scalars['String']['input'];
  herokuAppId: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};

/** The result of a log histogram query. */
export type Histogram = {
  __typename?: 'Histogram';
  /** The datapoints in the histogram */
  buckets: Array<HistogramBucket>;
  /** The number of seconds per datapoint */
  stepSeconds: Scalars['Int']['output'];
};

/** A single point in a histogram */
export type HistogramBucket = {
  __typename?: 'HistogramBucket';
  /** The number of logs that occurred in this time period */
  count: Scalars['Int']['output'];
  /** The severity property of the log */
  severity: Scalars['String']['output'];
  /** The ISO timestamp of the data point */
  timestamp: Scalars['String']['output'];
};

export type Host = {
  __typename?: 'Host';
  clusterId: Scalars['String']['output'];
  clusterLabel?: Maybe<Scalars['String']['output']>;
  globalIPv4: Scalars['String']['output'];
  globalIPv6?: Maybe<Scalars['String']['output']>;
  hostId: Scalars['String']['output'];
  hostname: Scalars['String']['output'];
  localIPv4: Scalars['String']['output'];
  localIPv6?: Maybe<Scalars['String']['output']>;
  namespace: Scalars['String']['output'];
  overlayHID: Scalars['BigInt']['output'];
  region: Scalars['String']['output'];
  roles: Array<Scalars['String']['output']>;
  wireguardPublicKey: Scalars['String']['output'];
};

export type HostListItem = {
  __typename?: 'HostListItem';
  IP: Scalars['String']['output'];
  hostId: Scalars['String']['output'];
  hostname: Scalars['String']['output'];
  roles: Array<Scalars['String']['output']>;
};

export type HostMaintenanceEventType =
  | 'custom'
  | 'degradedPerformance'
  | 'offline';

export type HostMaintenanceNotificationImpact = {
  __typename?: 'HostMaintenanceNotificationImpact';
  cronDeployments: Scalars['Int']['output'];
  deployments: Scalars['Int']['output'];
  projects: Scalars['Int']['output'];
  replicatedDeployments: Scalars['Int']['output'];
  services: Scalars['Int']['output'];
  sleepingDeployments: Scalars['Int']['output'];
  statefulDeployments: Scalars['Int']['output'];
  statefulProjects: Scalars['Int']['output'];
  statefulServices: Scalars['Int']['output'];
  statefulUsers: Scalars['Int']['output'];
  statefulWorkspaces: Scalars['Int']['output'];
  statelessSingleDeployments: Scalars['Int']['output'];
  users: Scalars['Int']['output'];
  vips: Array<HostMaintenanceVipImpactDetail>;
  workspaces: Scalars['Int']['output'];
};

export type HostMaintenanceNotificationsProgress = {
  __typename?: 'HostMaintenanceNotificationsProgress';
  completed: Scalars['Boolean']['output'];
  cronJobsSkipped: Scalars['Int']['output'];
  currentBatch: Scalars['Int']['output'];
  currentPhase: Scalars['String']['output'];
  dryRun: Scalars['Boolean']['output'];
  eventsCreated: Scalars['Int']['output'];
  eventsFailed: Scalars['Int']['output'];
  eventsSkipped: Scalars['Int']['output'];
  failoverStateless: Scalars['Boolean']['output'];
  failoversFailed: Scalars['Int']['output'];
  failoversTriggered: Scalars['Int']['output'];
  processing: Scalars['Boolean']['output'];
  replicaServicesSkipped: Scalars['Int']['output'];
  startTime: Scalars['Float']['output'];
  totalBatches: Scalars['Int']['output'];
  totalDeployments: Scalars['Int']['output'];
};

export type HostMaintenanceVipImpactDetail = {
  __typename?: 'HostMaintenanceVipImpactDetail';
  deploymentId: Scalars['String']['output'];
  environmentId: Scalars['String']['output'];
  environmentName: Scalars['String']['output'];
  projectId: Scalars['String']['output'];
  projectName: Scalars['String']['output'];
  serviceId: Scalars['String']['output'];
  serviceName: Scalars['String']['output'];
  supportTierOverride: Scalars['String']['output'];
  workspaceId: Scalars['String']['output'];
  workspaceName: Scalars['String']['output'];
};

export type HostMaintenanceWorkflowInfo = {
  __typename?: 'HostMaintenanceWorkflowInfo';
  stackerHostname: Scalars['String']['output'];
  workflowId: Scalars['String']['output'];
};

/** The result of an HTTP duration metrics query. */
export type HttpDurationMetricsResult = {
  __typename?: 'HttpDurationMetricsResult';
  /** The samples of HTTP duration metrics. */
  samples: Array<HttpDurationMetricsSample>;
};

/** A single sample of HTTP duration metrics. */
export type HttpDurationMetricsSample = {
  __typename?: 'HttpDurationMetricsSample';
  /** 50th percentile (median) request duration in milliseconds. */
  p50: Scalars['Float']['output'];
  /** 90th percentile request duration in milliseconds. */
  p90: Scalars['Float']['output'];
  /** 95th percentile request duration in milliseconds. */
  p95: Scalars['Float']['output'];
  /** 99th percentile request duration in milliseconds. */
  p99: Scalars['Float']['output'];
  /** The timestamp of the sample. Represented as number of seconds since the Unix epoch. */
  ts: Scalars['Int']['output'];
};

/** The result of a http logs query. */
export type HttpLog = {
  __typename?: 'HttpLog';
  /** The client user agent */
  clientUa: Scalars['String']['output'];
  /** The deployment ID that was requested */
  deploymentId: Scalars['String']['output'];
  /** The deployment instance ID that was requested */
  deploymentInstanceId: Scalars['String']['output'];
  /** The downstream HTTP protocol version */
  downstreamProto: Scalars['String']['output'];
  /** The edge region the client connected to */
  edgeRegion: Scalars['String']['output'];
  /** The requested host */
  host: Scalars['String']['output'];
  /** The http status of the log */
  httpStatus: Scalars['Int']['output'];
  /** The request HTTP method */
  method: Scalars['String']['output'];
  /** The requested path */
  path: Scalars['String']['output'];
  /** The unique request ID */
  requestId: Scalars['String']['output'];
  /** Details about the upstream response */
  responseDetails: Scalars['String']['output'];
  /** Received bytes */
  rxBytes: Scalars['Int']['output'];
  /** The source IP of the request */
  srcIp: Scalars['String']['output'];
  /** The timestamp the log was created */
  timestamp: Scalars['String']['output'];
  /** The total duration the request took */
  totalDuration: Scalars['Int']['output'];
  /** Outgoing bytes */
  txBytes: Scalars['Int']['output'];
  /** The upstream address */
  upstreamAddress: Scalars['String']['output'];
  /** Any upstream errors that occurred */
  upstreamErrors: Scalars['String']['output'];
  /** The upstream HTTP protocol version */
  upstreamProto: Scalars['String']['output'];
  /** How long the upstream request took to respond */
  upstreamRqDuration: Scalars['Int']['output'];
};

/** HTTP metrics grouped by status code. */
export type HttpMetricsByStatusResult = {
  __typename?: 'HttpMetricsByStatusResult';
  /** The samples of HTTP metrics for this status code. */
  samples: Array<HttpMetricsSample>;
  /** The HTTP status code. */
  statusCode: Scalars['Int']['output'];
};

/** The result of an HTTP metrics query. */
export type HttpMetricsResult = {
  __typename?: 'HttpMetricsResult';
  /** The samples of HTTP metrics. */
  samples: Array<HttpMetricsSample>;
};

/** A single sample of an HTTP metric. */
export type HttpMetricsSample = {
  __typename?: 'HttpMetricsSample';
  /** The timestamp of the sample. Represented as number of seconds since the Unix epoch. */
  ts: Scalars['Int']['output'];
  /** The value of the sample (count of requests). */
  value: Scalars['Float']['output'];
};

export type Incident = {
  __typename?: 'Incident';
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['String']['output'];
  message: Scalars['String']['output'];
  status: IncidentStatus;
  url: Scalars['String']['output'];
};

export type IncidentStatus =
  | 'IDENTIFIED'
  | 'INVESTIGATING'
  | 'MONITORING'
  | 'RESOLVED';

export type Integration = Node & {
  __typename?: 'Integration';
  config: Scalars['JSON']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  projectId: Scalars['String']['output'];
};

export type IntegrationAuth = Node & {
  __typename?: 'IntegrationAuth';
  id: Scalars['ID']['output'];
  integrations: IntegrationAuthIntegrationsConnection;
  provider: Scalars['String']['output'];
  providerId: Scalars['String']['output'];
};


export type IntegrationAuthIntegrationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type IntegrationAuthIntegrationsConnection = {
  __typename?: 'IntegrationAuthIntegrationsConnection';
  edges: Array<IntegrationAuthIntegrationsConnectionEdge>;
  pageInfo: PageInfo;
};

export type IntegrationAuthIntegrationsConnectionEdge = {
  __typename?: 'IntegrationAuthIntegrationsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Integration;
};

export type IntegrationCreateInput = {
  config: Scalars['JSON']['input'];
  integrationAuthId?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
};

export type IntegrationUpdateInput = {
  config: Scalars['JSON']['input'];
  integrationAuthId?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
};

/** The result of a frontend invalidation subscription */
export type InvalidationResult = {
  __typename?: 'InvalidationResult';
  /** The unique ID of the invalidation */
  id: Scalars['String']['output'];
};

export type InviteCode = Node & {
  __typename?: 'InviteCode';
  code: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  project: Project;
  projectId: Scalars['String']['output'];
  role: ProjectRole;
};

export type InvoiceStandingDetails = {
  __typename?: 'InvoiceStandingDetails';
  periodEnd: Scalars['String']['output'];
  total: Scalars['Int']['output'];
};

export type JobApplicationCreateInput = {
  email: Scalars['String']['input'];
  jobId: Scalars['String']['input'];
  name: Scalars['String']['input'];
  why: Scalars['String']['input'];
};

export type KeyType =
  | 'KEY_TYPE_ECDSA'
  | 'KEY_TYPE_RSA_2048'
  | 'KEY_TYPE_RSA_4096'
  | 'KEY_TYPE_UNSPECIFIED'
  | 'UNRECOGNIZED';

export type LighthouseToken = {
  __typename?: 'LighthouseToken';
  clusterId: Scalars['String']['output'];
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  createdBy: Scalars['String']['output'];
  id: Scalars['String']['output'];
  key: Scalars['String']['output'];
  reason: Scalars['String']['output'];
  token: Scalars['String']['output'];
  ttl: Scalars['Int']['output'];
};

export type LimitsVersion =
  | 'V1'
  | 'V2';

export type LockdownStatus = {
  __typename?: 'LockdownStatus';
  allProvisionsDisabledMsg?: Maybe<Scalars['String']['output']>;
  anonProvisionsDisabledMsg?: Maybe<Scalars['String']['output']>;
  autoRefundsRandomRejectForHumanReviewValue?: Maybe<Scalars['Int']['output']>;
  autoRefundsShowToHumanValue?: Maybe<Scalars['Int']['output']>;
  bucketProvisionsDisabledMsg?: Maybe<Scalars['String']['output']>;
  freeProvisionsDisabledMsg?: Maybe<Scalars['String']['output']>;
  nonProProvisionsDisabledMsg?: Maybe<Scalars['String']['output']>;
  nonVerifiedProvisionsDisabledMsg?: Maybe<Scalars['String']['output']>;
  sandboxProvisionsDisabledMsg?: Maybe<Scalars['String']['output']>;
  signupsDisabledMsg?: Maybe<Scalars['String']['output']>;
  volumeProvisionsDisabledMsg?: Maybe<Scalars['String']['output']>;
};

/** The result of a logs query. */
export type Log = {
  __typename?: 'Log';
  /** The attributes that were parsed from a structured log */
  attributes: Array<LogAttribute>;
  /** The contents of the log message */
  message: Scalars['String']['output'];
  /** The severity of the log message (eg. err) */
  severity?: Maybe<Scalars['String']['output']>;
  /** The tags that were associated with the log */
  tags?: Maybe<LogTags>;
  /** The timestamp of the log message in format RFC3339 (nano) */
  timestamp: Scalars['String']['output'];
};

/** The attributes associated with a structured log */
export type LogAttribute = {
  __typename?: 'LogAttribute';
  key: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

/** A single point in a histogram */
export type LogAttributesResult = {
  __typename?: 'LogAttributesResult';
  key: Scalars['String']['output'];
};

export type LogIssue = {
  __typename?: 'LogIssue';
  count: Scalars['Int']['output'];
  matched: Scalars['String']['output'];
  message: Scalars['String']['output'];
  pattern: Scalars['String']['output'];
  severity: Scalars['String']['output'];
};

export type LogLimits = {
  __typename?: 'LogLimits';
  retentionDays: Scalars['Float']['output'];
};

export type LogSpewPattern = {
  __typename?: 'LogSpewPattern';
  count: Scalars['Int']['output'];
  lastSeen: Scalars['String']['output'];
  sample: Scalars['String']['output'];
  template: Scalars['String']['output'];
};

/** The tags associated with a specific log */
export type LogTags = {
  __typename?: 'LogTags';
  deploymentId?: Maybe<Scalars['String']['output']>;
  deploymentInstanceId?: Maybe<Scalars['String']['output']>;
  environmentId?: Maybe<Scalars['String']['output']>;
  /** @deprecated Plugins have been removed */
  pluginId?: Maybe<Scalars['String']['output']>;
  projectId?: Maybe<Scalars['String']['output']>;
  serviceId?: Maybe<Scalars['String']['output']>;
  snapshotId?: Maybe<Scalars['String']['output']>;
};

export type LoginSessionAuthInput = {
  code: Scalars['String']['input'];
  hostname?: InputMaybe<Scalars['String']['input']>;
};

export type MaintainerTemplatesResponse = {
  __typename?: 'MaintainerTemplatesResponse';
  avatar?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  profile: PartnerProfile;
  templates: Array<Template>;
};

export type MaintainerWorkspace = {
  __typename?: 'MaintainerWorkspace';
  avatar?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  partnerProfile?: Maybe<PartnerProfile>;
};

export type Maintenance = {
  __typename?: 'Maintenance';
  id: Scalars['String']['output'];
  message: Scalars['String']['output'];
  start: Scalars['DateTime']['output'];
  status: MaintenanceStatus;
  url: Scalars['String']['output'];
};

export type MaintenanceStatus =
  | 'COMPLETED'
  | 'INPROGRESS'
  | 'NOTSTARTEDYET';

export type MatchingDeploymentInstance = {
  __typename?: 'MatchingDeploymentInstance';
  environmentId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  isCron: Scalars['Boolean']['output'];
  isStateless: Scalars['Boolean']['output'];
  plan: Scalars['String']['output'];
  projectId: Scalars['String']['output'];
  replicas: Scalars['Int']['output'];
  runtime: Scalars['String']['output'];
  serviceId?: Maybe<Scalars['String']['output']>;
  volumeInstanceId?: Maybe<Scalars['String']['output']>;
  workspaceId?: Maybe<Scalars['String']['output']>;
  workspaceName?: Maybe<Scalars['String']['output']>;
};

export type MatchingVolumeInstance = {
  __typename?: 'MatchingVolumeInstance';
  detachmentReason: VolumeDetachmentReason;
  environmentId: Scalars['String']['output'];
  externalId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  plan: Scalars['String']['output'];
  projectId: Scalars['String']['output'];
  serviceId?: Maybe<Scalars['String']['output']>;
  volumeId?: Maybe<Scalars['String']['output']>;
  workspaceId?: Maybe<Scalars['String']['output']>;
  workspaceName?: Maybe<Scalars['String']['output']>;
};

export type MergeDeploymentFixPrResponse = {
  __typename?: 'MergeDeploymentFixPRResponse';
  error?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

/** A single sample of a metric. */
export type Metric = {
  __typename?: 'Metric';
  /** The timestamp of the sample. Represented has number of seconds since the Unix epoch. */
  ts: Scalars['Int']['output'];
  /** The value of the sample. */
  value: Scalars['Float']['output'];
};

/** A thing that can be measured on Railway. */
export type MetricMeasurement =
  | 'BACKUP_USAGE_GB'
  | 'CPU_LIMIT'
  | 'CPU_USAGE'
  | 'CPU_USAGE_2'
  | 'DISK_USAGE_GB'
  | 'EPHEMERAL_DISK_USAGE_GB'
  | 'MEASUREMENT_UNSPECIFIED'
  | 'MEMORY_LIMIT_GB'
  | 'MEMORY_USAGE_GB'
  | 'NETWORK_RX_GB'
  | 'NETWORK_TX_GB'
  | 'UNRECOGNIZED';

/** A property that can be used to group metrics. */
export type MetricTag =
  | 'DEPLOYMENT_ID'
  | 'DEPLOYMENT_INSTANCE_ID'
  | 'ENVIRONMENT_ID'
  | 'HOST_TYPE'
  | 'KEY_UNSPECIFIED'
  | 'PLUGIN_ID'
  | 'PROJECT_ID'
  | 'REGION'
  | 'SERVICE_ID'
  | 'UNRECOGNIZED'
  | 'VOLUME_ID'
  | 'VOLUME_INSTANCE_ID';

/** The tags that were used to group the metric. */
export type MetricTags = {
  __typename?: 'MetricTags';
  deploymentId?: Maybe<Scalars['String']['output']>;
  deploymentInstanceId?: Maybe<Scalars['String']['output']>;
  environmentId?: Maybe<Scalars['String']['output']>;
  /** @deprecated Plugins have been removed */
  pluginId?: Maybe<Scalars['String']['output']>;
  projectId?: Maybe<Scalars['String']['output']>;
  region?: Maybe<Scalars['String']['output']>;
  serviceId?: Maybe<Scalars['String']['output']>;
  volumeId?: Maybe<Scalars['String']['output']>;
  volumeInstanceId?: Maybe<Scalars['String']['output']>;
};

/** The result of a metrics query. */
export type MetricsReplicaResult = {
  __typename?: 'MetricsReplicaResult';
  /** The measurement of the metric. */
  measurement: MetricMeasurement;
  /** The name of the replica. */
  replicaName: Scalars['String']['output'];
  /** The samples of the metric. */
  values: Array<Metric>;
};

/** The result of a metrics query. */
export type MetricsResult = {
  __typename?: 'MetricsResult';
  /** The measurement of the metric. */
  measurement: MetricMeasurement;
  /** The tags that were used to group the metric. Only the tags that were used to by will be present. */
  tags: MetricTags;
  /** The samples of the metric. */
  values: Array<Metric>;
};

export type MigrateStackerProgress = {
  __typename?: 'MigrateStackerProgress';
  deploymentInstanceCount: Scalars['Int']['output'];
  failedDeploymentInstances: Array<Scalars['String']['output']>;
  finished: Scalars['Boolean']['output'];
  migratedDeploymentInstances: Array<Scalars['String']['output']>;
};

export type MissingCommandAlertInput = {
  page: Scalars['String']['input'];
  text: Scalars['String']['input'];
};

export type MobileAuthTokenResult = {
  __typename?: 'MobileAuthTokenResult';
  expiresIn: Scalars['Int']['output'];
  token: Scalars['String']['output'];
};

/** A collection belonging to a MongoDB database */
export type MongoCollection = {
  __typename?: 'MongoCollection';
  count: Scalars['Int']['output'];
  data: Scalars['JSON']['output'];
  name: Scalars['String']['output'];
};

export type MonitorAlertResourceType =
  | 'SERVICE'
  | 'VOLUME';

export type MonitorConfigInput = {
  threshold?: InputMaybe<MonitorThresholdConfigInput>;
  type: MonitorType;
};

export type MonitorStatus =
  | 'ALERT'
  | 'OK';

export type MonitorThresholdCondition =
  | 'above'
  | 'below';

export type MonitorThresholdConfig = {
  __typename?: 'MonitorThresholdConfig';
  condition: MonitorThresholdCondition;
  measurement?: Maybe<MetricMeasurement>;
  threshold: Scalars['Float']['output'];
  type: Scalars['String']['output'];
};

export type MonitorThresholdConfigInput = {
  condition: MonitorThresholdCondition;
  measurement?: InputMaybe<MetricMeasurement>;
  threshold: Scalars['Float']['input'];
};

export type MonitorType =
  | 'threshold';

export type MonorepoImportStatus =
  | 'COMPLETED'
  | 'FAILED'
  | 'LOADING';

export type MonorepoImportStatusUpdate = {
  __typename?: 'MonorepoImportStatusUpdate';
  error?: Maybe<Scalars['String']['output']>;
  status: MonorepoImportStatus;
  totalPackages?: Maybe<Scalars['Int']['output']>;
};

export type MonthlyReferralCodeDiscount = {
  __typename?: 'MonthlyReferralCodeDiscount';
  amountCents: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  remainingCouponApplications: Scalars['Int']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Approve a ban appeal. WORKSPACE appeals lift the workspace restriction; USER appeals remove the submitting user from the workspace. */
  adminApproveBanAppeal: Scalars['Boolean']['output'];
  /** Bans an image from being deployed */
  adminBanImage: BannedImage;
  /** Clear traffic limit for a domain */
  adminClearDomainTrafficLimit: Scalars['Boolean']['output'];
  /** Create a full Stripe Connect withdrawal account for a customer */
  adminCreateFullStripeConnectWithdrawalAccount: Scalars['Boolean']['output'];
  /** Deletes a custom domain without project auth. For orphaned domains where the project has been hard-deleted. */
  adminCustomDomainDelete: Scalars['Boolean']['output'];
  /** Check a GitHub App installation's accessibility and permissions */
  adminDebugInstallation: AdminDebugInstallationResult;
  /** Delete the user with the provided userId */
  adminDelete: Scalars['Boolean']['output'];
  /** Delete a public repo without an installation from the cache */
  adminDeleteRepoCache: Scalars['Boolean']['output'];
  /** Deny a ban appeal. Leaves the underlying workspace restriction unchanged. */
  adminDenyBanAppeal: Scalars['Boolean']['output'];
  /** Drain a single deployment to metal */
  adminDrainDeploymentToMetal: Scalars['Boolean']['output'];
  /** Duplicates the invoice with the provided invoice ID */
  adminDuplicateInvoice: Scalars['String']['output'];
  /** Trigger an error */
  adminError: Scalars['Boolean']['output'];
  /** Force unlocks a volume instance. Use when a lock is stuck and needs manual intervention. */
  adminForceUnlockVolumeInstance: Scalars['Boolean']['output'];
  /** Gift a Pro subscription to a workspace */
  adminGiftProSubscription: Scalars['Boolean']['output'];
  /** Issue a refund for the given RefundRequest */
  adminIssueRefundForRefundRequest: Scalars['Boolean']['output'];
  /** Soft deletes an OAuth client (admin only) */
  adminOAuthClientDelete: Scalars['Boolean']['output'];
  /** Revokes all OAuth grants for a client (admin only) */
  adminOAuthClientRevokeAllGrants: Scalars['Boolean']['output'];
  /** Restores a soft-deleted OAuth client (admin only) */
  adminOAuthClientUndelete: Scalars['Boolean']['output'];
  /** Override a customer's withdrawal platforms */
  adminOverrideCustomerWithdrawalPlatforms: Scalars['Boolean']['output'];
  /** Override a workspace's support tier */
  adminOverrideWorkspaceSupportTier: Scalars['Boolean']['output'];
  /** Block canvas access for a project (admin only) */
  adminProjectCanvasBlock: Scalars['Boolean']['output'];
  /** Disable canvas mutation logging for a project (admin only) */
  adminProjectCanvasMutationLoggingDisable: Scalars['Boolean']['output'];
  /** Enable canvas mutation logging for a project (admin only) */
  adminProjectCanvasMutationLoggingEnable: Scalars['Boolean']['output'];
  /** Unblock canvas access for a project (admin only) */
  adminProjectCanvasUnblock: Scalars['Boolean']['output'];
  /** Push the canonical Metadata (projectId, environmentId, volumeId) for a volume instance to its stacker's labels file. Used to repair volumes whose metric tagging is broken because the labels file is missing fields the exporter needs. */
  adminPushVolumeInstanceMetadata: Scalars['Boolean']['output'];
  /** Take action on radar scan matches (creates events then applies action) */
  adminRadarAction: RadarActionResult;
  /** Cancel a running radar scan */
  adminRadarCancelScan: Scalars['Boolean']['output'];
  /** Apply action to existing radar events by ID */
  adminRadarEventAction: RadarActionResult;
  /** Delete a radar list */
  adminRadarListDelete: Scalars['Boolean']['output'];
  /** Create or update a radar list */
  adminRadarListUpsert: RadarList;
  /** Delete a radar rule */
  adminRadarRuleDelete: Scalars['Boolean']['output'];
  /** Create or update a radar rule */
  adminRadarRuleUpsert: RadarRule;
  /** Start a manual radar scan for a rule. If applyAction is true, the scan will also retroactively apply the rule's BAN or RESTRICT action to every match as candidates stream through (handles >10k matches). */
  adminRadarStartScan: Scalars['Boolean']['output'];
  /** Applies an admin referral code to an existing workspace */
  adminReferralCodeApplyToWorkspace: Scalars['Boolean']['output'];
  /** Creates a new admin referral code */
  adminReferralCodeCreate: AdminReferralCode;
  /** Deletes an admin referral code (soft delete) */
  adminReferralCodeDelete: Scalars['Boolean']['output'];
  /** Updates an existing admin referral code */
  adminReferralCodeUpdate: AdminReferralCode;
  /** Fetch all repos for a GitHub App installation and update the cache */
  adminRefreshInstallationRepos: Scalars['Int']['output'];
  /** Refresh the cached data for a specific postgres-ha cluster */
  adminRefreshPostgresHaCluster?: Maybe<PostgresHaCluster>;
  /** Refresh the cached data for a specific postgres-pitr service */
  adminRefreshPostgresPitrService?: Maybe<PostgresPitrService>;
  /** Re-fetch and cache a public repo from GitHub */
  adminRefreshPublicRepoCache: Scalars['Boolean']['output'];
  /** Remove phantom deployment instances */
  adminRemovePhantomInstances: Scalars['Boolean']['output'];
  /** Remove the resource limit overrides for a service instance (revert to plan defaults) */
  adminRemoveServiceInstanceLimitOverride: Scalars['Boolean']['output'];
  /** Send host maintenance notifications to users with deployments on a specific host */
  adminSendHostMaintenanceNotifications: Scalars['String']['output'];
  /** Send a test host maintenance notification to the calling admin user */
  adminSendHostMaintenanceTestNotification: Scalars['Boolean']['output'];
  /** Sends a notification to workspace members */
  adminSendNotification: Scalars['Boolean']['output'];
  /** Set traffic limit for a domain */
  adminSetDomainTrafficLimit: Scalars['Boolean']['output'];
  /** Set the resource limits for a service instance */
  adminSetServiceInstanceLimitOverride: Scalars['Boolean']['output'];
  /** Simulate usage on a customer */
  adminSimulateStripeUsageOnCustomer: Scalars['Boolean']['output'];
  /** Create or update a spend commitment for a customer (admin only) */
  adminSpendCommitmentUpsert: Scalars['Boolean']['output'];
  /** Sync HTTP routes for a service (admin only). Re-syncs endpoints from private networking to HTTP routes. */
  adminSyncHTTPRoutes: SyncRoutesResult;
  /** Sync TCP routes for a service (admin only). Re-syncs endpoints from private networking to TCP routes. */
  adminSyncTCPRoutes: SyncRoutesResult;
  /** Trigger a manual etcd defragmentation run for a postgres-ha cluster */
  adminTriggerEtcdDefrag: Scalars['Boolean']['output'];
  /** SSH into the service and trigger an immediate full pgBackRest backup. Returns true if the SSH command was dispatched; false if the service has no cached deployment instance or the SSH call failed. */
  adminTriggerPitrFullBackup: Scalars['Boolean']['output'];
  /** Trigger an immediate run of the postgres-ha monitor schedule */
  adminTriggerPostgresHaMonitor: Scalars['Boolean']['output'];
  /** Trigger an immediate run of the postgres-pitr monitor schedule */
  adminTriggerPostgresPitrMonitor: Scalars['Boolean']['output'];
  /** Trigger routing repair workflow for a service (admin only). Repairs privnet routes, service domains, custom domains, and TCP allocations. */
  adminTriggerRoutingRepair: RoutingRepairResult;
  /** Trigger a transactional email */
  adminTriggerTransactionalEmail: Scalars['Boolean']['output'];
  /** Trigger the workspace volume deletion resolution workflow */
  adminTriggerWorkspaceVolumeDeletionResolutionWorkflow: Scalars['Boolean']['output'];
  /** Unbans an image */
  adminUnbanImage: Scalars['Boolean']['output'];
  /** Mark the given email as unsubscribed in Customer.io. Works for both Railway users and arbitrary emails (e.g. forwarded recipients with no Railway account). */
  adminUnsubscribeEmail: AdminUnsubscribeEmailResult;
  /** Update auto refund settings. */
  adminUpdateAutoRefundSettings: Scalars['Boolean']['output'];
  /** Void an open Stripe invoice */
  adminVoidStripeInvoice: Scalars['Boolean']['output'];
  /** Link an existing Slack channel to a workspace */
  adminWorkspaceLinkSlackChannel: Scalars['Boolean']['output'];
  /** Mark a Slack channel as archived */
  adminWorkspaceToggleArchiveSlackChannel: Scalars['Boolean']['output'];
  /** Set agent usage limit for a workspace */
  agentUsageLimitSet: Scalars['Boolean']['output'];
  /** Analyze the GitHub backpressure queue to see how many duplicates exist without processing them. */
  analyzeGithubBackpressureQueue: GithubBackpressureQueueAnalysis;
  /** Creates a new API token. */
  apiTokenCreate: Scalars['String']['output'];
  /** Deletes an API token. */
  apiTokenDelete: Scalars['Boolean']['output'];
  /** Sets the base environment override for a deployment trigger. */
  baseEnvironmentOverride: Scalars['Boolean']['output'];
  /** Create a bucket in a project */
  bucketCreate: Bucket;
  /** Reset the credentials for a bucket in an environment */
  bucketCredentialsReset: BucketS3CompatibleCredentials;
  /** Updates a bucket. */
  bucketUpdate: Bucket;
  /** Temporal activity heartbeat */
  buildExtendDeadline: Scalars['Boolean']['output'];
  /** Merge a canvas layout from one environment into another. Re-computes the merge from current state and applies mutations. */
  canvasViewMerge: Scalars['Boolean']['output'];
  /** Triggers an email with the changelog for the provided slug */
  changelogSend: Scalars['Boolean']['output'];
  /** Send a message to the Railway AI assistant */
  chatSendMessage: ChatSendMessageResponse;
  /** Remove stale entries from the GitHub backpressure active set. Stale entries are deployments that have reached a terminal status (SUCCESS, FAILED, CRASHED, REMOVED, SKIPPED), are older than 96 hours, or weren't cleaned up. */
  cleanupStaleGithubBackpressureActive: GithubBackpressureCleanupResult;
  /** Clear the GitHub backpressure queue for a plan. Returns the number of items cleared. */
  clearGithubBackpressureQueue: Scalars['Int']['output'];
  /** Track events from the Railway CLI */
  cliEventTrack: Scalars['Boolean']['output'];
  /** Compact the GitHub backpressure queue for a plan by keeping only the newest deployment per service instance. Starts a Temporal workflow and returns the workflow ID. */
  compactGithubBackpressureQueue: Scalars['String']['output'];
  /** Creates a new refund support request */
  createRefundRequest: Scalars['Boolean']['output'];
  /** Create a new support thread */
  createSupportThread: SupportThread;
  /** Submit a ban appeal for a workspace the calling user is an admin of. Used by the in-dashboard appeal form behind the BAN_APPEAL_FORM flag. */
  createWorkspaceRestrictionAppeal: Scalars['Boolean']['output'];
  /** Creates a new custom domain. */
  customDomainCreate: CustomDomain;
  /** Deletes a custom domain. */
  customDomainDelete: Scalars['Boolean']['output'];
  /** Issues a new certificate */
  customDomainIssueCertificate: Scalars['Boolean']['output'];
  /** Updates a custom domain. */
  customDomainUpdate: Scalars['Boolean']['output'];
  /** Apply a credit to a customer */
  customerApplyCredit: Scalars['Boolean']['output'];
  /** Cancel an incomplete payment intent for a customer */
  customerCancelIncompletePaymentIntent: Scalars['Boolean']['output'];
  /** Cancel an incomplete subscription attempt */
  customerCancelIncompleteSubscription: Scalars['Boolean']['output'];
  /** Cancel a customer's subscription at the end of the billing period */
  customerCancelSubscription: Customer;
  /** Cancel all subscriptions for a customer */
  customerCancelSubscriptions: Scalars['Boolean']['output'];
  /** Complete a spend commitment subscription for a customer */
  customerCompleteSpendCommitmentSubscription: Scalars['Boolean']['output'];
  /** Complete a usage-based subscription for a customer */
  customerCompleteUsageSubscriptionV2: Scalars['Boolean']['output'];
  /** Create a Stripe billing portal for a customer */
  customerCreateBillingPortal: Scalars['String']['output'];
  /** Create a bounty payout for a customer */
  customerCreateBountyPayout: Scalars['Boolean']['output'];
  /** Create a free plan subscription for a customer */
  customerCreateFreePlanSubscription: Scalars['Boolean']['output'];
  /** Create a thread payout for a customer */
  customerCreateThreadPayout: Scalars['Boolean']['output'];
  /** Create a usage-based subscription for a customer */
  customerCreateUsageSubscriptionV2: CustomerCreateUsageSubscriptionV2Response;
  /** Delete all payment methods for a customer who has no subscriptions */
  customerDeletePaymentMethods: Customer;
  /** Delete a tax ID from a customer */
  customerDeleteTaxId: Customer;
  /** Purchase credits for a Railway customer */
  customerPurchaseCredits: Scalars['JSON']['output'];
  /** Renew a customer's cancelled subscription */
  customerRenewSubscription: Customer;
  /** Replace the default payment method for a customer */
  customerReplacePaymentMethod: CustomerReplacePaymentMethodResponse;
  /** Report all usage for a customer to Stripe for the current billing period */
  customerReportUsage: Scalars['Boolean']['output'];
  /** Subscribe a customer to a spend commitment */
  customerSubscribeToSpendCommitment: CustomerSubscribeToSpendCommitmentResponse;
  /** Toggle whether a customer is automatically withdrawing to credits */
  customerTogglePayoutsToCredits: Scalars['Boolean']['output'];
  /** Transfer credits from one customer to another */
  customerTransferCredits: Scalars['Boolean']['output'];
  /** Update a customer's billing address and/or tax ID */
  customerUpdateBillingDetails: Customer;
  /** Update a customer's billing email */
  customerUpdateBillingEmail: Customer;
  /** Void an incomplete spend commitment invoice */
  customerVoidIncompleteSpendCommitmentInvoice: Scalars['Boolean']['output'];
  /** Reset database password for a service in an environment. Not supported for Postgres HA clusters. */
  databasePasswordReset: DatabasePasswordResetResponse;
  /** Create a new compute cluster */
  dataplaneClusterCreate: Scalars['String']['output'];
  /** Create a new lighthouse token */
  dataplaneLighthouseTokenCreate: Scalars['String']['output'];
  /** Delete a lighthouse token */
  dataplaneLighthouseTokenDelete: Scalars['Boolean']['output'];
  /** Approves a deployment. */
  deploymentApprove: Scalars['Boolean']['output'];
  /** Cancels a deployment. */
  deploymentCancel: Scalars['Boolean']['output'];
  /** Acknowledge a deployment event. */
  deploymentEventAck: Scalars['Boolean']['output'];
  /** Invoke a deployment instance execution. */
  deploymentInstanceExecutionCreate: Scalars['Boolean']['output'];
  /** Redeploys a deployment. */
  deploymentRedeploy: Deployment;
  /** Removes a deployment. */
  deploymentRemove: Scalars['Boolean']['output'];
  /** Restarts a deployment. */
  deploymentRestart: Scalars['Boolean']['output'];
  /** Rolls back to a deployment. */
  deploymentRollback: Scalars['Boolean']['output'];
  /** Stops a deployment. */
  deploymentStop: Scalars['Boolean']['output'];
  /** Creates a deployment trigger. */
  deploymentTriggerCreate: DeploymentTrigger;
  /** Deletes a deployment trigger. */
  deploymentTriggerDelete: Scalars['Boolean']['output'];
  /** Updates a deployment trigger. */
  deploymentTriggerUpdate: DeploymentTrigger;
  /** Updates workspace's needs approval policy, without compromising security */
  deploymentsNeedApprovalUpdate: Scalars['Boolean']['output'];
  /** Disables CDN for a service, soft-deleting the edge config. */
  disableServiceCdn: Scalars['Boolean']['output'];
  /** Create services and volumes from docker compose */
  dockerComposeImport: DockerComposeImport;
  /** Verify Domain Connect state from callback */
  domainConnectStateVerify: DomainConnectStateVerifyResult;
  /** Generate a Domain Connect URL for one-click DNS configuration */
  domainConnectURLGenerate: DomainConnectUrlResult;
  /** Drain deployment instances from a stacker given a set of filters */
  drainStacker: Scalars['Boolean']['output'];
  /** Cancel draining workflow of a stacker */
  drainStackerCancel: Scalars['Boolean']['output'];
  /** Find deployment instances to drain from a stacker given a set of filters */
  drainStackerFindMatches: DrainStackerWorkflowInfo;
  /** Create a new egress gateway association for a service instance */
  egressGatewayAssociationCreate: Array<EgressGateway>;
  /** Clear all egress gateway associations for a service instance */
  egressGatewayAssociationsClear: Scalars['Boolean']['output'];
  /** Rollback from HA static IPs to legacy. Creates legacy association, clears HA, and redeploys. */
  egressGatewayRollbackFromHA: Array<EgressGateway>;
  /** Upgrade static IPs from legacy to HA. Creates HA associations, clears legacy, and redeploys. */
  egressGatewayUpgradeToHA: Array<EgressGateway>;
  /** Change the User's account email if there is a valid change email request. */
  emailChangeConfirm: Scalars['Boolean']['output'];
  /** Initiate an email change request for a user */
  emailChangeInitiate: Scalars['Boolean']['output'];
  /** Enables CDN for a service, creating an edge config and attaching all live domains. */
  enableServiceCdn: EdgeConfig;
  /** Submit an enterprise demo request */
  enterpriseDemoRequest: Scalars['Boolean']['output'];
  /** Update the access level of an environment. Only workspace or project admins can modify this setting. */
  environmentAccessUpdate: Environment;
  /** Experimental: applies an intent-level RailwayChangeSet and returns operation results. */
  environmentApplyChangeSet: ChangeSetApplyResult;
  /** Creates a new environment. */
  environmentCreate: Environment;
  /** Deletes an environment. */
  environmentDelete: Scalars['Boolean']['output'];
  /** Commit the provided patch to the environment. */
  environmentPatchCommit: Scalars['String']['output'];
  /** Commits the staged changes for a single environment. */
  environmentPatchCommitStaged: Scalars['String']['output'];
  /** Experimental: previews an intent-level RailwayChangeSet without side effects. */
  environmentPreviewChangeSet: ChangeSetPreview;
  /** Renames an environment. */
  environmentRename: Environment;
  /** Sets the staged patch for a single environment. */
  environmentStageChanges: EnvironmentPatch;
  /** Deploys all connected triggers for an environment. */
  environmentTriggersDeploy: Scalars['Boolean']['output'];
  /** Unskip a service in a PR environment, deploying it and its transitive dependencies. */
  environmentUnskipService: Scalars['Boolean']['output'];
  /** Track a batch of events for authenticated user */
  eventBatchTrack: Scalars['Boolean']['output'];
  /** Track event for authenticated user */
  eventTrack: Scalars['Boolean']['output'];
  /** Agree to the fair use policy for the currently authenticated user */
  fairUseAgree: Scalars['Boolean']['output'];
  /** Add a feature flag for a user */
  featureFlagAdd: Scalars['Boolean']['output'];
  /** Remove a feature flag for a user */
  featureFlagRemove: Scalars['Boolean']['output'];
  /** Generate adoption info for a workspace */
  generateAdoptionInfo: Scalars['Boolean']['output'];
  /** Mints a 5-minute JWT for opening a browser WS session against tcp-proxy. */
  generateShellToken: Scalars['String']['output'];
  /** Deploys a GitHub repo */
  githubRepoDeploy: Scalars['String']['output'];
  /** Updates a GitHub repo through the linked template */
  githubRepoUpdate: Scalars['Boolean']['output'];
  /** Create a new group */
  groupCreate: Group;
  /** Delete a group */
  groupDelete: Scalars['Boolean']['output'];
  /** Add nodes to a group */
  groupSet: Scalars['Boolean']['output'];
  /** Update a group */
  groupUpdate: Group;
  /**
   * Removed. Use helpStationRestrictWorkspace with input.type=BAN.
   * @deprecated Removed. Use helpStationRestrictWorkspace with input.type=BAN.
   */
  helpStationBanUser: Scalars['Boolean']['output'];
  /**
   * Removed. Use helpStationRestrictWorkspace with input.type=BAN.
   * @deprecated Removed. Use helpStationRestrictWorkspace with input.type=BAN.
   */
  helpStationBanWorkspace: Scalars['Boolean']['output'];
  /** Update a single scoped path in a workspace's plan limit override. Merges into the existing override config — other override props are preserved. If the override becomes empty after an unset, the override row is deleted. */
  helpStationPlanLimitOverrideUpsertScoped: HelpStationPlanLimitOverrideScopedResult;
  /** Resize a volume instance to a larger target size. Tries online resize first when preferOnline=true and a service is attached, falling back to offline (snapshot + redeploy) on stacker-level failures. Plan-limit enforcement is the caller's responsibility — this endpoint does not validate against the workspace's plan max. */
  helpStationResizeVolume: HelpStationResizeVolumeResult;
  /** Apply a WorkspaceRestriction to a workspace. BAN propagates via cascade to co-owned workspaces (preserving those with viable other admins) and stops deploys regardless of `input.stopDeploys`. Pro workspaces require bypassProCheck=true when type=BAN. */
  helpStationRestrictWorkspace: Scalars['Boolean']['output'];
  /** Takes down a domain for a help station thread */
  helpStationTakedownDomain: Scalars['Boolean']['output'];
  /** Lift the active WorkspaceRestriction on a workspace. If an active BAN exists, lifts the cascade (origin + child rows) and auto-approves appeals on the origin. */
  helpStationUnrestrictWorkspace: Scalars['Boolean']['output'];
  /** Import variables from a Heroku app into a Railway service. Returns the number of variables imports */
  herokuImportVariables: Scalars['Int']['output'];
  /** Create an integration for a project */
  integrationCreate: Integration;
  /** Delete an integration for a project */
  integrationDelete: Scalars['Boolean']['output'];
  /** Update an integration for a project */
  integrationUpdate: Integration;
  /** Join a project using an invite code */
  inviteCodeUse: Project;
  /** Creates a new job application. */
  jobApplicationCreate: Scalars['Boolean']['output'];
  /** Auth a login session for a user */
  loginSessionAuth: Scalars['Boolean']['output'];
  /** Cancel a login session */
  loginSessionCancel: Scalars['Boolean']['output'];
  /** Get a token for a login session if it exists */
  loginSessionConsume?: Maybe<Scalars['String']['output']>;
  /** Start a CLI login session */
  loginSessionCreate: Scalars['String']['output'];
  /** Verify if a login session is valid */
  loginSessionVerify: Scalars['Boolean']['output'];
  /** Deletes session for current user if it exists */
  logout: Scalars['Boolean']['output'];
  /** Merge a GitHub PR for a service */
  mergeDeploymentFixPr: MergeDeploymentFixPrResponse;
  /** Migrate all deployment instances on a stacker */
  migrateStacker: Scalars['String']['output'];
  /** Alert the team of a missing command palette command */
  missingCommandAlert: Scalars['Boolean']['output'];
  /** Generate a short-lived token for mobile app QR login */
  mobileAuthTokenGenerate: MobileAuthTokenResult;
  /** Delete an entire collection from a MongoDB container */
  mongoDeleteCollection: Scalars['Boolean']['output'];
  /** Delete an entire collection from a MongoDB container */
  mongoDeleteDocument: Scalars['Boolean']['output'];
  /** Generate dummy data for a MongoDB container */
  mongoDummyData: Scalars['Boolean']['output'];
  /** Insert a document into a MongoDB container */
  mongoInsertDocument: Scalars['String']['output'];
  /** Update a document in a MongoDB container */
  mongoUpdateDocument: Scalars['Boolean']['output'];
  /** Marks notification deliveries as read */
  notificationDeliveriesMarkAsRead: Scalars['Boolean']['output'];
  /** Create a new notification rule */
  notificationRuleCreate: NotificationRule;
  /** Delete a notification rule */
  notificationRuleDelete: Scalars['Boolean']['output'];
  /** Update a notification rule */
  notificationRuleUpdate: NotificationRule;
  /** Delete a notification filter for the authenticated user */
  notificationUserFilterDelete: Scalars['Boolean']['output'];
  /** Create or update a notification filter for the authenticated user */
  notificationUserFilterUpsert: NotificationUserFilter;
  /** Revoke an authorized OAuth app (delete grant and tokens) */
  oauthAuthorizedAppRevoke: Scalars['Boolean']['output'];
  /** Update which projects an authorized OAuth app can access */
  oauthAuthorizedAppUpdateProjects: Scalars['Boolean']['output'];
  /** Update which workspaces an authorized OAuth app can access */
  oauthAuthorizedAppUpdateWorkspaces: Scalars['Boolean']['output'];
  /** Create a new OAuth client */
  oauthClientCreate: OAuthClientCreateResponse;
  /** Delete an OAuth client */
  oauthClientDelete: Scalars['Boolean']['output'];
  /** Create a new secret for an OAuth client */
  oauthClientSecretCreate: OAuthClientSecretWithValue;
  /** Revoke an OAuth client secret */
  oauthClientSecretRevoke: Scalars['Boolean']['output'];
  /** Update an OAuth client */
  oauthClientUpdate: OAuthClient;
  /** Create an observability dashboard */
  observabilityDashboardCreate: Scalars['Boolean']['output'];
  /** Create an observability monitor for a dashboard item */
  observabilityDashboardMonitorCreate: Scalars['Boolean']['output'];
  /** Remove an observability monitor from a dashboard item */
  observabilityDashboardMonitorRemove: Scalars['Boolean']['output'];
  /** Update an observability monitor for a dashboard item */
  observabilityDashboardMonitorUpdate: Scalars['Boolean']['output'];
  /** Reset an observability dashboard to default dashboard items */
  observabilityDashboardReset: Scalars['Boolean']['output'];
  /** Update an observability dashboard */
  observabilityDashboardUpdate: Scalars['Boolean']['output'];
  /** Creates a new partnership inquiry. */
  partnershipInquiry: Scalars['Boolean']['output'];
  /** Initiate a new Passkey authentication */
  passkeyAuthenticationCreate: PasskeyCreateAuthenticationReponse;
  /** Verify a Passkey authentication */
  passkeyAuthenticationVerify: PasskeyVerifyAuthenticationReponse;
  /** Deletes a Passkey */
  passkeyDelete: Scalars['Boolean']['output'];
  /** Initiate a new Passkey registration */
  passkeyRegistrationCreate: PasskeyCreateRegistrationReponse;
  /** Verify a Passkey registration */
  passkeyRegistrationVerify: PasskeyVerifyRegistrationReponse;
  /** Delete all passkeys for a user */
  passkeysDeleteAll: Scalars['Boolean']['output'];
  /** Delete a plan limit override for a customer */
  planLimitOverrideDelete: Scalars['Boolean']['output'];
  /** Set a custom plan limit override for a customer */
  planLimitOverrideUpsert: Scalars['Boolean']['output'];
  /** Toggles the specified platform service on or off. */
  platformServiceToggle: Scalars['Boolean']['output'];
  /** Clears the platform status incident cache */
  platformStatusClearCache: Scalars['Boolean']['output'];
  /** Overrides the platform incident status */
  platformStatusOverrideMessage: Scalars['Boolean']['output'];
  /**
   * Creates a new plugin.
   * @deprecated Plugins are deprecated on Railway. Use database templates instead.
   */
  pluginCreate: Plugin;
  /**
   * Deletes a plugin.
   * @deprecated Plugins are deprecated
   */
  pluginDelete: Scalars['Boolean']['output'];
  /**
   * Generates a signed archive URL that can be used to access plugin container data
   * @deprecated Plugins are deprecated
   */
  pluginGeneratedSignedArchiveUrl: Scalars['String']['output'];
  /**
   * Reset envs and container for a plugin in an environment
   * @deprecated Plugins are deprecated
   */
  pluginReset: Scalars['Boolean']['output'];
  /**
   * Resets the credentials for a plugin in an environment
   * @deprecated Plugins are deprecated
   */
  pluginResetCredentials: Scalars['String']['output'];
  /**
   * Restarts a plugin.
   * @deprecated Plugins are deprecated
   */
  pluginRestart: Plugin;
  /**
   * Force start a plugin
   * @deprecated Plugins are deprecated
   */
  pluginStart: Scalars['Boolean']['output'];
  /**
   * Updates an existing plugin.
   * @deprecated Plugins are deprecated
   */
  pluginUpdate: Plugin;
  /** Post a reply to a support thread */
  postSupportMessage: SupportMessage;
  /** Update the email preferences for a user */
  preferencesUpdate: Preferences;
  /** Creates a new job application. */
  pricingInvoiceUpload: Scalars['Boolean']['output'];
  /** Create or get a private network. */
  privateNetworkCreateOrGet: PrivateNetwork;
  /** Create or get a private network endpoint. */
  privateNetworkEndpointCreateOrGet: PrivateNetworkEndpoint;
  /** Delete a private network endpoint. */
  privateNetworkEndpointDelete: Scalars['Boolean']['output'];
  /** Rename a private network endpoint. */
  privateNetworkEndpointRename: Scalars['Boolean']['output'];
  /** Delete all private networks for an environment. */
  privateNetworksForEnvironmentDelete: Scalars['Boolean']['output'];
  /** Updates admin settings for a project */
  projectAdminUpdate: Scalars['Boolean']['output'];
  /** Cancel a running AI-assisted project setup */
  projectCancelAgentSetup: Scalars['Boolean']['output'];
  /** Evict a canvas document from all pods' memory and Redis cache. Forces the next connection to reload fresh state from the database. Use when DB state has been corrected and you need to invalidate cached canvas state. */
  projectCanvasEvict: Scalars['Boolean']['output'];
  /** Reset the canvas for a project */
  projectCanvasReset: Scalars['Boolean']['output'];
  /** Claims a project. */
  projectClaim: Project;
  /** Creates a new project. */
  projectCreate: Project;
  /** Create a project with AI-assisted setup */
  projectCreateWithAgent: ProjectCreateWithAgentResponse;
  /** Deletes a project. */
  projectDelete: Scalars['Boolean']['output'];
  /** Add a feature flag for a project */
  projectFeatureFlagAdd: Scalars['Boolean']['output'];
  /** Remove a feature flag for a project */
  projectFeatureFlagRemove: Scalars['Boolean']['output'];
  /** Accept a project invitation using the invite code */
  projectInvitationAccept: ProjectPermission;
  /** Create an invitation for a project */
  projectInvitationCreate: ProjectInvitation;
  /** Delete an invitation for a project */
  projectInvitationDelete: Scalars['Boolean']['output'];
  /** Resend an invitation for a project */
  projectInvitationResend: ProjectInvitation;
  /** Invite a user by email to a project */
  projectInviteUser: Scalars['Boolean']['output'];
  /** Leave project as currently authenticated user */
  projectLeave: Scalars['Boolean']['output'];
  /** Add a workspace member to a project with a specific role. The user must already be a member of the project's workspace. */
  projectMemberAdd: ProjectMember;
  /** Remove user from a project */
  projectMemberRemove: Array<ProjectMember>;
  /** Change the role for a user within a project */
  projectMemberUpdate: ProjectMember;
  /** Deletes a project with a 48 hour grace period. */
  projectScheduleDelete: Scalars['Boolean']['output'];
  /** Cancel scheduled deletion of a project */
  projectScheduleDeleteCancel: Scalars['Boolean']['output'];
  /** Force delete a scheduled deletion of a project (skips the grace period) */
  projectScheduleDeleteForce: Scalars['Boolean']['output'];
  /** Create a token for a project that has access to a specific environment */
  projectTokenCreate: Scalars['String']['output'];
  /** Delete a project token */
  projectTokenDelete: Scalars['Boolean']['output'];
  /** Transfer a project to a workspace */
  projectTransfer: Scalars['Boolean']['output'];
  /** Confirm the transfer of project ownership */
  projectTransferConfirm: Scalars['Boolean']['output'];
  /** Initiate the transfer of project ownership */
  projectTransferInitiate: Scalars['Boolean']['output'];
  /**
   * Transfer a project to a team
   * @deprecated Use projectTransfer instead
   */
  projectTransferToTeam: Scalars['Boolean']['output'];
  /** Updates a project. */
  projectUpdate: Project;
  /** Deletes a ProviderAuth. */
  providerAuthRemove: Scalars['Boolean']['output'];
  /** Purges the CDN cache for a service. Bumps the edge config's purge epoch so every edge node treats prior cached entries as stale on next request. Idempotent; returns true even if CDN is disabled for the service. */
  purgeServiceCache: Scalars['Boolean']['output'];
  /** Register an Expo push notification token for the current user */
  pushTokenRegister: Scalars['Boolean']['output'];
  /** Unregister an Expo push notification token for the current user */
  pushTokenUnregister: Scalars['Boolean']['output'];
  /** Cancel a domain purchase */
  railwayDomainCancelPurchase: Scalars['Boolean']['output'];
  /** Complete a domain purchase after 3DS confirmation */
  railwayDomainCompletePurchase: RailwayDomain;
  /** Create a DNS record for a Railway domain */
  railwayDomainDnsRecordCreate: RailwayDomainDnsRecord;
  /** Delete a DNS record for a Railway domain */
  railwayDomainDnsRecordDelete: Scalars['Boolean']['output'];
  /** Update a DNS record for a Railway domain */
  railwayDomainDnsRecordUpdate: RailwayDomainDnsRecord;
  /** Unlock the domain at the registrar, disable auto-renew, and return the EPP auth code so the user can transfer to another registrar. */
  railwayDomainInitiateTransferOut: RailwayDomainTransferOutResult;
  /** Delegate the domain's authoritative nameservers to an external DNS provider, or reset to Railway defaults by passing an empty list. */
  railwayDomainNameserversSet: RailwayDomainNameservers;
  /** Purchase a Railway domain */
  railwayDomainPurchase: RailwayDomainPurchaseResult;
  /** Refund a Railway domain at registrar and cancel Stripe subscription */
  railwayDomainRefund: RailwayDomain;
  /** Update a Railway domain's settings */
  railwayDomainUpdate: RailwayDomain;
  /** Generates a new set of recovery codes for the authenticated user. */
  recoveryCodeGenerate: RecoveryCodes;
  /** Validates a recovery code. */
  recoveryCodeValidate: Scalars['Boolean']['output'];
  /** Delete a key in a Redis container */
  redisDeleteKey: Scalars['Boolean']['output'];
  /** Generate dummy data for a Redis container */
  redisDummyData: Scalars['Boolean']['output'];
  /** Delete values to a hash in a Redis container */
  redisHashDelete: Scalars['Boolean']['output'];
  /** Add values to a hash in a Redis container */
  redisHashSet: Scalars['Boolean']['output'];
  /** Pop a value from a list in a Redis container */
  redisPopList: Scalars['Boolean']['output'];
  /** Push a value to a list in a Redis container */
  redisPushList: Scalars['Boolean']['output'];
  /** Add a value from a set in a Redis container */
  redisSetAdd: Scalars['Boolean']['output'];
  /** Set a keys expire time in seconds in a Redis container */
  redisSetExpire: Scalars['Boolean']['output'];
  /** Set list index to a value Redis container */
  redisSetListIndex: Scalars['Boolean']['output'];
  /** Remove a value from a set in a Redis container */
  redisSetRemove: Scalars['Boolean']['output'];
  /** Set a string value in a Redis container */
  redisStringSet: Scalars['Boolean']['output'];
  /** Updates the ReferralInfo for the authenticated user. */
  referralInfoUpdate: ReferralInfo;
  /** Triggers a background refresh of the user's GitHub repos cache */
  refreshGithubReposCache: RefreshGithubReposCacheResult;
  /** Reissue an invoice for a workspace */
  reissueInvoice: Scalars['Boolean']['output'];
  /** Create a sandbox in an environment. */
  sandboxCreate: Sandbox;
  /** Destroy a sandbox. */
  sandboxDestroy?: Maybe<Sandbox>;
  /** Start a command in a running sandbox. Returns fast: COMPLETED with output for short commands, or RUNNING with an execId + cursor to stream via sandboxExecOutput. */
  sandboxExec: SandboxExecResult;
  /** Signal (default SIGTERM) a running sandbox exec. */
  sandboxExecKill: Scalars['Boolean']['output'];
  /** Extend a sandbox's lifetime. */
  sandboxHeartbeat?: Maybe<Sandbox>;
  /** Build a sandbox template. */
  sandboxTemplateBuild: SandboxTemplate;
  /** Send a notification email to user when bounty is won */
  sendBountyWonEmail: Scalars['Boolean']['output'];
  /** Send a community thread notification email */
  sendCommunityThreadNotificationEmail: Scalars['Boolean']['output'];
  /** Send an email to welcome a user to our community */
  sendCommunityWelcomeEmail: Scalars['Boolean']['output'];
  /** Send a new bounty question email */
  sendNewBountyEmail: Scalars['Boolean']['output'];
  /** Send a question moved to bounty email */
  sendQuestionMovedToBountyEmail: Scalars['Boolean']['output'];
  /** Notify template creators and maintainers about a new template queue question */
  sendTemplateQueueEmail: Scalars['Boolean']['output'];
  /** Notify template creators and maintainers about pending template queue questions */
  sendTemplateQueueReminderEmail: Scalars['Boolean']['output'];
  /** Connect a service to a source */
  serviceConnect: Service;
  /** Creates a new service. */
  serviceCreate: Service;
  /** Deletes a service. */
  serviceDelete: Scalars['Boolean']['output'];
  /** Disconnect a service from a repo */
  serviceDisconnect: Service;
  /** Creates a new service domain. */
  serviceDomainCreate: ServiceDomain;
  /** Deletes a service domain. */
  serviceDomainDelete: Scalars['Boolean']['output'];
  /** Updates a service domain. */
  serviceDomainUpdate: Scalars['Boolean']['output'];
  /**
   * Duplicate a service, including its configuration, variables, and volumes.
   * @deprecated This API route is used only by the CLI. We plan to remove it in a future version. Please use the UI to duplicate services.
   */
  serviceDuplicate: Service;
  /** Add a feature flag for a service */
  serviceFeatureFlagAdd: Scalars['Boolean']['output'];
  /** Remove a feature flag for a service */
  serviceFeatureFlagRemove: Scalars['Boolean']['output'];
  /** Enables or disables auto-deploy for a service instance. */
  serviceInstanceAutoDeployUpdate: ServiceInstanceAutoDeployUpdateResult;
  /** Deploy a service instance */
  serviceInstanceDeploy: Scalars['Boolean']['output'];
  /** Deploy a service instance. Returns a deployment ID */
  serviceInstanceDeployV2: Scalars['String']['output'];
  /** Skip specific Docker image updates for a service instance */
  serviceInstanceImageUpdateSkip: Scalars['Boolean']['output'];
  /** Update the resource limits for a service instance */
  serviceInstanceLimitsUpdate: Scalars['Boolean']['output'];
  /** Redeploy a service instance */
  serviceInstanceRedeploy: Scalars['Boolean']['output'];
  /** Get a list of suggested variables for a services repo */
  serviceInstanceSuggestedVariables: Scalars['JSON']['output'];
  /** Update a service instance */
  serviceInstanceUpdate: Scalars['Boolean']['output'];
  /** Remove the upstream URL from all service instances for this service */
  serviceRemoveUpstreamUrl: Service;
  /** Updates a service. */
  serviceUpdate: Service;
  /** Deletes a session. */
  sessionDelete: Scalars['Boolean']['output'];
  /** Enable or disable ClickHouse for billing queries. When disabled, billing queries fail because VictoriaMetrics fallback has been removed. */
  setClickhouseBackpressureBillingEnabled: Scalars['Boolean']['output'];
  /** Set the max concurrency for ClickHouse billing queries (Bottleneck limiter). */
  setClickhouseBackpressureBillingMaxConcurrent: Scalars['Boolean']['output'];
  /** Set the max concurrency for interactive ClickHouse log queries (Bottleneck limiter). */
  setClickhouseBackpressureLogsMaxConcurrent: Scalars['Boolean']['output'];
  /** Set the max concurrency for ClickHouse ad-hoc metrics queries (Bottleneck limiter). */
  setClickhouseBackpressureMetricsMaxConcurrent: Scalars['Boolean']['output'];
  /** Set the alert threshold for GitHub backpressure. */
  setGithubBackpressureAlertThreshold: Scalars['Boolean']['output'];
  /** Set the GitHub backpressure configuration for a plan. */
  setGithubBackpressureConfig: Scalars['Boolean']['output'];
  /** Set the custom message shown to users when their deployment is cancelled due to queue clearing. */
  setGithubBackpressureFailedMessage: Scalars['Boolean']['output'];
  /** Set the custom message shown to users when their deployment is queued. */
  setGithubBackpressureQueuedMessage: Scalars['Boolean']['output'];
  /** Enable or disable GitHub deployment status updates globally. When disabled, no deployment status updates will be sent to GitHub. */
  setGithubDeploymentStatusDisabled: Scalars['Boolean']['output'];
  /** Set a percentage platform feature flag to a specific rollout percentage (0 - 100) */
  setPercentagePlatformFeatureFlag: Scalars['Boolean']['output'];
  /** Track setup agent lifecycle events from the Railway CLI */
  setupAgentEventTrack: Scalars['Boolean']['output'];
  /** Configure a shared variable. */
  sharedVariableConfigure: Variable;
  /** Cancel a customer's spend commitment */
  spendCommitmentCancel: Scalars['Boolean']['output'];
  /** Insert a column in a table in a SQL database container */
  sqlColumnInsert: Scalars['Boolean']['output'];
  /** Generate dummy data for a SQL database container */
  sqlDummyData: Scalars['Boolean']['output'];
  /** Install a SQL database extension */
  sqlExtensionInstall: SqlExtensionInstallResult;
  /** Uninstall a SQL database extension */
  sqlExtensionUninstall: Scalars['Boolean']['output'];
  /** Run the raw SQL query provided by the user */
  sqlRawQueryRun: SqlRawQueryResponse;
  /** Insert a row into a SQL database container */
  sqlRowInsert: Scalars['Boolean']['output'];
  /** Update row in a table in a SQL database container */
  sqlRowUpdate: Scalars['Boolean']['output'];
  /** Delete rows from a table in a SQL database container */
  sqlRowsDelete: Scalars['Boolean']['output'];
  /** Create a table in a SQL database container */
  sqlTableCreate: Scalars['Boolean']['output'];
  /** Delete a table in a SQL database container */
  sqlTableDelete: Scalars['Boolean']['output'];
  /** Creates a new SSH public key. When workspaceId is provided (or omitted under a workspace-scoped API token, in which case it defaults to the token's workspace), the key is owned by the workspace and can be used by anyone authenticating as that workspace via native SSH; requires workspace ADMIN access. Otherwise the key is owned by the authenticated user. */
  sshPublicKeyCreate: SshPublicKey;
  /** Deletes an SSH public key. */
  sshPublicKeyDelete: Scalars['Boolean']['output'];
  /** Cancel getting workflow to get stats of a stacker */
  stackerStatsCancel: Scalars['Boolean']['output'];
  /** Get deployment instances stats from a stacker */
  stackerStatsGet: StackerStatsWorkflowInfo;
  /** Prune phantom volumes on a stacker (zfs volumes not found in postgres and older than a given threshold) */
  stackerVolumesPrunePhantoms: Scalars['Boolean']['output'];
  /**
   * Creates a new TCP proxy for a service instance.
   * @deprecated Use staged changes and apply them. Creating a TCP proxy with this endpoint requires you to redeploy the service for it to be active.
   */
  tcpProxyCreate: TcpProxy;
  /** Deletes a TCP proxy by id */
  tcpProxyDelete: Scalars['Boolean']['output'];
  /** Logs panics from CLI to Datadog */
  telemetrySend: Scalars['Boolean']['output'];
  /** Duplicates an existing template */
  templateClone: Template;
  /** Creates a template with the serialized config. */
  templateCreateV2: Template;
  /** Deletes a template. */
  templateDelete: Scalars['Boolean']['output'];
  /**
   * Deploys a template.
   * @deprecated Deprecated in favor of templateDeployV2
   */
  templateDeploy: TemplateDeployPayload;
  /** Deploys a template using the serialized template config */
  templateDeployV2: TemplateDeployPayload;
  /** Generate a template for a project */
  templateGenerate: Template;
  /** Hides a template. */
  templateHide: Scalars['Boolean']['output'];
  /** Backfill template kickback payouts. */
  templateKickbackBackfill: Scalars['Boolean']['output'];
  /** Upserts a template maintainer */
  templateMaintainerUpsert: Scalars['Boolean']['output'];
  /** Nullify the community thread slug for a template, if one is found with the provided slug */
  templateMaybeUnsetCommunityThreadSlug: Scalars['Boolean']['output'];
  /** Publishes a template. */
  templatePublish: Template;
  /** Reverts an HA cluster to standalone mode using template metadata to derive variables to remove */
  templateRevert: TemplateDeployPayload;
  /** Ejects a service from the template and creates a new repo in the provided org. */
  templateServiceSourceEject: Scalars['Boolean']['output'];
  /** Unpublishes a template. */
  templateUnpublish: Scalars['Boolean']['output'];
  /** Updates a template with the serialized config. */
  templateUpdateV2: Template;
  /** Updates the configuration for a template */
  templateUpsertConfig: Template;
  /** Updates the settings for a template */
  templateUpsertSettings: Template;
  /** Toggle a boolean platform feature flag */
  togglePlatformFeatureFlag: Scalars['Boolean']['output'];
  /** Trigger AI-powered diagnosis of a failed deployment */
  triggerDeploymentDiagnosis: TriggerDeploymentDiagnosisResponse;
  /** Trigger creation of a fix PR for a diagnosed deployment */
  triggerDeploymentFixPr: TriggerDeploymentFixPrResponse;
  /** Create a new trusted domain for this workspace */
  trustedDomainCreate: TrustedDomain;
  /** Delete a trusted domain */
  trustedDomainDelete: Scalars['Boolean']['output'];
  /** Retrigger verification for a failed trusted domain */
  trustedDomainRetriggerVerification?: Maybe<TrustedDomain>;
  /** Setup 2FA authorization for authenticated user. */
  twoFactorInfoCreate: RecoveryCodes;
  /** Deletes the TwoFactorInfo for the authenticated user. */
  twoFactorInfoDelete: Scalars['Boolean']['output'];
  /** Reset the 2FA code for a user */
  twoFactorInfoReset: Scalars['Boolean']['output'];
  /** Generates the 2FA app secret for the authenticated user. */
  twoFactorInfoSecret: TwoFactorInfoSecret;
  /** Validates the token for a 2FA action or for a login request. */
  twoFactorInfoValidate: Scalars['Boolean']['output'];
  /** Updates the edge config (caching settings) for a service. */
  updateServiceEdgeConfig: EdgeConfig;
  /** Updates support metrics for template */
  updateTemplateSupportMetrics: Scalars['Boolean']['output'];
  /** Generate a Slack channel for a workspace */
  upsertSlackChannel: Scalars['Boolean']['output'];
  /** Allowlist a UsageAnomaly. */
  usageAnomalyAllow: Scalars['Boolean']['output'];
  /** Remove the usage limit for a customer */
  usageLimitRemove: Scalars['Boolean']['output'];
  /** Set the usage limit for a customer */
  usageLimitSet: Scalars['Boolean']['output'];
  /**
   * Ban a user
   * @deprecated Use the WorkspaceRestriction-based ban flow (workspaceRestrict with type=BAN). This mutation will be removed after caller migration.
   */
  userBan: Scalars['Boolean']['output'];
  /** Unsubscribe from the Beta program. */
  userBetaLeave: Scalars['Boolean']['output'];
  /** Delete the currently authenticated user */
  userDelete: Scalars['Boolean']['output'];
  /** Disconnect your Railway account from Discord. */
  userDiscordDisconnect: Scalars['Boolean']['output'];
  /** Remove a flag on the user. */
  userFlagsRemove: Scalars['Boolean']['output'];
  /** Set flags on the authenticated user. */
  userFlagsSet: Scalars['Boolean']['output'];
  /** Updates the profile for the authenticated user */
  userProfileUpdate: Scalars['Boolean']['output'];
  /** Update the riskLevel for a user */
  userRiskLevelUpdate: Scalars['Boolean']['output'];
  /** Update date of TermsAgreedOn */
  userTermsUpdate?: Maybe<User>;
  /** Create a trial workspace for the current user (no credits) if they have no existing workspaces */
  userTrialWorkspaceCreate: Workspace;
  /**
   * Unban a user
   * @deprecated Use the WorkspaceRestriction-based unban flow (workspaceUnrestrict on the origin workspace). This mutation will be removed after caller migration.
   */
  userUnban: Scalars['Boolean']['output'];
  /** Update currently logged in user */
  userUpdate?: Maybe<User>;
  /** Upserts a collection of variables. */
  variableCollectionUpsert: Scalars['Boolean']['output'];
  /** Deletes a variable. */
  variableDelete: Scalars['Boolean']['output'];
  /** Upserts a variable. */
  variableUpsert: Scalars['Boolean']['output'];
  /** Create a persistent volume in a project */
  volumeCreate: Volume;
  /** Delete a persistent volume in a project */
  volumeDelete: Scalars['Boolean']['output'];
  /** Deletes multiple volume instance backups in a single operation */
  volumeInstanceBackupBatchDelete: WorkflowId;
  /** Create backup of a volume instance */
  volumeInstanceBackupCreate: WorkflowId;
  /** Create a pre-HA-conversion backup of a volume instance. Available to all plans; expires in 21 days. */
  volumeInstanceBackupCreateForHaConversion: WorkflowId;
  /** Deletes volume instance backup */
  volumeInstanceBackupDelete: WorkflowId;
  /** Removes backup expiration date */
  volumeInstanceBackupLock: Scalars['Boolean']['output'];
  /** Restore a volume instance from a backup */
  volumeInstanceBackupRestore: WorkflowId;
  /** Manage schedule for backups of a volume instance */
  volumeInstanceBackupScheduleUpdate: Scalars['Boolean']['output'];
  /** Cancel the deletion of a volume instance */
  volumeInstanceCancelDeletion: Scalars['Boolean']['output'];
  /** Change the region of the volume instance. If the new region is different from the current region, a migration of the volume to the new region will be triggered, which will cause downtime for services that have this volume attached. */
  volumeInstanceChangeRegion: Scalars['Boolean']['output'];
  /** Copies the contents of a volume instance to another. Intended use case is copying a volume to another Environment */
  volumeInstanceCopyFromEnvironment: Scalars['Boolean']['output'];
  /** Point-in-time restore. Creates a brand-new Postgres service in the project. The image populates the new service's volume from the source bucket via `pgbackrest restore --type=time --target=<T>` on first boot, replays WAL forward, and promotes. Source service stays online and untouched. */
  volumeInstancePITRRestore: WorkflowId;
  /** Resize a volume instance. If no environmentId is provided, all volume instances for the volume will be resized. You can only resize a volume upwards to the maximum size allowed by the plan */
  volumeInstanceResize: Scalars['Boolean']['output'];
  /** Reverts a volume instance migration. This will schedule a deletion of the destination volume instance and restore the source volume instance. */
  volumeInstanceRevertMigration: WorkflowId;
  /** Update a volume instance. If no environmentId is provided, all volume instances for the volume will be updated. */
  volumeInstanceUpdate: Scalars['Boolean']['output'];
  /** Wipe the contents of the volume instance. This creates an entirely new volume instance with the same mount path and service attached. */
  volumeInstanceWipe: Scalars['Boolean']['output'];
  /** Update a persistent volume in a project */
  volumeUpdate: Volume;
  /** Test a webhook URL by sending a sample payload. Returns the HTTP status code. */
  webhookTest: Scalars['Int']['output'];
  /** Add a payout account for a user. */
  withdrawalAccountCreate: WithdrawalAccount;
  /**
   * Add a payout account for a user.
   * @deprecated Use withdrawalAccountCreate instead
   */
  withdrawalAccountCreateV3: WithdrawalAccountInfo;
  /** Delete a payout account for a user. */
  withdrawalAccountDelete: Scalars['Boolean']['output'];
  /** Confirm a withdrawal to cash request. */
  withdrawalConfirmationAdd: Scalars['Boolean']['output'];
  /** Add a withdrawal request. */
  withdrawalToCashCreate: Scalars['Boolean']['output'];
  /** Withdraw earnings into Railway Credits. */
  withdrawalToCreditCreate: Scalars['Boolean']['output'];
  /** Enable or disable automatic deployment diagnosis for a workspace */
  workspaceAutomaticDiagnosisUpdate: Workspace;
  /**
   * Ban a workspace.
   * @deprecated Use `workspaceRestrict` with type=BAN once the WorkspaceRestriction migration is complete.
   */
  workspaceBan: Scalars['Boolean']['output'];
  /** Complete a plan upgrade after 3DS authentication */
  workspaceCompletePlanUpgrade: Scalars['Boolean']['output'];
  /** Complete post-workspace creation tasks */
  workspaceCompletePostCreationTasks: Scalars['Boolean']['output'];
  /** Create a new workspace and subscribe to the provided plan. */
  workspaceCreateAndSubscribeV2: WorkspaceCreateAndSubscribeV2Response;
  /** Delete a workspace and all data associated with it */
  workspaceDelete: Scalars['Boolean']['output'];
  /** Generate a link to configure the identity provider */
  workspaceIdentityProviderConfigure: WorkspaceIdentityProviderConfigureResponse;
  /** Create and add an Identity Provider to a Workspace */
  workspaceIdentityProviderCreate: WorkspaceIdentityProvider;
  /** Enable or disable SAML enforcement */
  workspaceIdentityProviderEnforce: Scalars['Boolean']['output'];
  /** Get an invite code for a workspace and role */
  workspaceInviteCodeCreate: Scalars['String']['output'];
  /** Use an invite code to join a workspace */
  workspaceInviteCodeUse: Workspace;
  /** Leave a workspace */
  workspaceLeave: Scalars['Boolean']['output'];
  /** Changes a user workspace permissions. */
  workspacePermissionChange: Scalars['Boolean']['output'];
  /** Add a deploy source to a workspace policy allowlist. */
  workspacePolicyDeploySourceAllowlistAdd: WorkspacePolicyDeploySourceAllowlist;
  /** Remove a deploy source from a workspace policy allowlist. */
  workspacePolicyDeploySourceAllowlistRemove: Scalars['Boolean']['output'];
  /** Enable or disable a workspace policy. Enterprise workspaces only. */
  workspacePolicyItemUpdate: Scalars['Boolean']['output'];
  /** Stop all deployments and plugins for a workspace. */
  workspaceResourcesStop: Scalars['Boolean']['output'];
  /** Restrict a workspace from creating resources. */
  workspaceRestrict: Scalars['Boolean']['output'];
  /** Enable or disable 2FA enforcement for a workspace */
  workspaceTwoFactorEnforcementUpdate: Scalars['Boolean']['output'];
  /**
   * Unban a workspace.
   * @deprecated Use `workspaceUnrestrict` once the WorkspaceRestriction migration is complete.
   */
  workspaceUnban: Scalars['Boolean']['output'];
  /** Unrestrict a workspace. */
  workspaceUnrestrict: Scalars['Boolean']['output'];
  /** Update a workspace by id */
  workspaceUpdate: Scalars['Boolean']['output'];
  /** Update the limits version for a workspace */
  workspaceUpdateLimitsVersion: Scalars['Boolean']['output'];
  /** Update partner profile information for a workspace */
  workspaceUpdatePartnerProfile: Scalars['Boolean']['output'];
  /** Upgrade or downgrade a workspace's plan */
  workspaceUpdatePlan: WorkspaceUpdatePlanResponse;
  /** Generate a Slack channel for a workspace */
  workspaceUpsertSlackChannel: Scalars['Boolean']['output'];
  /** Invite a user by email to a workspace */
  workspaceUserInvite: Scalars['Boolean']['output'];
  /** Remove a user from a workspace */
  workspaceUserRemove: Scalars['Boolean']['output'];
};


export type MutationAdminApproveBanAppealArgs = {
  input: ResolveBanAppealInput;
};


export type MutationAdminBanImageArgs = {
  image: Scalars['String']['input'];
  reason: Scalars['String']['input'];
};


export type MutationAdminClearDomainTrafficLimitArgs = {
  input: ClearDomainTrafficLimitInput;
};


export type MutationAdminCreateFullStripeConnectWithdrawalAccountArgs = {
  customerId: Scalars['String']['input'];
};


export type MutationAdminCustomDomainDeleteArgs = {
  id: Scalars['String']['input'];
};


export type MutationAdminDebugInstallationArgs = {
  installationId: Scalars['String']['input'];
};


export type MutationAdminDeleteArgs = {
  userId: Scalars['String']['input'];
};


export type MutationAdminDeleteRepoCacheArgs = {
  id: Scalars['String']['input'];
};


export type MutationAdminDenyBanAppealArgs = {
  input: ResolveBanAppealInput;
};


export type MutationAdminDrainDeploymentToMetalArgs = {
  deploymentId: Scalars['String']['input'];
  forceRepushExistingImages?: InputMaybe<Scalars['Boolean']['input']>;
  newRegion: Scalars['String']['input'];
  srcRegion: Scalars['String']['input'];
};


export type MutationAdminDuplicateInvoiceArgs = {
  invoiceId: Scalars['String']['input'];
};


export type MutationAdminForceUnlockVolumeInstanceArgs = {
  reason: Scalars['String']['input'];
  volumeInstanceId: Scalars['String']['input'];
};


export type MutationAdminGiftProSubscriptionArgs = {
  input: AdminGiftProSubscriptionInput;
};


export type MutationAdminIssueRefundForRefundRequestArgs = {
  customMessage?: InputMaybe<Scalars['String']['input']>;
  issuedByUserId?: InputMaybe<Scalars['String']['input']>;
  refundRequestId: Scalars['String']['input'];
};


export type MutationAdminOAuthClientDeleteArgs = {
  id: Scalars['String']['input'];
};


export type MutationAdminOAuthClientRevokeAllGrantsArgs = {
  id: Scalars['String']['input'];
};


export type MutationAdminOAuthClientUndeleteArgs = {
  id: Scalars['String']['input'];
};


export type MutationAdminOverrideCustomerWithdrawalPlatformsArgs = {
  customerId: Scalars['String']['input'];
  supportedWithdrawalPlatforms: Array<WithdrawalPlatformTypes>;
};


export type MutationAdminOverrideWorkspaceSupportTierArgs = {
  supportTierOverride?: InputMaybe<SupportTierOverride>;
  workspaceId: Scalars['String']['input'];
};


export type MutationAdminProjectCanvasBlockArgs = {
  projectId: Scalars['String']['input'];
};


export type MutationAdminProjectCanvasMutationLoggingDisableArgs = {
  projectId: Scalars['String']['input'];
};


export type MutationAdminProjectCanvasMutationLoggingEnableArgs = {
  projectId: Scalars['String']['input'];
};


export type MutationAdminProjectCanvasUnblockArgs = {
  projectId: Scalars['String']['input'];
};


export type MutationAdminPushVolumeInstanceMetadataArgs = {
  volumeInstanceId: Scalars['String']['input'];
};


export type MutationAdminRadarActionArgs = {
  action: RadarEventStatus;
  note?: InputMaybe<Scalars['String']['input']>;
  ruleId: Scalars['String']['input'];
  workspaceIds: Array<Scalars['String']['input']>;
};


export type MutationAdminRadarCancelScanArgs = {
  ruleId: Scalars['String']['input'];
};


export type MutationAdminRadarEventActionArgs = {
  action: RadarEventStatus;
  eventIds: Array<Scalars['String']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  restrictionType?: InputMaybe<RestrictionType>;
};


export type MutationAdminRadarListDeleteArgs = {
  id: Scalars['String']['input'];
};


export type MutationAdminRadarListUpsertArgs = {
  input: RadarListUpsertInput;
};


export type MutationAdminRadarRuleDeleteArgs = {
  id: Scalars['String']['input'];
};


export type MutationAdminRadarRuleUpsertArgs = {
  input: RadarRuleUpsertInput;
};


export type MutationAdminRadarStartScanArgs = {
  applyAction?: InputMaybe<Scalars['Boolean']['input']>;
  reason?: InputMaybe<Scalars['String']['input']>;
  ruleId: Scalars['String']['input'];
  scanType: RadarScanType;
  timeRangeEnd: Scalars['DateTime']['input'];
  timeRangeStart: Scalars['DateTime']['input'];
};


export type MutationAdminReferralCodeApplyToWorkspaceArgs = {
  code: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};


export type MutationAdminReferralCodeCreateArgs = {
  input: AdminReferralCodeCreateInput;
};


export type MutationAdminReferralCodeDeleteArgs = {
  id: Scalars['String']['input'];
};


export type MutationAdminReferralCodeUpdateArgs = {
  input: AdminReferralCodeUpdateInput;
};


export type MutationAdminRefreshInstallationReposArgs = {
  installationId?: InputMaybe<Scalars['String']['input']>;
  ownerLogin?: InputMaybe<Scalars['String']['input']>;
};


export type MutationAdminRefreshPostgresHaClusterArgs = {
  environmentId: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
};


export type MutationAdminRefreshPostgresPitrServiceArgs = {
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type MutationAdminRefreshPublicRepoCacheArgs = {
  fullName: Scalars['String']['input'];
};


export type MutationAdminRemoveServiceInstanceLimitOverrideArgs = {
  input: RemoveServiceInstanceLimitOverrideInput;
};


export type MutationAdminSendHostMaintenanceNotificationsArgs = {
  customBody?: InputMaybe<Scalars['String']['input']>;
  customTitle?: InputMaybe<Scalars['String']['input']>;
  dryRun?: InputMaybe<Scalars['Boolean']['input']>;
  durationHumanFriendlyString: Scalars['String']['input'];
  eventType: HostMaintenanceEventType;
  failoverStateless?: InputMaybe<Scalars['Boolean']['input']>;
  stackerHostname: Scalars['String']['input'];
};


export type MutationAdminSendHostMaintenanceTestNotificationArgs = {
  customBody?: InputMaybe<Scalars['String']['input']>;
  customTitle?: InputMaybe<Scalars['String']['input']>;
  durationHumanFriendlyString: Scalars['String']['input'];
  eventType: HostMaintenanceEventType;
};


export type MutationAdminSendNotificationArgs = {
  input: AdminSendNotificationInput;
};


export type MutationAdminSetDomainTrafficLimitArgs = {
  input: SetDomainTrafficLimitInput;
};


export type MutationAdminSetServiceInstanceLimitOverrideArgs = {
  input: SetServiceInstanceLimitOverrideInput;
};


export type MutationAdminSimulateStripeUsageOnCustomerArgs = {
  customerId: Scalars['String']['input'];
};


export type MutationAdminSpendCommitmentUpsertArgs = {
  input: AdminSpendCommitmentUpsertInput;
};


export type MutationAdminSyncHttpRoutesArgs = {
  input: SyncRoutesInput;
};


export type MutationAdminSyncTcpRoutesArgs = {
  input: SyncRoutesInput;
};


export type MutationAdminTriggerEtcdDefragArgs = {
  environmentId: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
};


export type MutationAdminTriggerPitrFullBackupArgs = {
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type MutationAdminTriggerRoutingRepairArgs = {
  input: TriggerRoutingRepairInput;
};


export type MutationAdminTriggerTransactionalEmailArgs = {
  segmentId: Scalars['String']['input'];
  templateId: Scalars['String']['input'];
};


export type MutationAdminUnbanImageArgs = {
  image: Scalars['String']['input'];
};


export type MutationAdminUnsubscribeEmailArgs = {
  email: Scalars['String']['input'];
};


export type MutationAdminUpdateAutoRefundSettingsArgs = {
  hobbyThreshold?: InputMaybe<Scalars['Int']['input']>;
  proThreshold?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationAdminVoidStripeInvoiceArgs = {
  invoiceId: Scalars['String']['input'];
};


export type MutationAdminWorkspaceLinkSlackChannelArgs = {
  slackChannelId: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};


export type MutationAdminWorkspaceToggleArchiveSlackChannelArgs = {
  slackChannelId: Scalars['String']['input'];
};


export type MutationAgentUsageLimitSetArgs = {
  input: AgentUsageLimitSetInput;
};


export type MutationApiTokenCreateArgs = {
  input: ApiTokenCreateInput;
};


export type MutationApiTokenDeleteArgs = {
  id: Scalars['String']['input'];
};


export type MutationBaseEnvironmentOverrideArgs = {
  id: Scalars['String']['input'];
  input: BaseEnvironmentOverrideInput;
};


export type MutationBucketCreateArgs = {
  input: BucketCreateInput;
};


export type MutationBucketCredentialsResetArgs = {
  bucketId: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
};


export type MutationBucketUpdateArgs = {
  id: Scalars['String']['input'];
  input: BucketUpdateInput;
};


export type MutationBuildExtendDeadlineArgs = {
  snapshotId: Scalars['String']['input'];
};


export type MutationCanvasViewMergeArgs = {
  sourceEnvironmentId: Scalars['String']['input'];
  targetEnvironmentId: Scalars['String']['input'];
};


export type MutationChangelogSendArgs = {
  input: ChangelogSendInput;
};


export type MutationChatSendMessageArgs = {
  attachments?: InputMaybe<Array<ChatAttachmentInput>>;
  environmentId: Scalars['String']['input'];
  message: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
  requestSuggestions?: InputMaybe<Scalars['Boolean']['input']>;
  serviceId?: InputMaybe<Scalars['String']['input']>;
  threadId?: InputMaybe<Scalars['String']['input']>;
  workspaceId: Scalars['String']['input'];
};


export type MutationClearGithubBackpressureQueueArgs = {
  plan: GithubBackpressurePlanType;
};


export type MutationCliEventTrackArgs = {
  input: CliEventTrackInput;
};


export type MutationCompactGithubBackpressureQueueArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  plan: GithubBackpressurePlanType;
};


export type MutationCreateRefundRequestArgs = {
  input: RefundFormInput;
};


export type MutationCreateSupportThreadArgs = {
  input: CreateSupportThreadInput;
};


export type MutationCreateWorkspaceRestrictionAppealArgs = {
  input: BanAppealFormInput;
};


export type MutationCustomDomainCreateArgs = {
  input: CustomDomainCreateInput;
};


export type MutationCustomDomainDeleteArgs = {
  id: Scalars['String']['input'];
};


export type MutationCustomDomainIssueCertificateArgs = {
  id: Scalars['String']['input'];
};


export type MutationCustomDomainUpdateArgs = {
  environmentId: Scalars['String']['input'];
  id: Scalars['String']['input'];
  targetPort?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationCustomerApplyCreditArgs = {
  id: Scalars['String']['input'];
  input: CustomerApplyCreditInput;
};


export type MutationCustomerCancelIncompletePaymentIntentArgs = {
  id: Scalars['String']['input'];
  input: CustomerCancelIncompletePaymentIntentInput;
};


export type MutationCustomerCancelIncompleteSubscriptionArgs = {
  id: Scalars['String']['input'];
  input: CustomerCancelIncompleteSubscriptionInput;
};


export type MutationCustomerCancelSubscriptionArgs = {
  comment?: InputMaybe<Scalars['String']['input']>;
  feedback: Scalars['String']['input'];
  id: Scalars['String']['input'];
};


export type MutationCustomerCancelSubscriptionsArgs = {
  id: Scalars['String']['input'];
};


export type MutationCustomerCompleteSpendCommitmentSubscriptionArgs = {
  id: Scalars['String']['input'];
  input: CustomerCompleteSpendCommitmentSubscriptionInput;
};


export type MutationCustomerCompleteUsageSubscriptionV2Args = {
  id: Scalars['String']['input'];
  input: CustomerCompleteUsageSubscriptionV2Input;
};


export type MutationCustomerCreateBillingPortalArgs = {
  id: Scalars['String']['input'];
  input: CustomerCreateBillingPortalInput;
};


export type MutationCustomerCreateBountyPayoutArgs = {
  amountCents: Scalars['Int']['input'];
  bountyId: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};


export type MutationCustomerCreateFreePlanSubscriptionArgs = {
  id: Scalars['String']['input'];
};


export type MutationCustomerCreateThreadPayoutArgs = {
  amountCents: Scalars['Int']['input'];
  threadId: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};


export type MutationCustomerCreateUsageSubscriptionV2Args = {
  id: Scalars['String']['input'];
  input: CustomerCreateUsageSubscriptionV2Input;
};


export type MutationCustomerDeletePaymentMethodsArgs = {
  id: Scalars['String']['input'];
};


export type MutationCustomerDeleteTaxIdArgs = {
  id: Scalars['String']['input'];
  taxIdId: Scalars['String']['input'];
};


export type MutationCustomerPurchaseCreditsArgs = {
  id: Scalars['String']['input'];
  input: CustomerPurchaseCreditsInput;
};


export type MutationCustomerRenewSubscriptionArgs = {
  id: Scalars['String']['input'];
};


export type MutationCustomerReplacePaymentMethodArgs = {
  id: Scalars['String']['input'];
  input: CustomerReplacePaymentMethodInput;
};


export type MutationCustomerReportUsageArgs = {
  customerId: Scalars['String']['input'];
};


export type MutationCustomerSubscribeToSpendCommitmentArgs = {
  id: Scalars['String']['input'];
  input: CustomerSubscribeToSpendCommitmentInput;
};


export type MutationCustomerTogglePayoutsToCreditsArgs = {
  customerId: Scalars['String']['input'];
  input: CustomerTogglePayoutsToCreditsInput;
};


export type MutationCustomerTransferCreditsArgs = {
  input: CustomerTransferCreditInput;
  receiverCustomerId: Scalars['String']['input'];
  senderCustomerId: Scalars['String']['input'];
};


export type MutationCustomerUpdateBillingDetailsArgs = {
  id: Scalars['String']['input'];
  input: CustomerUpdateBillingDetailsInput;
};


export type MutationCustomerUpdateBillingEmailArgs = {
  id: Scalars['String']['input'];
  input: CustomerUpdateBillingEmailInput;
};


export type MutationCustomerVoidIncompleteSpendCommitmentInvoiceArgs = {
  id: Scalars['String']['input'];
  input: CustomerVoidIncompleteSpendCommitmentInvoiceInput;
};


export type MutationDatabasePasswordResetArgs = {
  input: DatabasePasswordResetInput;
};


export type MutationDataplaneClusterCreateArgs = {
  label: Scalars['String']['input'];
  namespace: Scalars['String']['input'];
  regionID: Scalars['String']['input'];
};


export type MutationDataplaneLighthouseTokenCreateArgs = {
  computeClusterId: Scalars['String']['input'];
  reason: Scalars['String']['input'];
  ttl?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationDataplaneLighthouseTokenDeleteArgs = {
  tokenId: Scalars['String']['input'];
};


export type MutationDeploymentApproveArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeploymentCancelArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeploymentEventAckArgs = {
  deploymentEventId: Scalars['String']['input'];
  deploymentId: Scalars['String']['input'];
};


export type MutationDeploymentInstanceExecutionCreateArgs = {
  input: DeploymentInstanceExecutionCreateInput;
};


export type MutationDeploymentRedeployArgs = {
  id: Scalars['String']['input'];
  usePreviousImageTag?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationDeploymentRemoveArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeploymentRestartArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeploymentRollbackArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeploymentStopArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeploymentTriggerCreateArgs = {
  input: DeploymentTriggerCreateInput;
};


export type MutationDeploymentTriggerDeleteArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeploymentTriggerUpdateArgs = {
  id: Scalars['String']['input'];
  input: DeploymentTriggerUpdateInput;
};


export type MutationDeploymentsNeedApprovalUpdateArgs = {
  deploymentsNeedApproval: DeploymentsNeedApproval;
  workspaceId: Scalars['String']['input'];
};


export type MutationDisableServiceCdnArgs = {
  input: DisableServiceCdnInput;
};


export type MutationDockerComposeImportArgs = {
  environmentId: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
  skipStagingPatch?: InputMaybe<Scalars['Boolean']['input']>;
  yaml: Scalars['String']['input'];
};


export type MutationDomainConnectStateVerifyArgs = {
  state: Scalars['String']['input'];
};


export type MutationDomainConnectUrlGenerateArgs = {
  domainId: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
  redirectUri: Scalars['String']['input'];
  returnUrl?: InputMaybe<Scalars['String']['input']>;
};


export type MutationDrainStackerArgs = {
  options: DrainStackerOptionsInput;
  workflowId: Scalars['String']['input'];
};


export type MutationDrainStackerCancelArgs = {
  workflowId: Scalars['String']['input'];
};


export type MutationDrainStackerFindMatchesArgs = {
  allowStaticIPs?: InputMaybe<Scalars['Boolean']['input']>;
  allowedPlans: Array<Scalars['String']['input']>;
  allowedRuntimes: Array<Scalars['String']['input']>;
  batchSize?: InputMaybe<Scalars['Int']['input']>;
  cron?: InputMaybe<Scalars['Boolean']['input']>;
  drainPayloadsType: DrainPayloadsType;
  stackerId: Scalars['String']['input'];
  stateless?: InputMaybe<Scalars['Boolean']['input']>;
  workspaceId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationEgressGatewayAssociationCreateArgs = {
  input: EgressGatewayCreateInput;
};


export type MutationEgressGatewayAssociationsClearArgs = {
  input: EgressGatewayServiceTargetInput;
};


export type MutationEgressGatewayRollbackFromHaArgs = {
  input: EgressGatewayServiceTargetInput;
};


export type MutationEgressGatewayUpgradeToHaArgs = {
  input: EgressGatewayServiceTargetInput;
};


export type MutationEmailChangeConfirmArgs = {
  nonce: Scalars['String']['input'];
};


export type MutationEmailChangeInitiateArgs = {
  newEmail: Scalars['String']['input'];
};


export type MutationEnableServiceCdnArgs = {
  input: EnableServiceCdnInput;
};


export type MutationEnterpriseDemoRequestArgs = {
  input: EnterpriseDemoRequestInput;
};


export type MutationEnvironmentAccessUpdateArgs = {
  access: EnvironmentAccess;
  id: Scalars['String']['input'];
};


export type MutationEnvironmentApplyChangeSetArgs = {
  commitMessage?: InputMaybe<Scalars['String']['input']>;
  environmentId: Scalars['String']['input'];
  input: Scalars['JSON']['input'];
};


export type MutationEnvironmentCreateArgs = {
  input: EnvironmentCreateInput;
};


export type MutationEnvironmentDeleteArgs = {
  id: Scalars['String']['input'];
};


export type MutationEnvironmentPatchCommitArgs = {
  commitMessage?: InputMaybe<Scalars['String']['input']>;
  environmentId: Scalars['String']['input'];
  patch?: InputMaybe<Scalars['EnvironmentConfig']['input']>;
};


export type MutationEnvironmentPatchCommitStagedArgs = {
  commitMessage?: InputMaybe<Scalars['String']['input']>;
  environmentId: Scalars['String']['input'];
  skipDeploys?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationEnvironmentPreviewChangeSetArgs = {
  environmentId: Scalars['String']['input'];
  input: Scalars['JSON']['input'];
};


export type MutationEnvironmentRenameArgs = {
  id: Scalars['String']['input'];
  input: EnvironmentRenameInput;
};


export type MutationEnvironmentStageChangesArgs = {
  environmentId: Scalars['String']['input'];
  input: Scalars['EnvironmentConfig']['input'];
  merge?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationEnvironmentTriggersDeployArgs = {
  input: EnvironmentTriggersDeployInput;
};


export type MutationEnvironmentUnskipServiceArgs = {
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type MutationEventBatchTrackArgs = {
  input: EventBatchTrackInput;
};


export type MutationEventTrackArgs = {
  input: EventTrackInput;
};


export type MutationFairUseAgreeArgs = {
  agree: Scalars['Boolean']['input'];
};


export type MutationFeatureFlagAddArgs = {
  input: FeatureFlagToggleInput;
};


export type MutationFeatureFlagRemoveArgs = {
  input: FeatureFlagToggleInput;
};


export type MutationGenerateAdoptionInfoArgs = {
  workspaceId: Scalars['String']['input'];
};


export type MutationGenerateShellTokenArgs = {
  input: ShellTokenInput;
};


export type MutationGithubRepoDeployArgs = {
  input: GitHubRepoDeployInput;
};


export type MutationGithubRepoUpdateArgs = {
  input: GitHubRepoUpdateInput;
};


export type MutationGroupCreateArgs = {
  input: GroupCreateInput;
};


export type MutationGroupDeleteArgs = {
  id: Scalars['String']['input'];
};


export type MutationGroupSetArgs = {
  input: GroupSetInput;
};


export type MutationGroupUpdateArgs = {
  id: Scalars['String']['input'];
  input: GroupUpdateInput;
};


export type MutationHelpStationBanUserArgs = {
  banReason: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};


export type MutationHelpStationBanWorkspaceArgs = {
  banReason: Scalars['String']['input'];
  bypassProCheck?: InputMaybe<Scalars['Boolean']['input']>;
  workspaceId: Scalars['String']['input'];
};


export type MutationHelpStationPlanLimitOverrideUpsertScopedArgs = {
  input: HelpStationPlanLimitOverrideUpsertScopedInput;
};


export type MutationHelpStationResizeVolumeArgs = {
  input: HelpStationResizeVolumeInput;
};


export type MutationHelpStationRestrictWorkspaceArgs = {
  bypassProCheck?: InputMaybe<Scalars['Boolean']['input']>;
  input: WorkspaceRestrictInput;
  workspaceId: Scalars['String']['input'];
};


export type MutationHelpStationTakedownDomainArgs = {
  bypassProCheck?: InputMaybe<Scalars['Boolean']['input']>;
  domainName: Scalars['String']['input'];
};


export type MutationHelpStationUnrestrictWorkspaceArgs = {
  input?: InputMaybe<WorkspaceUnrestrictInput>;
  workspaceId: Scalars['String']['input'];
};


export type MutationHerokuImportVariablesArgs = {
  input: HerokuImportVariablesInput;
};


export type MutationIntegrationCreateArgs = {
  input: IntegrationCreateInput;
};


export type MutationIntegrationDeleteArgs = {
  id: Scalars['String']['input'];
};


export type MutationIntegrationUpdateArgs = {
  id: Scalars['String']['input'];
  input: IntegrationUpdateInput;
};


export type MutationInviteCodeUseArgs = {
  code: Scalars['String']['input'];
};


export type MutationJobApplicationCreateArgs = {
  input: JobApplicationCreateInput;
  resume: Scalars['Upload']['input'];
};


export type MutationLoginSessionAuthArgs = {
  input: LoginSessionAuthInput;
};


export type MutationLoginSessionCancelArgs = {
  code: Scalars['String']['input'];
};


export type MutationLoginSessionConsumeArgs = {
  code: Scalars['String']['input'];
};


export type MutationLoginSessionVerifyArgs = {
  code: Scalars['String']['input'];
};


export type MutationMergeDeploymentFixPrArgs = {
  prNumber: Scalars['Int']['input'];
  serviceId: Scalars['String']['input'];
};


export type MutationMigrateStackerArgs = {
  stackerId: Scalars['String']['input'];
};


export type MutationMissingCommandAlertArgs = {
  input: MissingCommandAlertInput;
};


export type MutationMongoDeleteCollectionArgs = {
  database: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  name: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type MutationMongoDeleteDocumentArgs = {
  database: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  id: Scalars['String']['input'];
  name: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type MutationMongoDummyDataArgs = {
  database: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type MutationMongoInsertDocumentArgs = {
  data: Scalars['JSON']['input'];
  database: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  name: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type MutationMongoUpdateDocumentArgs = {
  data: Scalars['JSON']['input'];
  database: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  id: Scalars['String']['input'];
  name: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type MutationNotificationDeliveriesMarkAsReadArgs = {
  deliveryIds: Array<Scalars['String']['input']>;
};


export type MutationNotificationRuleCreateArgs = {
  input: CreateNotificationRuleInput;
};


export type MutationNotificationRuleDeleteArgs = {
  id: Scalars['String']['input'];
};


export type MutationNotificationRuleUpdateArgs = {
  id: Scalars['String']['input'];
  input: UpdateNotificationRuleInput;
};


export type MutationNotificationUserFilterDeleteArgs = {
  id: Scalars['String']['input'];
};


export type MutationNotificationUserFilterUpsertArgs = {
  input: NotificationUserFilterUpsertInput;
};


export type MutationOauthAuthorizedAppRevokeArgs = {
  id: Scalars['String']['input'];
};


export type MutationOauthAuthorizedAppUpdateProjectsArgs = {
  grantAllProjects: Scalars['Boolean']['input'];
  id: Scalars['String']['input'];
  projectIds?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationOauthAuthorizedAppUpdateWorkspacesArgs = {
  grantAllWorkspaces: Scalars['Boolean']['input'];
  id: Scalars['String']['input'];
  workspaceIds?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationOauthClientCreateArgs = {
  input: OAuthClientCreateInput;
};


export type MutationOauthClientDeleteArgs = {
  id: Scalars['String']['input'];
};


export type MutationOauthClientSecretCreateArgs = {
  oauthClientId: Scalars['String']['input'];
};


export type MutationOauthClientSecretRevokeArgs = {
  id: Scalars['String']['input'];
};


export type MutationOauthClientUpdateArgs = {
  id: Scalars['String']['input'];
  input: OAuthClientUpdateInput;
};


export type MutationObservabilityDashboardCreateArgs = {
  input: ObservabilityDashboardCreateInput;
};


export type MutationObservabilityDashboardMonitorCreateArgs = {
  dashboardItemId: Scalars['String']['input'];
  input: ObservabilityDashboardMonitorCreateInput;
};


export type MutationObservabilityDashboardMonitorRemoveArgs = {
  id: Scalars['String']['input'];
};


export type MutationObservabilityDashboardMonitorUpdateArgs = {
  id: Scalars['String']['input'];
  input: ObservabilityDashboardMonitorUpdateInput;
};


export type MutationObservabilityDashboardResetArgs = {
  id: Scalars['String']['input'];
};


export type MutationObservabilityDashboardUpdateArgs = {
  id: Scalars['String']['input'];
  input: Array<ObservabilityDashboardUpdateInput>;
};


export type MutationPartnershipInquiryArgs = {
  input: PartnershipInquiryInput;
};


export type MutationPasskeyAuthenticationCreateArgs = {
  input?: InputMaybe<PasskeyAuthenticationCreateInput>;
};


export type MutationPasskeyAuthenticationVerifyArgs = {
  input: PasskeyAuthenticationVerifyInput;
};


export type MutationPasskeyDeleteArgs = {
  id: Scalars['String']['input'];
};


export type MutationPasskeyRegistrationVerifyArgs = {
  input: PasskeyRegistrationVerifyInput;
};


export type MutationPasskeysDeleteAllArgs = {
  userId: Scalars['String']['input'];
};


export type MutationPlanLimitOverrideDeleteArgs = {
  customerId: Scalars['String']['input'];
  id: Scalars['String']['input'];
};


export type MutationPlanLimitOverrideUpsertArgs = {
  input: PlanLimitOverrideUpsertInput;
};


export type MutationPlatformServiceToggleArgs = {
  input: TogglePlatformServiceInput;
};


export type MutationPlatformStatusOverrideMessageArgs = {
  input: PlatformStatusOverrideMessageInput;
};


export type MutationPluginCreateArgs = {
  input: PluginCreateInput;
};


export type MutationPluginDeleteArgs = {
  environmentId?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
};


export type MutationPluginGeneratedSignedArchiveUrlArgs = {
  containerId: Scalars['String']['input'];
};


export type MutationPluginResetArgs = {
  id: Scalars['String']['input'];
  input: ResetPluginInput;
};


export type MutationPluginResetCredentialsArgs = {
  id: Scalars['String']['input'];
  input: ResetPluginCredentialsInput;
};


export type MutationPluginRestartArgs = {
  id: Scalars['String']['input'];
  input: PluginRestartInput;
};


export type MutationPluginStartArgs = {
  id: Scalars['String']['input'];
  input: PluginRestartInput;
};


export type MutationPluginUpdateArgs = {
  id: Scalars['String']['input'];
  input: PluginUpdateInput;
};


export type MutationPostSupportMessageArgs = {
  input: PostSupportMessageInput;
};


export type MutationPreferencesUpdateArgs = {
  input: PreferencesUpdateData;
};


export type MutationPricingInvoiceUploadArgs = {
  input: PricingInvoiceUploadInput;
  invoice: Scalars['Upload']['input'];
};


export type MutationPrivateNetworkCreateOrGetArgs = {
  input: PrivateNetworkCreateOrGetInput;
};


export type MutationPrivateNetworkEndpointCreateOrGetArgs = {
  input: PrivateNetworkEndpointCreateOrGetInput;
};


export type MutationPrivateNetworkEndpointDeleteArgs = {
  id: Scalars['String']['input'];
};


export type MutationPrivateNetworkEndpointRenameArgs = {
  dnsName: Scalars['String']['input'];
  id: Scalars['String']['input'];
  privateNetworkId: Scalars['String']['input'];
};


export type MutationPrivateNetworksForEnvironmentDeleteArgs = {
  environmentId: Scalars['String']['input'];
};


export type MutationProjectAdminUpdateArgs = {
  environmentId: Scalars['String']['input'];
  id: Scalars['String']['input'];
  input: ProjectAdminUpdateInput;
};


export type MutationProjectCancelAgentSetupArgs = {
  id: Scalars['String']['input'];
};


export type MutationProjectCanvasEvictArgs = {
  projectId: Scalars['String']['input'];
};


export type MutationProjectCanvasResetArgs = {
  projectId: Scalars['String']['input'];
};


export type MutationProjectClaimArgs = {
  id: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};


export type MutationProjectCreateArgs = {
  input: ProjectCreateInput;
};


export type MutationProjectCreateWithAgentArgs = {
  branch: Scalars['String']['input'];
  fullRepoName: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};


export type MutationProjectDeleteArgs = {
  id: Scalars['String']['input'];
};


export type MutationProjectFeatureFlagAddArgs = {
  input: ProjectFeatureFlagToggleInput;
};


export type MutationProjectFeatureFlagRemoveArgs = {
  input: ProjectFeatureFlagToggleInput;
};


export type MutationProjectInvitationAcceptArgs = {
  code: Scalars['String']['input'];
};


export type MutationProjectInvitationCreateArgs = {
  id: Scalars['String']['input'];
  input: ProjectInvitee;
};


export type MutationProjectInvitationDeleteArgs = {
  id: Scalars['String']['input'];
};


export type MutationProjectInvitationResendArgs = {
  id: Scalars['String']['input'];
};


export type MutationProjectInviteUserArgs = {
  id: Scalars['String']['input'];
  input: ProjectInviteUserInput;
};


export type MutationProjectLeaveArgs = {
  id: Scalars['String']['input'];
};


export type MutationProjectMemberAddArgs = {
  input: ProjectMemberAddInput;
};


export type MutationProjectMemberRemoveArgs = {
  input: ProjectMemberRemoveInput;
};


export type MutationProjectMemberUpdateArgs = {
  input: ProjectMemberUpdateInput;
};


export type MutationProjectScheduleDeleteArgs = {
  id: Scalars['String']['input'];
};


export type MutationProjectScheduleDeleteCancelArgs = {
  id: Scalars['String']['input'];
};


export type MutationProjectScheduleDeleteForceArgs = {
  id: Scalars['String']['input'];
};


export type MutationProjectTokenCreateArgs = {
  input: ProjectTokenCreateInput;
};


export type MutationProjectTokenDeleteArgs = {
  id: Scalars['String']['input'];
};


export type MutationProjectTransferArgs = {
  input: ProjectTransferInput;
  projectId: Scalars['String']['input'];
};


export type MutationProjectTransferConfirmArgs = {
  input: ProjectTransferConfirmInput;
};


export type MutationProjectTransferInitiateArgs = {
  input: ProjectTransferInitiateInput;
};


export type MutationProjectTransferToTeamArgs = {
  id: Scalars['String']['input'];
  input: ProjectTransferToTeamInput;
};


export type MutationProjectUpdateArgs = {
  id: Scalars['String']['input'];
  input: ProjectUpdateInput;
};


export type MutationProviderAuthRemoveArgs = {
  id: Scalars['String']['input'];
};


export type MutationPurgeServiceCacheArgs = {
  input: PurgeServiceCacheInput;
};


export type MutationPushTokenRegisterArgs = {
  token: Scalars['String']['input'];
};


export type MutationPushTokenUnregisterArgs = {
  token: Scalars['String']['input'];
};


export type MutationRailwayDomainCancelPurchaseArgs = {
  input: RailwayDomainCancelPurchaseInput;
};


export type MutationRailwayDomainCompletePurchaseArgs = {
  input: RailwayDomainCompletePurchaseInput;
};


export type MutationRailwayDomainDnsRecordCreateArgs = {
  input: RailwayDomainDnsRecordCreateInput;
};


export type MutationRailwayDomainDnsRecordDeleteArgs = {
  input: RailwayDomainDnsRecordDeleteInput;
};


export type MutationRailwayDomainDnsRecordUpdateArgs = {
  input: RailwayDomainDnsRecordUpdateInput;
};


export type MutationRailwayDomainInitiateTransferOutArgs = {
  input: RailwayDomainInitiateTransferOutInput;
};


export type MutationRailwayDomainNameserversSetArgs = {
  input: RailwayDomainNameserversSetInput;
};


export type MutationRailwayDomainPurchaseArgs = {
  input: RailwayDomainPurchaseInput;
};


export type MutationRailwayDomainRefundArgs = {
  id: Scalars['String']['input'];
};


export type MutationRailwayDomainUpdateArgs = {
  input: RailwayDomainUpdateInput;
};


export type MutationRecoveryCodeValidateArgs = {
  input: RecoveryCodeValidateInput;
};


export type MutationRedisDeleteKeyArgs = {
  environmentId: Scalars['String']['input'];
  key: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type MutationRedisDummyDataArgs = {
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type MutationRedisHashDeleteArgs = {
  environmentId: Scalars['String']['input'];
  key: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
  values: Array<Scalars['String']['input']>;
};


export type MutationRedisHashSetArgs = {
  environmentId: Scalars['String']['input'];
  key: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
  values: Scalars['JSON']['input'];
};


export type MutationRedisPopListArgs = {
  environmentId: Scalars['String']['input'];
  key: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
  side: Scalars['String']['input'];
};


export type MutationRedisPushListArgs = {
  environmentId: Scalars['String']['input'];
  key: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
  side: Scalars['String']['input'];
  values: Array<Scalars['String']['input']>;
};


export type MutationRedisSetAddArgs = {
  environmentId: Scalars['String']['input'];
  key: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
  values: Array<Scalars['String']['input']>;
};


export type MutationRedisSetExpireArgs = {
  environmentId: Scalars['String']['input'];
  key: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
  ttl: Scalars['BigInt']['input'];
};


export type MutationRedisSetListIndexArgs = {
  environmentId: Scalars['String']['input'];
  index: Scalars['Int']['input'];
  key: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
  value: Scalars['String']['input'];
};


export type MutationRedisSetRemoveArgs = {
  environmentId: Scalars['String']['input'];
  key: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
  values: Array<Scalars['String']['input']>;
};


export type MutationRedisStringSetArgs = {
  environmentId: Scalars['String']['input'];
  key: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
  value: Scalars['String']['input'];
};


export type MutationReferralInfoUpdateArgs = {
  input: ReferralInfoUpdateInput;
};


export type MutationRefreshGithubReposCacheArgs = {
  force?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationReissueInvoiceArgs = {
  input: ReissueInvoiceInput;
};


export type MutationSandboxCreateArgs = {
  input: SandboxCreateInput;
};


export type MutationSandboxDestroyArgs = {
  environmentId: Scalars['String']['input'];
  id: Scalars['String']['input'];
};


export type MutationSandboxExecArgs = {
  command: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  id: Scalars['String']['input'];
  timeoutSec?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationSandboxExecKillArgs = {
  environmentId: Scalars['String']['input'];
  execId: Scalars['String']['input'];
  id: Scalars['String']['input'];
  signal?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationSandboxHeartbeatArgs = {
  environmentId: Scalars['String']['input'];
  id: Scalars['String']['input'];
};


export type MutationSandboxTemplateBuildArgs = {
  environmentId: Scalars['String']['input'];
  input: SandboxTemplateInput;
};


export type MutationSendBountyWonEmailArgs = {
  input: SendBountyWonEmailInput;
};


export type MutationSendCommunityThreadNotificationEmailArgs = {
  input: SendCommunityThreadNotificationEmailInput;
};


export type MutationSendCommunityWelcomeEmailArgs = {
  input: SendCommunityWelcomeEmailInput;
};


export type MutationSendNewBountyEmailArgs = {
  input: SendNewBountyEmailInput;
};


export type MutationSendQuestionMovedToBountyEmailArgs = {
  input: SendQuestionMovedToBountyEmailInput;
};


export type MutationSendTemplateQueueEmailArgs = {
  input: SendTemplateQueueEmailInput;
};


export type MutationSendTemplateQueueReminderEmailArgs = {
  input: SendTemplateQueueReminderEmailInput;
};


export type MutationServiceConnectArgs = {
  id: Scalars['String']['input'];
  input: ServiceConnectInput;
};


export type MutationServiceCreateArgs = {
  input: ServiceCreateInput;
};


export type MutationServiceDeleteArgs = {
  environmentId?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
};


export type MutationServiceDisconnectArgs = {
  id: Scalars['String']['input'];
};


export type MutationServiceDomainCreateArgs = {
  input: ServiceDomainCreateInput;
};


export type MutationServiceDomainDeleteArgs = {
  id: Scalars['String']['input'];
};


export type MutationServiceDomainUpdateArgs = {
  input: ServiceDomainUpdateInput;
};


export type MutationServiceDuplicateArgs = {
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type MutationServiceFeatureFlagAddArgs = {
  input: ServiceFeatureFlagToggleInput;
};


export type MutationServiceFeatureFlagRemoveArgs = {
  input: ServiceFeatureFlagToggleInput;
};


export type MutationServiceInstanceAutoDeployUpdateArgs = {
  input: ServiceInstanceAutoDeployUpdateInput;
};


export type MutationServiceInstanceDeployArgs = {
  commitSha?: InputMaybe<Scalars['String']['input']>;
  environmentId: Scalars['String']['input'];
  latestCommit?: InputMaybe<Scalars['Boolean']['input']>;
  serviceId: Scalars['String']['input'];
};


export type MutationServiceInstanceDeployV2Args = {
  commitSha?: InputMaybe<Scalars['String']['input']>;
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type MutationServiceInstanceImageUpdateSkipArgs = {
  input: ServiceInstanceImageUpdateSkipInput;
};


export type MutationServiceInstanceLimitsUpdateArgs = {
  input: ServiceInstanceLimitsUpdateInput;
};


export type MutationServiceInstanceRedeployArgs = {
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type MutationServiceInstanceSuggestedVariablesArgs = {
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type MutationServiceInstanceUpdateArgs = {
  environmentId?: InputMaybe<Scalars['String']['input']>;
  input: ServiceInstanceUpdateInput;
  serviceId: Scalars['String']['input'];
};


export type MutationServiceRemoveUpstreamUrlArgs = {
  id: Scalars['String']['input'];
};


export type MutationServiceUpdateArgs = {
  id: Scalars['String']['input'];
  input: ServiceUpdateInput;
};


export type MutationSessionDeleteArgs = {
  id: Scalars['String']['input'];
};


export type MutationSetClickhouseBackpressureBillingEnabledArgs = {
  enabled: Scalars['Boolean']['input'];
};


export type MutationSetClickhouseBackpressureBillingMaxConcurrentArgs = {
  maxConcurrent: Scalars['Int']['input'];
};


export type MutationSetClickhouseBackpressureLogsMaxConcurrentArgs = {
  maxConcurrent: Scalars['Int']['input'];
};


export type MutationSetClickhouseBackpressureMetricsMaxConcurrentArgs = {
  maxConcurrent: Scalars['Int']['input'];
};


export type MutationSetGithubBackpressureAlertThresholdArgs = {
  threshold: Scalars['Int']['input'];
};


export type MutationSetGithubBackpressureConfigArgs = {
  input: SetGithubBackpressureConfigInput;
};


export type MutationSetGithubBackpressureFailedMessageArgs = {
  message: Scalars['String']['input'];
};


export type MutationSetGithubBackpressureQueuedMessageArgs = {
  message: Scalars['String']['input'];
};


export type MutationSetGithubDeploymentStatusDisabledArgs = {
  disabled: Scalars['Boolean']['input'];
};


export type MutationSetPercentagePlatformFeatureFlagArgs = {
  input: SetPercentagePlatformFeatureFlagInput;
};


export type MutationSetupAgentEventTrackArgs = {
  input: SetupAgentEventTrackInput;
};


export type MutationSharedVariableConfigureArgs = {
  input: SharedVariableConfigureInput;
};


export type MutationSpendCommitmentCancelArgs = {
  id: Scalars['String']['input'];
  input: SpendCommitmentCancelInput;
};


export type MutationSqlColumnInsertArgs = {
  column: SqlColumnInput;
  databaseType: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
  tableName: Scalars['String']['input'];
};


export type MutationSqlDummyDataArgs = {
  databaseType: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type MutationSqlExtensionInstallArgs = {
  databaseType: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  extension: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
  version?: InputMaybe<Scalars['String']['input']>;
};


export type MutationSqlExtensionUninstallArgs = {
  databaseType: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  extension: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type MutationSqlRawQueryRunArgs = {
  databaseType: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  query: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type MutationSqlRowInsertArgs = {
  columns: Array<SqlRowInput>;
  databaseType: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
  tableName: Scalars['String']['input'];
};


export type MutationSqlRowUpdateArgs = {
  data: Scalars['JSON']['input'];
  databaseType: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  pKey: Scalars['String']['input'];
  pKeyValue: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
  tableName: Scalars['String']['input'];
};


export type MutationSqlRowsDeleteArgs = {
  columnName: Scalars['String']['input'];
  databaseType: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  rows: Array<Scalars['String']['input']>;
  serviceId: Scalars['String']['input'];
  tableName: Scalars['String']['input'];
};


export type MutationSqlTableCreateArgs = {
  columns: Array<SqlColumnInput>;
  databaseType: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  name: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type MutationSqlTableDeleteArgs = {
  databaseType: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  name: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type MutationSshPublicKeyCreateArgs = {
  input: SshPublicKeyCreateInput;
};


export type MutationSshPublicKeyDeleteArgs = {
  id: Scalars['String']['input'];
};


export type MutationStackerStatsCancelArgs = {
  workflowId: Scalars['String']['input'];
};


export type MutationStackerStatsGetArgs = {
  stackerId: Scalars['String']['input'];
};


export type MutationStackerVolumesPrunePhantomsArgs = {
  batchSize?: InputMaybe<Scalars['Int']['input']>;
  maxVolumesToDelete?: InputMaybe<Scalars['Int']['input']>;
  olderThanHours: Scalars['Int']['input'];
  sleepMs?: InputMaybe<Scalars['Int']['input']>;
  stackerId: Scalars['String']['input'];
};


export type MutationTcpProxyCreateArgs = {
  input: TcpProxyCreateInput;
};


export type MutationTcpProxyDeleteArgs = {
  id: Scalars['String']['input'];
};


export type MutationTelemetrySendArgs = {
  input: TelemetrySendInput;
};


export type MutationTemplateCloneArgs = {
  input: TemplateCloneInput;
};


export type MutationTemplateCreateV2Args = {
  input: TemplateCreateV2Input;
};


export type MutationTemplateDeleteArgs = {
  id: Scalars['String']['input'];
  input: TemplateDeleteInput;
};


export type MutationTemplateDeployArgs = {
  input: TemplateDeployInput;
};


export type MutationTemplateDeployV2Args = {
  input: TemplateDeployV2Input;
};


export type MutationTemplateGenerateArgs = {
  input: TemplateGenerateInput;
};


export type MutationTemplateHideArgs = {
  id: Scalars['String']['input'];
};


export type MutationTemplateKickbackBackfillArgs = {
  invoiceId: Scalars['String']['input'];
};


export type MutationTemplateMaintainerUpsertArgs = {
  id: Scalars['String']['input'];
  input: TemplateMaintainerUpsertInput;
};


export type MutationTemplateMaybeUnsetCommunityThreadSlugArgs = {
  communityThreadSlug: Scalars['String']['input'];
};


export type MutationTemplatePublishArgs = {
  id: Scalars['String']['input'];
  input: TemplatePublishInput;
};


export type MutationTemplateRevertArgs = {
  input: TemplateRevertInput;
};


export type MutationTemplateServiceSourceEjectArgs = {
  input: TemplateServiceSourceEjectInput;
};


export type MutationTemplateUnpublishArgs = {
  id: Scalars['String']['input'];
};


export type MutationTemplateUpdateV2Args = {
  id: Scalars['String']['input'];
  input: TemplateCreateV2Input;
};


export type MutationTemplateUpsertConfigArgs = {
  id: Scalars['String']['input'];
  input: TemplateUpsertConfigInput;
};


export type MutationTemplateUpsertSettingsArgs = {
  id: Scalars['String']['input'];
  input: TemplateUpsertSettingsInput;
};


export type MutationTogglePlatformFeatureFlagArgs = {
  input: TogglePlatformFeatureFlagInput;
};


export type MutationTriggerDeploymentDiagnosisArgs = {
  deploymentId: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
};


export type MutationTriggerDeploymentFixPrArgs = {
  deploymentId: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  fixId: Scalars['String']['input'];
};


export type MutationTrustedDomainCreateArgs = {
  input: WorkspaceTrustedDomainCreateInput;
};


export type MutationTrustedDomainDeleteArgs = {
  id: Scalars['String']['input'];
};


export type MutationTrustedDomainRetriggerVerificationArgs = {
  id: Scalars['String']['input'];
};


export type MutationTwoFactorInfoCreateArgs = {
  input: TwoFactorInfoCreateInput;
};


export type MutationTwoFactorInfoResetArgs = {
  userId: Scalars['String']['input'];
};


export type MutationTwoFactorInfoValidateArgs = {
  input: TwoFactorInfoValidateInput;
};


export type MutationUpdateServiceEdgeConfigArgs = {
  input: UpdateServiceEdgeConfigInput;
};


export type MutationUpdateTemplateSupportMetricsArgs = {
  templateUpdates: Array<TemplateSupportMetricsUpdate>;
};


export type MutationUpsertSlackChannelArgs = {
  workspaceId: Scalars['String']['input'];
};


export type MutationUsageAnomalyAllowArgs = {
  input: UsageAnomalyAllowInput;
};


export type MutationUsageLimitRemoveArgs = {
  input: UsageLimitRemoveInput;
};


export type MutationUsageLimitSetArgs = {
  input: UsageLimitSetInput;
};


export type MutationUserBanArgs = {
  input: UserBanInput;
};


export type MutationUserFlagsRemoveArgs = {
  input: UserFlagsRemoveInput;
};


export type MutationUserFlagsSetArgs = {
  input: UserFlagsSetInput;
};


export type MutationUserProfileUpdateArgs = {
  input: UserProfileUpdateInput;
};


export type MutationUserRiskLevelUpdateArgs = {
  input: UserRiskLevelUpdateInput;
};


export type MutationUserTrialWorkspaceCreateArgs = {
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUserUnbanArgs = {
  userId: Scalars['String']['input'];
};


export type MutationUserUpdateArgs = {
  input: UserUpdateInput;
};


export type MutationVariableCollectionUpsertArgs = {
  input: VariableCollectionUpsertInput;
};


export type MutationVariableDeleteArgs = {
  input: VariableDeleteInput;
};


export type MutationVariableUpsertArgs = {
  input: VariableUpsertInput;
};


export type MutationVolumeCreateArgs = {
  input: VolumeCreateInput;
};


export type MutationVolumeDeleteArgs = {
  volumeId: Scalars['String']['input'];
};


export type MutationVolumeInstanceBackupBatchDeleteArgs = {
  volumeInstanceBackupIds: Array<Scalars['String']['input']>;
  volumeInstanceId: Scalars['String']['input'];
};


export type MutationVolumeInstanceBackupCreateArgs = {
  name?: InputMaybe<Scalars['String']['input']>;
  volumeInstanceId: Scalars['String']['input'];
};


export type MutationVolumeInstanceBackupCreateForHaConversionArgs = {
  volumeInstanceId: Scalars['String']['input'];
};


export type MutationVolumeInstanceBackupDeleteArgs = {
  volumeInstanceBackupId: Scalars['String']['input'];
  volumeInstanceId: Scalars['String']['input'];
};


export type MutationVolumeInstanceBackupLockArgs = {
  volumeInstanceBackupId: Scalars['String']['input'];
  volumeInstanceId: Scalars['String']['input'];
};


export type MutationVolumeInstanceBackupRestoreArgs = {
  replicaServiceIds?: InputMaybe<Array<Scalars['String']['input']>>;
  volumeInstanceBackupId: Scalars['String']['input'];
  volumeInstanceId: Scalars['String']['input'];
  wipeServiceIds?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationVolumeInstanceBackupScheduleUpdateArgs = {
  kinds: Array<VolumeInstanceBackupScheduleKind>;
  volumeInstanceId: Scalars['String']['input'];
};


export type MutationVolumeInstanceCancelDeletionArgs = {
  volumeInstanceId: Scalars['String']['input'];
};


export type MutationVolumeInstanceChangeRegionArgs = {
  input: VolumeInstanceChangeRegionInput;
  volumeInstanceId: Scalars['String']['input'];
};


export type MutationVolumeInstanceCopyFromEnvironmentArgs = {
  destinationEnvironmentId: Scalars['String']['input'];
  destinationVolumeInstanceId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
  sourceEnvironmentId: Scalars['String']['input'];
};


export type MutationVolumeInstancePitrRestoreArgs = {
  newServiceName?: InputMaybe<Scalars['String']['input']>;
  sourceRepoPath?: InputMaybe<Scalars['String']['input']>;
  targetTimestamp: Scalars['DateTime']['input'];
  volumeInstanceId: Scalars['String']['input'];
};


export type MutationVolumeInstanceResizeArgs = {
  environmentId?: InputMaybe<Scalars['String']['input']>;
  input: VolumeInstanceResizeInput;
  volumeId: Scalars['String']['input'];
};


export type MutationVolumeInstanceRevertMigrationArgs = {
  eventId: Scalars['String']['input'];
  revertReason?: InputMaybe<Scalars['String']['input']>;
};


export type MutationVolumeInstanceUpdateArgs = {
  environmentId?: InputMaybe<Scalars['String']['input']>;
  input: VolumeInstanceUpdateInput;
  volumeId: Scalars['String']['input'];
};


export type MutationVolumeInstanceWipeArgs = {
  volumeInstanceId: Scalars['String']['input'];
};


export type MutationVolumeUpdateArgs = {
  input: VolumeUpdateInput;
  volumeId: Scalars['String']['input'];
};


export type MutationWebhookTestArgs = {
  payload: Scalars['String']['input'];
  url: Scalars['String']['input'];
};


export type MutationWithdrawalAccountCreateArgs = {
  input: CreateWithdrawalAccountInput;
};


export type MutationWithdrawalAccountCreateV3Args = {
  input: CreateWithdrawalAccountInput;
};


export type MutationWithdrawalAccountDeleteArgs = {
  id: Scalars['String']['input'];
};


export type MutationWithdrawalConfirmationAddArgs = {
  id: Scalars['String']['input'];
};


export type MutationWithdrawalToCashCreateArgs = {
  input: WithdrawalRequestInput;
};


export type MutationWithdrawalToCreditCreateArgs = {
  input: WithdrawalToCreditInput;
};


export type MutationWorkspaceAutomaticDiagnosisUpdateArgs = {
  enable: Scalars['Boolean']['input'];
  workspaceId: Scalars['String']['input'];
};


export type MutationWorkspaceBanArgs = {
  input: WorkspaceBanInput;
  workspaceId: Scalars['String']['input'];
};


export type MutationWorkspaceCompletePlanUpgradeArgs = {
  id: Scalars['String']['input'];
  subscriptionId: Scalars['String']['input'];
};


export type MutationWorkspaceCompletePostCreationTasksArgs = {
  input: WorkspaceCompletePostCreationTasksInput;
};


export type MutationWorkspaceCreateAndSubscribeV2Args = {
  input: WorkspaceCreateAndSubscribeInput;
};


export type MutationWorkspaceDeleteArgs = {
  id: Scalars['String']['input'];
};


export type MutationWorkspaceIdentityProviderConfigureArgs = {
  workspaceId: Scalars['String']['input'];
};


export type MutationWorkspaceIdentityProviderCreateArgs = {
  input: WorkspaceIdentityProviderCreateInput;
};


export type MutationWorkspaceIdentityProviderEnforceArgs = {
  enabled: Scalars['Boolean']['input'];
  workspaceId: Scalars['String']['input'];
};


export type MutationWorkspaceInviteCodeCreateArgs = {
  input: WorkspaceInviteCodeCreateInput;
  workspaceId: Scalars['String']['input'];
};


export type MutationWorkspaceInviteCodeUseArgs = {
  code: Scalars['String']['input'];
};


export type MutationWorkspaceLeaveArgs = {
  id: Scalars['String']['input'];
};


export type MutationWorkspacePermissionChangeArgs = {
  input: WorkspacePermissionChangeInput;
};


export type MutationWorkspacePolicyDeploySourceAllowlistAddArgs = {
  sourceId: Scalars['String']['input'];
  sourceType: WorkspacePolicyDeploySourceType;
  workspaceId: Scalars['String']['input'];
};


export type MutationWorkspacePolicyDeploySourceAllowlistRemoveArgs = {
  id: Scalars['String']['input'];
};


export type MutationWorkspacePolicyItemUpdateArgs = {
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  input?: InputMaybe<WorkspacePolicyItemUpdateInput>;
  policy?: InputMaybe<WorkspacePolicyName>;
  workspaceId: Scalars['String']['input'];
};


export type MutationWorkspaceResourcesStopArgs = {
  input?: InputMaybe<WorkspaceResourcesStopInput>;
  workspaceId: Scalars['String']['input'];
};


export type MutationWorkspaceRestrictArgs = {
  input: WorkspaceRestrictInput;
  workspaceId: Scalars['String']['input'];
};


export type MutationWorkspaceTwoFactorEnforcementUpdateArgs = {
  enabled: Scalars['Boolean']['input'];
  workspaceId: Scalars['String']['input'];
};


export type MutationWorkspaceUnbanArgs = {
  input?: InputMaybe<WorkspaceUnbanInput>;
  workspaceId: Scalars['String']['input'];
};


export type MutationWorkspaceUnrestrictArgs = {
  input?: InputMaybe<WorkspaceUnrestrictInput>;
  workspaceId: Scalars['String']['input'];
};


export type MutationWorkspaceUpdateArgs = {
  id: Scalars['String']['input'];
  input: WorkspaceUpdateInput;
};


export type MutationWorkspaceUpdateLimitsVersionArgs = {
  limitsVersion: LimitsVersion;
  workspaceId: Scalars['String']['input'];
};


export type MutationWorkspaceUpdatePartnerProfileArgs = {
  id: Scalars['String']['input'];
  input: PartnerProfileInput;
};


export type MutationWorkspaceUpdatePlanArgs = {
  forceDowngrade?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['String']['input'];
  plan: Plan;
};


export type MutationWorkspaceUpsertSlackChannelArgs = {
  id: Scalars['String']['input'];
};


export type MutationWorkspaceUserInviteArgs = {
  input: WorkspaceUserInviteInput;
  workspaceId: Scalars['String']['input'];
};


export type MutationWorkspaceUserRemoveArgs = {
  input: WorkspaceUserRemoveInput;
  workspaceId: Scalars['String']['input'];
};

/** An aggregated network connection (grouped by 5-tuple) */
export type NetworkConnection = {
  __typename?: 'NetworkConnection';
  /** Number of flows with dropped packets */
  droppedCount: Scalars['Int']['output'];
  /** Destination IP address */
  dstAddr: Scalars['String']['output'];
  /** Destination port number */
  dstPort: Scalars['Int']['output'];
  /** Timestamp of first flow (ISO) */
  firstSeen: Scalars['String']['output'];
  /** Number of individual flows in this connection */
  flowCount: Scalars['Int']['output'];
  /** Layer 4 protocol */
  l4Protocol: NetworkFlowL4Protocol;
  /** Timestamp of last flow (ISO) */
  lastSeen: Scalars['String']['output'];
  /** Type of peer */
  peerKind: NetworkFlowPeerKind;
  /** Service instance ID of the peer */
  peerServiceId?: Maybe<Scalars['String']['output']>;
  /** Source IP address */
  srcAddr: Scalars['String']['output'];
  /** Source port number */
  srcPort: Scalars['Int']['output'];
  /** Total bytes transferred */
  totalBytes: Scalars['Int']['output'];
  /** Total packets transferred */
  totalPackets: Scalars['Int']['output'];
};

/** The direction of a network flow relative to the service */
export type NetworkFlowDirection =
  | 'egress'
  | 'ingress';

/** The layer 4 protocol of a network flow */
export type NetworkFlowL4Protocol =
  | 'icmp'
  | 'icmpv6'
  | 'tcp'
  | 'udp'
  | 'unknown';

/** A single network flow log entry */
export type NetworkFlowLog = {
  __typename?: 'NetworkFlowLog';
  /** Number of bytes transferred */
  byteCount: Scalars['Int']['output'];
  /** When the flow capture ended (ISO timestamp) */
  captureEnd: Scalars['String']['output'];
  /** When the flow capture started (ISO timestamp) */
  captureStart: Scalars['String']['output'];
  /** The deployment ID */
  deploymentId: Scalars['String']['output'];
  /** The deployment instance ID */
  deploymentInstanceId: Scalars['String']['output'];
  /** Traffic direction (ingress or egress) */
  direction: NetworkFlowDirection;
  /** If packets were dropped, the reason */
  dropCause?: Maybe<Scalars['String']['output']>;
  /** Destination IP address */
  dstAddr: Scalars['String']['output'];
  /** Destination port number */
  dstPort: Scalars['Int']['output'];
  /** Unique identifier for the flow */
  flowId: Scalars['String']['output'];
  /** Whether the flow is partial or complete */
  flowState: NetworkFlowState;
  /** Layer 4 latency in milliseconds */
  l4LatencyMs: Scalars['Float']['output'];
  /** Layer 4 protocol (TCP, UDP, ICMP, etc) */
  l4Protocol: NetworkFlowL4Protocol;
  /** Number of packets transferred */
  packetCount: Scalars['Int']['output'];
  /** Type of peer (service, internet, DNS, etc) */
  peerKind: NetworkFlowPeerKind;
  /** Service instance ID of the peer (for service-to-service flows) */
  peerServiceId?: Maybe<Scalars['String']['output']>;
  /** The service ID this flow belongs to */
  serviceId: Scalars['String']['output'];
  /** Source IP address */
  srcAddr: Scalars['String']['output'];
  /** Source port number */
  srcPort: Scalars['Int']['output'];
};

/** The type of peer in a network flow */
export type NetworkFlowPeerKind =
  | 'edge_proxy'
  | 'internet'
  | 'local_dns'
  | 'service'
  | 'unknown';

/** The result of a network flow service layer query */
export type NetworkFlowServiceLayerResult = {
  __typename?: 'NetworkFlowServiceLayerResult';
  /** Raw JSON representation of the services map for direct consumption */
  raw: Scalars['JSON']['output'];
  /** List of services with their peer connections */
  services: Array<ServiceFlowEntry>;
};

/** The state of a network flow */
export type NetworkFlowState =
  | 'complete'
  | 'partial';

export type Node = {
  id: Scalars['ID']['output'];
};

export type NodeLogAnalysis = {
  __typename?: 'NodeLogAnalysis';
  analyzedAt: Scalars['String']['output'];
  criticalCount: Scalars['Int']['output'];
  errorCount: Scalars['Int']['output'];
  issues: Array<LogIssue>;
  lastLogAt?: Maybe<Scalars['String']['output']>;
  logSpewDetected: Scalars['Boolean']['output'];
  spewTemplates: Array<LogSpewPattern>;
  totalLinesAnalyzed: Scalars['Int']['output'];
  warningCount: Scalars['Int']['output'];
};

export type NotificationChannel = Node & {
  __typename?: 'NotificationChannel';
  config: Scalars['NotificationChannelConfig']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  updatedAt: Scalars['DateTime']['output'];
  workspaceId: Scalars['String']['output'];
};

export type NotificationDelivery = Node & {
  __typename?: 'NotificationDelivery';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  notificationInstance: NotificationInstance;
  readAt?: Maybe<Scalars['DateTime']['output']>;
  status: NotificationDeliveryStatus;
  type: NotificationDeliveryType;
  updatedAt: Scalars['DateTime']['output'];
  userId?: Maybe<Scalars['String']['output']>;
};

export type NotificationDeliveryCreated = {
  __typename?: 'NotificationDeliveryCreated';
  delivery: NotificationDelivery;
  type: Scalars['String']['output'];
};

export type NotificationDeliveryFilterInput = {
  environmentId?: InputMaybe<Scalars['String']['input']>;
  onlyUnread?: InputMaybe<Scalars['Boolean']['input']>;
  projectId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<NotificationStatus>;
  type?: InputMaybe<NotificationDeliveryType>;
  workspaceId?: InputMaybe<Scalars['String']['input']>;
};

export type NotificationDeliveryResolved = {
  __typename?: 'NotificationDeliveryResolved';
  deliveryIds: Array<Scalars['String']['output']>;
  type: Scalars['String']['output'];
};

export type NotificationDeliveryStatus =
  | 'FAILED'
  | 'PENDING'
  | 'SENT';

export type NotificationDeliveryType =
  | 'EMAIL'
  | 'INAPP'
  | 'WEBHOOK';

export type NotificationDeliveryUpdate = NotificationDeliveryCreated | NotificationDeliveryResolved;

export type NotificationInstance = Node & {
  __typename?: 'NotificationInstance';
  createdAt: Scalars['DateTime']['output'];
  environmentId?: Maybe<Scalars['String']['output']>;
  event: Event;
  eventId: Scalars['String']['output'];
  eventType?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  payload: Scalars['NotificationPayload']['output'];
  projectId?: Maybe<Scalars['String']['output']>;
  resolvedAt?: Maybe<Scalars['DateTime']['output']>;
  resourceId?: Maybe<Scalars['String']['output']>;
  resourceType?: Maybe<Scalars['String']['output']>;
  serviceId?: Maybe<Scalars['String']['output']>;
  severity: NotificationSeverity;
  status: NotificationStatus;
  updatedAt: Scalars['DateTime']['output'];
  volumeId?: Maybe<Scalars['String']['output']>;
  workspaceId: Scalars['String']['output'];
};

export type NotificationInstanceFilterInput = {
  environmentId?: InputMaybe<Scalars['String']['input']>;
  severities?: InputMaybe<Array<NotificationSeverity>>;
  status?: InputMaybe<NotificationStatus>;
  workspaceId?: InputMaybe<Scalars['String']['input']>;
};

export type NotificationRule = Node & {
  __typename?: 'NotificationRule';
  channels: Array<NotificationChannel>;
  createdAt: Scalars['DateTime']['output'];
  environmentId?: Maybe<Scalars['String']['output']>;
  ephemeralEnvironments?: Maybe<Scalars['Boolean']['output']>;
  eventTypes: Array<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  projectId?: Maybe<Scalars['String']['output']>;
  serviceId?: Maybe<Scalars['String']['output']>;
  severities: Array<NotificationSeverity>;
  updatedAt: Scalars['DateTime']['output'];
  workspaceId: Scalars['String']['output'];
};

export type NotificationSeverity =
  | 'CRITICAL'
  | 'INFO'
  | 'NOTICE'
  | 'WARNING';

export type NotificationStatus =
  | 'ACTIVE'
  | 'RESOLVED';

export type NotificationUserFilter = Node & {
  __typename?: 'NotificationUserFilter';
  createdAt: Scalars['DateTime']['output'];
  defaultFilterId?: Maybe<Scalars['String']['output']>;
  deliveryMethods: Array<NotificationDeliveryType>;
  environmentId?: Maybe<Scalars['String']['output']>;
  ephemeralEnvironments?: Maybe<Scalars['Boolean']['output']>;
  eventTypes: Array<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  projectId?: Maybe<Scalars['String']['output']>;
  serviceId?: Maybe<Scalars['String']['output']>;
  severities: Array<NotificationSeverity>;
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['String']['output'];
};

export type NotificationUserFilterUpsertInput = {
  defaultFilterId?: InputMaybe<Scalars['String']['input']>;
  deliveryMethods: Array<NotificationDeliveryType>;
  environmentId?: InputMaybe<Scalars['String']['input']>;
  ephemeralEnvironments?: InputMaybe<Scalars['Boolean']['input']>;
  eventTypes?: InputMaybe<Array<Scalars['String']['input']>>;
  filterId?: InputMaybe<Scalars['String']['input']>;
  projectId?: InputMaybe<Scalars['String']['input']>;
  serviceId?: InputMaybe<Scalars['String']['input']>;
  severities?: InputMaybe<Array<NotificationSeverity>>;
  token?: InputMaybe<Scalars['String']['input']>;
};

export type OAuthClient = Node & {
  __typename?: 'OAuthClient';
  allowDeviceFlow: Scalars['Boolean']['output'];
  applicationType: OAuthClientType;
  clientId: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  logoUrl?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  redirectUris?: Maybe<Array<Scalars['String']['output']>>;
  secrets: Array<OAuthClientSecret>;
  updatedAt: Scalars['DateTime']['output'];
  workspace: Workspace;
};

export type OAuthClientCreateInput = {
  allowDeviceFlow?: InputMaybe<Scalars['Boolean']['input']>;
  applicationType?: InputMaybe<OAuthClientType>;
  description?: InputMaybe<Scalars['String']['input']>;
  logoUrl?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  redirectUris?: InputMaybe<Array<Scalars['String']['input']>>;
  workspaceId: Scalars['String']['input'];
};

export type OAuthClientCreateResponse = {
  __typename?: 'OAuthClientCreateResponse';
  client: OAuthClient;
  secret: OAuthClientSecretWithValue;
};

export type OAuthClientSecret = Node & {
  __typename?: 'OAuthClientSecret';
  createdAt: Scalars['DateTime']['output'];
  displaySecret: Scalars['String']['output'];
  id: Scalars['ID']['output'];
};

export type OAuthClientSecretWithValue = {
  __typename?: 'OAuthClientSecretWithValue';
  createdAt: Scalars['DateTime']['output'];
  displaySecret: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  secret: Scalars['String']['output'];
};

/** OAuth client application type */
export type OAuthClientType =
  | 'NATIVE'
  | 'WEB';

export type OAuthClientUpdateInput = {
  allowDeviceFlow?: InputMaybe<Scalars['Boolean']['input']>;
  applicationType?: InputMaybe<OAuthClientType>;
  description?: InputMaybe<Scalars['String']['input']>;
  logoUrl?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  redirectUris?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type OAuthGrant = Node & {
  __typename?: 'OAuthGrant';
  client: OAuthGrantClient;
  createdAt: Scalars['DateTime']['output'];
  grantAllProjects: Scalars['Boolean']['output'];
  grantAllWorkspaces: Scalars['Boolean']['output'];
  grantedProjects: Array<OAuthGrantProject>;
  grantedWorkspaces: Array<OAuthGrantWorkspace>;
  id: Scalars['ID']['output'];
  scopes: Array<Scalars['String']['output']>;
};

export type OAuthGrantClient = {
  __typename?: 'OAuthGrantClient';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  logoUrl?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
};

export type OAuthGrantProject = {
  __typename?: 'OAuthGrantProject';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  projectId: Scalars['String']['output'];
};

export type OAuthGrantWorkspace = {
  __typename?: 'OAuthGrantWorkspace';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  workspaceId: Scalars['String']['output'];
};

export type OAuthGrantableProject = {
  __typename?: 'OAuthGrantableProject';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  role: Scalars['String']['output'];
  workspaceAvatar?: Maybe<Scalars['String']['output']>;
  workspaceId?: Maybe<Scalars['String']['output']>;
  workspaceName?: Maybe<Scalars['String']['output']>;
};

export type OAuthGrantableWorkspace = {
  __typename?: 'OAuthGrantableWorkspace';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  role: Scalars['String']['output'];
};

export type ObservabilityDashboard = Node & {
  __typename?: 'ObservabilityDashboard';
  id: Scalars['ID']['output'];
  items: Array<ObservabilityDashboardItemInstance>;
};

export type ObservabilityDashboardAlert = Node & {
  __typename?: 'ObservabilityDashboardAlert';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  resolvedAt?: Maybe<Scalars['DateTime']['output']>;
  resourceId?: Maybe<Scalars['String']['output']>;
  resourceType: MonitorAlertResourceType;
  status: MonitorStatus;
};

export type ObservabilityDashboardCreateInput = {
  environmentId: Scalars['String']['input'];
  /** If no items are provided, a default dashboard will be created. */
  items?: InputMaybe<Array<ObservabilityDashboardUpdateInput>>;
};

export type ObservabilityDashboardItem = Node & {
  __typename?: 'ObservabilityDashboardItem';
  config: ObservabilityDashboardItemConfig;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  monitors: Array<ObservabilityDashboardMonitor>;
  name: Scalars['String']['output'];
  type: ObservabilityDashboardItemType;
};

export type ObservabilityDashboardItemConfig = {
  __typename?: 'ObservabilityDashboardItemConfig';
  logsFilter?: Maybe<Scalars['String']['output']>;
  measurements?: Maybe<Array<MetricMeasurement>>;
  projectUsageProperties?: Maybe<Array<ProjectUsageProperty>>;
  resourceIds?: Maybe<Array<Scalars['String']['output']>>;
};

export type ObservabilityDashboardItemConfigInput = {
  logsFilter?: InputMaybe<Scalars['String']['input']>;
  measurements?: InputMaybe<Array<MetricMeasurement>>;
  projectUsageProperties?: InputMaybe<Array<ProjectUsageProperty>>;
  resourceIds?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type ObservabilityDashboardItemCreateInput = {
  config: ObservabilityDashboardItemConfigInput;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  name: Scalars['String']['input'];
  type: ObservabilityDashboardItemType;
};

export type ObservabilityDashboardItemInstance = Node & {
  __typename?: 'ObservabilityDashboardItemInstance';
  dashboardItem: ObservabilityDashboardItem;
  displayConfig: Scalars['DisplayConfig']['output'];
  id: Scalars['ID']['output'];
};

export type ObservabilityDashboardItemType =
  | 'PROJECT_USAGE_ITEM'
  | 'SERVICE_LOGS_ITEM'
  | 'SERVICE_METRICS_ITEM'
  | 'VOLUME_METRICS_ITEM';

export type ObservabilityDashboardMonitor = Node & {
  __typename?: 'ObservabilityDashboardMonitor';
  alerts: Array<ObservabilityDashboardAlert>;
  config: ObservabilityDashboardMonitorConfig;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  updatedAt: Scalars['DateTime']['output'];
};


export type ObservabilityDashboardMonitorAlertsArgs = {
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  startDate?: InputMaybe<Scalars['DateTime']['input']>;
};

export type ObservabilityDashboardMonitorConfig = MonitorThresholdConfig;

export type ObservabilityDashboardMonitorCreateInput = {
  config: MonitorConfigInput;
};

export type ObservabilityDashboardMonitorUpdateInput = {
  config: MonitorConfigInput;
};

export type ObservabilityDashboardUpdateInput = {
  dashboardItem: ObservabilityDashboardItemCreateInput;
  displayConfig: Scalars['DisplayConfig']['input'];
  id: Scalars['String']['input'];
};

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor?: Maybe<Scalars['String']['output']>;
};

/** The parameter to get the top movers for */
export type ParamMeasurement =
  | 'adoptionLevel'
  | 'deltaLevel'
  | 'monthlyEstimatedUsage'
  | 'numSeats';

export type PartnerProfile = {
  __typename?: 'PartnerProfile';
  category: Scalars['String']['output'];
  description: Scalars['String']['output'];
  slug: Scalars['String']['output'];
  type: PartnerProfileType;
  website: Scalars['String']['output'];
};

export type PartnerProfileInput = {
  category: Scalars['String']['input'];
  description: Scalars['String']['input'];
  slug: Scalars['String']['input'];
  type: PartnerProfileType;
  website: Scalars['String']['input'];
};

export type PartnerProfileType =
  | 'BASIC_PARTNER'
  | 'LIMITED_PARTNER'
  | 'TEMPLATE_MAINTAINER';

export type PartnershipInquiryInput = {
  companyName: Scalars['String']['input'];
  companyUrl?: InputMaybe<Scalars['String']['input']>;
  contactName: Scalars['String']['input'];
  description: Scalars['String']['input'];
  email: Scalars['String']['input'];
  githubUrl?: InputMaybe<Scalars['String']['input']>;
  technology?: InputMaybe<Scalars['String']['input']>;
  workspace?: InputMaybe<Scalars['String']['input']>;
};

export type Passkey = Node & {
  __typename?: 'Passkey';
  aaguid?: Maybe<Scalars['String']['output']>;
  backedUp: Scalars['Boolean']['output'];
  createdAt: Scalars['DateTime']['output'];
  credentialId: Scalars['String']['output'];
  deviceName: Scalars['String']['output'];
  deviceType: Scalars['String']['output'];
  displayName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  lastUsedAt?: Maybe<Scalars['DateTime']['output']>;
  lastUsedDevice?: Maybe<Scalars['String']['output']>;
  transports: Array<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type PasskeyAuthenticationCreateInput = {
  twoFactorLinkingKey?: InputMaybe<Scalars['String']['input']>;
};

export type PasskeyAuthenticationVerifyInput = {
  credentialJSON: Scalars['PasskeyAuthenticationCredentialJSON']['input'];
  twoFactorLinkingKey?: InputMaybe<Scalars['String']['input']>;
};

export type PasskeyCreateAuthenticationReponse = {
  __typename?: 'PasskeyCreateAuthenticationReponse';
  optionsJSON: Scalars['PasskeyAuthenticationOptionsJSON']['output'];
};

export type PasskeyCreateRegistrationReponse = {
  __typename?: 'PasskeyCreateRegistrationReponse';
  optionsJSON: Scalars['PasskeyRegistrationOptionsJSON']['output'];
};

export type PasskeyRegistrationVerifyInput = {
  credentialJSON: Scalars['PasskeyRegistrationCredentialJSON']['input'];
};

export type PasskeyVerifyAuthenticationReponse = {
  __typename?: 'PasskeyVerifyAuthenticationReponse';
  success: Scalars['Boolean']['output'];
};

export type PasskeyVerifyRegistrationReponse = {
  __typename?: 'PasskeyVerifyRegistrationReponse';
  passkey?: Maybe<Passkey>;
  success: Scalars['Boolean']['output'];
};

export type PatroniClusterStatus = {
  __typename?: 'PatroniClusterStatus';
  leader?: Maybe<Scalars['String']['output']>;
  members: Array<PatroniMember>;
  scope: Scalars['String']['output'];
};

export type PatroniDcsArchiveConfig = {
  __typename?: 'PatroniDcsArchiveConfig';
  archiveCommand?: Maybe<Scalars['String']['output']>;
  archiveMode?: Maybe<Scalars['String']['output']>;
  archiveTimeout?: Maybe<Scalars['Int']['output']>;
  fetchedAt: Scalars['String']['output'];
};

export type PatroniMember = {
  __typename?: 'PatroniMember';
  lagInMb?: Maybe<Scalars['Float']['output']>;
  name: Scalars['String']['output'];
  role: Scalars['String']['output'];
  state: Scalars['String']['output'];
  timeline: Scalars['Int']['output'];
};

export type PaymentMethod = {
  __typename?: 'PaymentMethod';
  card?: Maybe<PaymentMethodCard>;
  id: Scalars['String']['output'];
};

export type PaymentMethodCard = {
  __typename?: 'PaymentMethodCard';
  brand: Scalars['String']['output'];
  country?: Maybe<Scalars['String']['output']>;
  last4: Scalars['String']['output'];
};

export type PgBackrestBackupSummary = {
  __typename?: 'PgBackrestBackupSummary';
  label: Scalars['String']['output'];
  sizeBytes: Scalars['Float']['output'];
  startedAt: Scalars['String']['output'];
  stoppedAt: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type PgBackrestGapSummary = {
  __typename?: 'PgBackrestGapSummary';
  endedAt: Scalars['String']['output'];
  missingBytesEstimate: Scalars['Float']['output'];
  missingSegmentCount: Scalars['Int']['output'];
  reason: Scalars['String']['output'];
  startedAt: Scalars['String']['output'];
};

export type PgBackrestReachableInterval = {
  __typename?: 'PgBackrestReachableInterval';
  from: Scalars['String']['output'];
  to: Scalars['String']['output'];
};

export type PgBackrestSummary = {
  __typename?: 'PgBackrestSummary';
  archiveHealthy?: Maybe<Scalars['Boolean']['output']>;
  backups: Array<PgBackrestBackupSummary>;
  diffCount: Scalars['Int']['output'];
  earliestBackupAt?: Maybe<Scalars['String']['output']>;
  earliestRestorableAt?: Maybe<Scalars['String']['output']>;
  fullCount: Scalars['Int']['output'];
  gaps: Array<PgBackrestGapSummary>;
  incrCount: Scalars['Int']['output'];
  lastArchivedAt?: Maybe<Scalars['String']['output']>;
  lastCommittedTxnAt?: Maybe<Scalars['String']['output']>;
  latestBackupAt?: Maybe<Scalars['String']['output']>;
  latestRestorableAt?: Maybe<Scalars['String']['output']>;
  newestWalAt?: Maybe<Scalars['String']['output']>;
  oldestWalAt?: Maybe<Scalars['String']['output']>;
  pgWalDirBytes?: Maybe<Scalars['Float']['output']>;
  reachableIntervals: Array<PgBackrestReachableInterval>;
  spoolDirBytes?: Maybe<Scalars['Float']['output']>;
  totalSizeBytes?: Maybe<Scalars['Float']['output']>;
  walTimelines: Array<PgBackrestWalTimelineSummary>;
  walTotalBytes: Scalars['Float']['output'];
  walTotalSegments: Scalars['Int']['output'];
};

export type PgBackrestWalTimelineSummary = {
  __typename?: 'PgBackrestWalTimelineSummary';
  id: Scalars['String']['output'];
  maxSegment: Scalars['String']['output'];
  minSegment: Scalars['String']['output'];
  missingCount: Scalars['Int']['output'];
  newestSegmentAt?: Maybe<Scalars['String']['output']>;
  oldestSegmentAt?: Maybe<Scalars['String']['output']>;
  segmentsExpected: Scalars['Int']['output'];
  segmentsPresent: Scalars['Int']['output'];
  totalBytes: Scalars['Float']['output'];
};

export type PgStatArchiverSummary = {
  __typename?: 'PgStatArchiverSummary';
  archivedCount?: Maybe<Scalars['Int']['output']>;
  failedCount?: Maybe<Scalars['Int']['output']>;
  lastArchivedAt?: Maybe<Scalars['String']['output']>;
  lastArchivedWal?: Maybe<Scalars['String']['output']>;
  lastFailedAt?: Maybe<Scalars['String']['output']>;
  lastFailedWal?: Maybe<Scalars['String']['output']>;
  runtimeArchiveCommand?: Maybe<Scalars['String']['output']>;
  runtimeArchiveMode?: Maybe<Scalars['String']['output']>;
  walSegmentCount?: Maybe<Scalars['Int']['output']>;
};

export type PitrBackrestCheck = {
  __typename?: 'PitrBackrestCheck';
  checkedAt: Scalars['String']['output'];
  error?: Maybe<Scalars['String']['output']>;
  ok: Scalars['Boolean']['output'];
};

export type PitrBucketSummary = {
  __typename?: 'PitrBucketSummary';
  deletedAt?: Maybe<Scalars['String']['output']>;
  exists: Scalars['Boolean']['output'];
  name?: Maybe<Scalars['String']['output']>;
  objectCount?: Maybe<Scalars['Int']['output']>;
  provider?: Maybe<Scalars['String']['output']>;
  sizeGb?: Maybe<Scalars['Float']['output']>;
  spendDollars?: Maybe<Scalars['Float']['output']>;
};

export type PitrConfigMismatch = {
  __typename?: 'PitrConfigMismatch';
  code: Scalars['String']['output'];
  detail: Scalars['String']['output'];
};

export type PitrEnvVarConfig = {
  __typename?: 'PitrEnvVarConfig';
  bucketRef?: Maybe<Scalars['String']['output']>;
  hasKey: Scalars['Boolean']['output'];
  hasSecret: Scalars['Boolean']['output'];
  walArchiveEndpoint?: Maybe<Scalars['String']['output']>;
  walArchivePath?: Maybe<Scalars['String']['output']>;
  walArchiveRegion?: Maybe<Scalars['String']['output']>;
};

export type PitrFleetAggregates = {
  __typename?: 'PitrFleetAggregates';
  archivedCountTotal?: Maybe<Scalars['Float']['output']>;
  diffsLast24h: Scalars['Int']['output'];
  failedCountTotal?: Maybe<Scalars['Float']['output']>;
  fullsLast24h: Scalars['Int']['output'];
  incrsLast24h: Scalars['Int']['output'];
  outliers: PitrFleetOutliers;
  pitrWindowP5Ms?: Maybe<Scalars['Float']['output']>;
  pitrWindowP50Ms?: Maybe<Scalars['Float']['output']>;
  regionCounts: Array<PitrRegionCount>;
  servicesWithWindowCount: Scalars['Int']['output'];
  staleFullCount: Scalars['Int']['output'];
  thinWindowCount: Scalars['Int']['output'];
  totalArchiveSizeBytes?: Maybe<Scalars['Float']['output']>;
  totalArchiveSpendDollars?: Maybe<Scalars['Float']['output']>;
  totalServiceSpendDollars?: Maybe<Scalars['Float']['output']>;
  windowBandGte7dCount: Scalars['Int']['output'];
  windowBandLt1hCount: Scalars['Int']['output'];
  windowBandLt6hCount: Scalars['Int']['output'];
  windowBandLt7dCount: Scalars['Int']['output'];
  windowBandLt24hCount: Scalars['Int']['output'];
  windowBandNoBackupCount: Scalars['Int']['output'];
};

export type PitrFleetOutliers = {
  __typename?: 'PitrFleetOutliers';
  highestArchiveFailRate: Array<PitrServiceOutlier>;
  highestArchiveLag: Array<PitrServiceOutlier>;
  largestCatalog: Array<PitrServiceOutlier>;
  longestChain: Array<PitrServiceOutlier>;
  oldestFull: Array<PitrServiceOutlier>;
  shortestWindow: Array<PitrServiceOutlier>;
};

export type PitrLogAnalysis = {
  __typename?: 'PitrLogAnalysis';
  analyzedAt: Scalars['String']['output'];
  criticalCount: Scalars['Int']['output'];
  errorCount: Scalars['Int']['output'];
  issues: Array<PitrLogIssue>;
  lastLogAt?: Maybe<Scalars['String']['output']>;
  logSpewDetected: Scalars['Boolean']['output'];
  spewTemplates: Array<PitrLogSpewPattern>;
  totalLinesAnalyzed: Scalars['Int']['output'];
  warningCount: Scalars['Int']['output'];
};

export type PitrLogIssue = {
  __typename?: 'PitrLogIssue';
  count: Scalars['Int']['output'];
  matched: Scalars['String']['output'];
  message: Scalars['String']['output'];
  pattern: Scalars['String']['output'];
  severity: Scalars['String']['output'];
};

export type PitrLogSpewPattern = {
  __typename?: 'PitrLogSpewPattern';
  count: Scalars['Int']['output'];
  lastSeen: Scalars['String']['output'];
  sample: Scalars['String']['output'];
  template: Scalars['String']['output'];
};

export type PitrRegionCount = {
  __typename?: 'PitrRegionCount';
  count: Scalars['Int']['output'];
  region: Scalars['String']['output'];
};

export type PitrServiceOutlier = {
  __typename?: 'PitrServiceOutlier';
  environmentId: Scalars['String']['output'];
  projectId: Scalars['String']['output'];
  projectName: Scalars['String']['output'];
  region?: Maybe<Scalars['String']['output']>;
  serviceId: Scalars['String']['output'];
  serviceName: Scalars['String']['output'];
  severity: Scalars['String']['output'];
  valueContext: Scalars['String']['output'];
  valueLabel: Scalars['String']['output'];
  valueNumeric?: Maybe<Scalars['Float']['output']>;
  workspaceId?: Maybe<Scalars['String']['output']>;
  workspaceName?: Maybe<Scalars['String']['output']>;
};

export type PitrWarning = {
  __typename?: 'PitrWarning';
  code: Scalars['String']['output'];
  detail: Scalars['String']['output'];
  severity: Scalars['String']['output'];
};

export type PitrWarningCodeCount = {
  __typename?: 'PitrWarningCodeCount';
  code: Scalars['String']['output'];
  count: Scalars['Int']['output'];
  severity: Scalars['String']['output'];
};

export type Plan =
  | 'FREE'
  | 'HOBBY'
  | 'PRO';

export type PlanLimitOverride = Node & {
  __typename?: 'PlanLimitOverride';
  config: Scalars['SubscriptionPlanLimit']['output'];
  id: Scalars['ID']['output'];
};

export type PlanLimitOverrideUpsertInput = {
  config: Scalars['SubscriptionPlanLimit']['input'];
  customerId: Scalars['String']['input'];
  expire: Scalars['Boolean']['input'];
};

export type PlatformFeatureFlag =
  | 'BAN_APPEAL_FORM'
  | 'CHAT_SANDBOX'
  | 'CTRD_IMAGE_STORE_ROLLOUT'
  | 'DEMO_PERCENTAGE_ROLLOUT'
  | 'HA_STATIC_EGRESS_SELF_SERVICE'
  | 'INLINE_NOTIFICATION_PROCESSING'
  | 'IN_DASHBOARD_SUPPORT'
  | 'KAFKA_DEPLOYMENT_STATUS_CHANGES'
  | 'NEW_STRIPE_WEBHOOK_VERSION_ROLLOUT'
  | 'OAUTH_DCR_KILLSWITCH'
  | 'RADAR_AUTO_EVALUATE'
  | 'SERVICEINSTANCE_DATALOADER_FOR_STATIC_URL'
  | 'SPLIT_USAGE_QUERIES'
  | 'STRIPE_METERS_NEW_ACCOUNTS'
  | 'STRIPE_METERS_SHADOW_ENABLED'
  | 'UPDATED_VM_QUERIES';

export type PlatformFeatureFlagChange = {
  __typename?: 'PlatformFeatureFlagChange';
  changedByAvatar?: Maybe<Scalars['String']['output']>;
  changedByName?: Maybe<Scalars['String']['output']>;
  changedByUserId: Scalars['String']['output'];
  flag: Scalars['String']['output'];
  newValue: Scalars['String']['output'];
  previousValue: Scalars['String']['output'];
  timestamp: Scalars['DateTime']['output'];
};

export type PlatformFeatureFlagStatus = {
  __typename?: 'PlatformFeatureFlagStatus';
  flag: PlatformFeatureFlag;
  rolloutPercentage: Scalars['Int']['output'];
  status: Scalars['Boolean']['output'];
  type: PlatformFeatureFlagType;
};

export type PlatformFeatureFlagType =
  | 'BOOLEAN'
  | 'PERCENTAGE';

export type PlatformServiceKey =
  | 'ALL_PROVISIONS'
  | 'ANON_PROVISIONS'
  | 'BUCKET_PROVISIONS'
  | 'FREE_PROVISIONS'
  | 'NON_PRO_PROVISIONS'
  | 'NON_VERIFIED_PROVISIONS'
  | 'SANDBOX_PROVISIONS'
  | 'SIGNUPS'
  | 'VOLUME_PROVISIONS';

export type PlatformServiceStatus =
  | 'DISABLE'
  | 'ENABLE';

export type PlatformStatus = {
  __typename?: 'PlatformStatus';
  incident?: Maybe<Incident>;
  isStable: Scalars['Boolean']['output'];
  maintenance?: Maybe<Maintenance>;
};

export type PlatformStatusOverrideMessageInput = {
  id: Scalars['String']['input'];
  message: Scalars['String']['input'];
  status: Scalars['String']['input'];
  url: Scalars['String']['input'];
};

export type Plugin = Node & {
  __typename?: 'Plugin';
  containers: PluginContainersConnection;
  createdAt: Scalars['DateTime']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  deprecatedAt?: Maybe<Scalars['DateTime']['output']>;
  friendlyName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  logsEnabled: Scalars['Boolean']['output'];
  migrationDatabaseServiceId?: Maybe<Scalars['String']['output']>;
  name: PluginType;
  project: Project;
  status: PluginStatus;
  variables: PluginVariablesConnection;
};


export type PluginContainersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type PluginVariablesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type PluginContainersConnection = {
  __typename?: 'PluginContainersConnection';
  edges: Array<PluginContainersConnectionEdge>;
  pageInfo: PageInfo;
};

export type PluginContainersConnectionEdge = {
  __typename?: 'PluginContainersConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Container;
};

export type PluginCreateInput = {
  environmentId?: InputMaybe<Scalars['String']['input']>;
  friendlyName?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
};

export type PluginRestartInput = {
  environmentId?: InputMaybe<Scalars['String']['input']>;
};

export type PluginStatus =
  | 'DEPRECATED'
  | 'LOCKED'
  | 'REMOVED'
  | 'RUNNING'
  | 'STOPPED';

export type PluginType =
  | 'mongodb'
  | 'mysql'
  | 'postgresql'
  | 'redis';

export type PluginUpdateInput = {
  friendlyName: Scalars['String']['input'];
};

export type PluginVariablesConnection = {
  __typename?: 'PluginVariablesConnection';
  edges: Array<PluginVariablesConnectionEdge>;
  pageInfo: PageInfo;
};

export type PluginVariablesConnectionEdge = {
  __typename?: 'PluginVariablesConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Variable;
};

export type PostSupportMessageInput = {
  attachmentIds?: InputMaybe<Array<Scalars['String']['input']>>;
  body: Scalars['String']['input'];
  inReplyToMessageId?: InputMaybe<Scalars['String']['input']>;
  threadSlug: Scalars['String']['input'];
};

export type PostgresDeepHealth = {
  __typename?: 'PostgresDeepHealth';
  cacheHitRatio?: Maybe<Scalars['Float']['output']>;
  connectionsActive?: Maybe<Scalars['Int']['output']>;
  connectionsMax?: Maybe<Scalars['Int']['output']>;
  connectionsTotal?: Maybe<Scalars['Int']['output']>;
  dbSizeGb?: Maybe<Scalars['Float']['output']>;
  deadlocks?: Maybe<Scalars['Int']['output']>;
  longRunningQueriesCount?: Maybe<Scalars['Int']['output']>;
  replicationLagMaxSecs?: Maybe<Scalars['Float']['output']>;
  txidWraparoundPct?: Maybe<Scalars['Float']['output']>;
};

export type PostgresHaCluster = {
  __typename?: 'PostgresHaCluster';
  cachedAt: Scalars['String']['output'];
  clusterSpendDollars?: Maybe<Scalars['Float']['output']>;
  createdAt: Scalars['String']['output'];
  deploymentStatuses: Array<Scalars['String']['output']>;
  enrichmentErrors: Array<Scalars['String']['output']>;
  environmentId: Scalars['String']['output'];
  environmentName: Scalars['String']['output'];
  estimatedDowntimeSecsLast7Days?: Maybe<Scalars['Int']['output']>;
  etcdLeaderChangesLast7Days?: Maybe<Scalars['Int']['output']>;
  etcdNodeCount: Scalars['Int']['output'];
  etcdQuorum?: Maybe<EtcdQuorum>;
  failoversLast7Days?: Maybe<Scalars['Int']['output']>;
  haproxyNodeCount: Scalars['Int']['output'];
  hasBAA: Scalars['Boolean']['output'];
  healthCheckedAt?: Maybe<Scalars['String']['output']>;
  lastBackupAt?: Maybe<Scalars['String']['output']>;
  nodes: Array<PostgresHaNodeDetail>;
  patroniStatus?: Maybe<PatroniClusterStatus>;
  postgresHealth?: Maybe<PostgresDeepHealth>;
  postgresNodeCount: Scalars['Int']['output'];
  projectId: Scalars['String']['output'];
  projectName: Scalars['String']['output'];
  region?: Maybe<Scalars['String']['output']>;
  totalNodeCount: Scalars['Int']['output'];
  workspaceId?: Maybe<Scalars['String']['output']>;
  workspaceName?: Maybe<Scalars['String']['output']>;
  workspacePlan?: Maybe<Scalars['String']['output']>;
  workspaceSpendDollars?: Maybe<Scalars['Float']['output']>;
};

export type PostgresHaClustersResult = {
  __typename?: 'PostgresHaClustersResult';
  allClustersCount: Scalars['Int']['output'];
  allNodesCount: Scalars['Int']['output'];
  cachedAt?: Maybe<Scalars['String']['output']>;
  filteredClustersCount: Scalars['Int']['output'];
  haWarningsClustersCount: Scalars['Int']['output'];
  healthyClustersCount: Scalars['Int']['output'];
  issueClustersCount: Scalars['Int']['output'];
  removedClustersCount: Scalars['Int']['output'];
  totalCount: Scalars['Int']['output'];
  totalCpuUsageVcpu?: Maybe<Scalars['Float']['output']>;
  totalDiskUsageGb?: Maybe<Scalars['Float']['output']>;
  totalMemoryUsageGb?: Maybe<Scalars['Float']['output']>;
  totalSpendDollars?: Maybe<Scalars['Float']['output']>;
  unknownClustersCount: Scalars['Int']['output'];
  workspaceGroups: Array<PostgresHaWorkspaceGroup>;
};

export type PostgresHaNodeDetail = {
  __typename?: 'PostgresHaNodeDetail';
  cpuUsageAvg?: Maybe<Scalars['Float']['output']>;
  cpuUsageMax?: Maybe<Scalars['Float']['output']>;
  deploymentInstanceId?: Maybe<Scalars['String']['output']>;
  deploymentStatus?: Maybe<Scalars['String']['output']>;
  diskUsageGb?: Maybe<Scalars['Float']['output']>;
  latestDeployFailed: Scalars['Boolean']['output'];
  logAnalysis?: Maybe<NodeLogAnalysis>;
  logFetchFailed: Scalars['Boolean']['output'];
  memoryUsageAvg?: Maybe<Scalars['Float']['output']>;
  memoryUsageMax?: Maybe<Scalars['Float']['output']>;
  nodeType: Scalars['String']['output'];
  numReplicas?: Maybe<Scalars['Int']['output']>;
  patroniMemberName?: Maybe<Scalars['String']['output']>;
  region?: Maybe<Scalars['String']['output']>;
  serviceId: Scalars['String']['output'];
  serviceName: Scalars['String']['output'];
};

export type PostgresHaWorkspaceGroup = {
  __typename?: 'PostgresHaWorkspaceGroup';
  clusterCount: Scalars['Int']['output'];
  clusters: Array<PostgresHaCluster>;
  haWarningsClustersCount: Scalars['Int']['output'];
  healthyClustersCount: Scalars['Int']['output'];
  issueClustersCount: Scalars['Int']['output'];
  newestCachedAt?: Maybe<Scalars['String']['output']>;
  oldestCreatedAt?: Maybe<Scalars['String']['output']>;
  projectCount: Scalars['Int']['output'];
  regions: Array<Scalars['String']['output']>;
  removedClustersCount: Scalars['Int']['output'];
  totalEtcdCount: Scalars['Int']['output'];
  totalHaproxyCount: Scalars['Int']['output'];
  totalNodeCount: Scalars['Int']['output'];
  totalPgCount: Scalars['Int']['output'];
  totalSpendDollars?: Maybe<Scalars['Float']['output']>;
  unknownClustersCount: Scalars['Int']['output'];
  workspaceId?: Maybe<Scalars['String']['output']>;
  workspaceName?: Maybe<Scalars['String']['output']>;
  workspacePlan?: Maybe<Scalars['String']['output']>;
  workspaceSpendDollars?: Maybe<Scalars['Float']['output']>;
};

export type PostgresPitrService = {
  __typename?: 'PostgresPitrService';
  bucket: PitrBucketSummary;
  cachedAt: Scalars['String']['output'];
  clusterLeaderServiceId?: Maybe<Scalars['String']['output']>;
  clusterLeaderServiceName?: Maybe<Scalars['String']['output']>;
  configMismatches: Array<PitrConfigMismatch>;
  cpuUsageAvg?: Maybe<Scalars['Float']['output']>;
  deploymentInstanceId?: Maybe<Scalars['String']['output']>;
  deploymentStatus?: Maybe<Scalars['String']['output']>;
  diskUsageGb?: Maybe<Scalars['Float']['output']>;
  enrichmentErrors: Array<Scalars['String']['output']>;
  envVarConfig?: Maybe<PitrEnvVarConfig>;
  environmentId: Scalars['String']['output'];
  environmentName: Scalars['String']['output'];
  hasBAA: Scalars['Boolean']['output'];
  imageDigest?: Maybe<Scalars['String']['output']>;
  latestDeploymentCreatedAt?: Maybe<Scalars['String']['output']>;
  latestDeploymentId?: Maybe<Scalars['String']['output']>;
  latestDeploymentImage?: Maybe<Scalars['String']['output']>;
  latestDeploymentImageDigest?: Maybe<Scalars['String']['output']>;
  latestDeploymentStatus?: Maybe<Scalars['String']['output']>;
  logAnalysis?: Maybe<PitrLogAnalysis>;
  logFetchFailed: Scalars['Boolean']['output'];
  memoryUsageAvg?: Maybe<Scalars['Float']['output']>;
  patroniDcsConfig?: Maybe<PatroniDcsArchiveConfig>;
  pgStatArchiver?: Maybe<PgStatArchiverSummary>;
  pgbackrest?: Maybe<PgBackrestSummary>;
  pgbackrestCheck?: Maybe<PitrBackrestCheck>;
  pitrEnabledAt?: Maybe<Scalars['String']['output']>;
  projectId: Scalars['String']['output'];
  projectName: Scalars['String']['output'];
  region?: Maybe<Scalars['String']['output']>;
  rootServiceId?: Maybe<Scalars['String']['output']>;
  serviceCreatedAt: Scalars['String']['output'];
  serviceFlavor: Scalars['String']['output'];
  serviceId: Scalars['String']['output'];
  serviceName: Scalars['String']['output'];
  serviceSpendDollars?: Maybe<Scalars['Float']['output']>;
  sourceImage?: Maybe<Scalars['String']['output']>;
  warnings: Array<PitrWarning>;
  workspaceId?: Maybe<Scalars['String']['output']>;
  workspaceName?: Maybe<Scalars['String']['output']>;
  workspacePlan?: Maybe<Scalars['String']['output']>;
  workspaceSpendDollars?: Maybe<Scalars['Float']['output']>;
};

export type PostgresPitrServicesResult = {
  __typename?: 'PostgresPitrServicesResult';
  allServicesCount: Scalars['Int']['output'];
  archiverUnhealthyCount: Scalars['Int']['output'];
  bucketDeletedCount: Scalars['Int']['output'];
  bucketMiswiredCount: Scalars['Int']['output'];
  cachedAt?: Maybe<Scalars['String']['output']>;
  criticalCount: Scalars['Int']['output'];
  filteredCount: Scalars['Int']['output'];
  fleet: PitrFleetAggregates;
  haCount: Scalars['Int']['output'];
  healthyCount: Scalars['Int']['output'];
  noBackupYetCount: Scalars['Int']['output'];
  shutdownCount: Scalars['Int']['output'];
  staleBackupCount: Scalars['Int']['output'];
  standaloneCount: Scalars['Int']['output'];
  totalCount: Scalars['Int']['output'];
  walAccumulatingCount: Scalars['Int']['output'];
  walGapCount: Scalars['Int']['output'];
  warningCount: Scalars['Int']['output'];
  workspaceGroups: Array<PostgresPitrWorkspaceGroup>;
};

export type PostgresPitrWorkspaceGroup = {
  __typename?: 'PostgresPitrWorkspaceGroup';
  avgCpuUsage?: Maybe<Scalars['Float']['output']>;
  criticalCount: Scalars['Int']['output'];
  haClusterCount: Scalars['Int']['output'];
  healthyCount: Scalars['Int']['output'];
  newestCachedAt?: Maybe<Scalars['String']['output']>;
  oldestPitrEnabledAt?: Maybe<Scalars['String']['output']>;
  oldestServiceCreatedAt?: Maybe<Scalars['String']['output']>;
  projectCount: Scalars['Int']['output'];
  regions: Array<Scalars['String']['output']>;
  serviceCount: Scalars['Int']['output'];
  services: Array<PostgresPitrService>;
  shutdownCount: Scalars['Int']['output'];
  totalBucketSpendDollars?: Maybe<Scalars['Float']['output']>;
  totalCatalogBytes?: Maybe<Scalars['Float']['output']>;
  totalDiskGb?: Maybe<Scalars['Float']['output']>;
  totalMemoryGb?: Maybe<Scalars['Float']['output']>;
  totalServiceSpendDollars?: Maybe<Scalars['Float']['output']>;
  warningCodeCounts: Array<PitrWarningCodeCount>;
  warningCount: Scalars['Int']['output'];
  workspaceId?: Maybe<Scalars['String']['output']>;
  workspaceName?: Maybe<Scalars['String']['output']>;
  workspacePlan?: Maybe<Scalars['String']['output']>;
  workspaceSpendDollars?: Maybe<Scalars['Float']['output']>;
};

export type Preferences = Node & {
  __typename?: 'Preferences';
  buildFailedEmail: Scalars['Boolean']['output'];
  changelogEmail: Scalars['Boolean']['output'];
  communityEmail: Scalars['Boolean']['output'];
  deployCrashedEmail: Scalars['Boolean']['output'];
  ephemeralEnvironmentEmail: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  marketingEmail: Scalars['Boolean']['output'];
  subprocessorUpdatesEmail: Scalars['Boolean']['output'];
  templateQueueEmail: Scalars['Boolean']['output'];
  usageEmail: Scalars['Boolean']['output'];
};

export type PreferencesUpdateData = {
  buildFailedEmail?: InputMaybe<Scalars['Boolean']['input']>;
  changelogEmail?: InputMaybe<Scalars['Boolean']['input']>;
  communityEmail?: InputMaybe<Scalars['Boolean']['input']>;
  deployCrashedEmail?: InputMaybe<Scalars['Boolean']['input']>;
  ephemeralEnvironmentEmail?: InputMaybe<Scalars['Boolean']['input']>;
  marketingEmail?: InputMaybe<Scalars['Boolean']['input']>;
  subprocessorUpdatesEmail?: InputMaybe<Scalars['Boolean']['input']>;
  templateQueueEmail?: InputMaybe<Scalars['Boolean']['input']>;
  token?: InputMaybe<Scalars['String']['input']>;
  usageEmail?: InputMaybe<Scalars['Boolean']['input']>;
};

export type PricingInvoiceUploadInput = {
  attribution?: InputMaybe<Scalars['String']['input']>;
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  spend?: InputMaybe<Scalars['String']['input']>;
};

export type PrivateNetwork = {
  __typename?: 'PrivateNetwork';
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  dnsName: Scalars['String']['output'];
  environmentId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  networkId: Scalars['BigInt']['output'];
  projectId: Scalars['String']['output'];
  publicId: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
};

export type PrivateNetworkCreateOrGetInput = {
  environmentId: Scalars['String']['input'];
  name: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
  tags: Array<Scalars['String']['input']>;
};

export type PrivateNetworkEndpoint = {
  __typename?: 'PrivateNetworkEndpoint';
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  dnsName: Scalars['String']['output'];
  newDnsName?: Maybe<Scalars['String']['output']>;
  privateIps: Array<Scalars['String']['output']>;
  publicId: Scalars['String']['output'];
  serviceInstanceId: Scalars['String']['output'];
  syncStatus: PrivateNetworkEndpointSyncStatus;
  tags: Array<Scalars['String']['output']>;
};

export type PrivateNetworkEndpointCreateOrGetInput = {
  environmentId: Scalars['String']['input'];
  privateNetworkId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
  serviceName: Scalars['String']['input'];
  tags: Array<Scalars['String']['input']>;
};

export type PrivateNetworkEndpointSyncStatus =
  | 'ACTIVE'
  | 'CREATING'
  | 'DELETED'
  | 'DELETING'
  | 'UNSPECIFIED'
  | 'UPDATING';

export type PrivnetRouteInfo = {
  __typename?: 'PrivnetRouteInfo';
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  defaultPort?: Maybe<Scalars['Int']['output']>;
  endpoints: Array<Scalars['String']['output']>;
  environmentId?: Maybe<Scalars['String']['output']>;
  found: Scalars['Boolean']['output'];
  metadata: Array<Scalars['String']['output']>;
  serviceId?: Maybe<Scalars['String']['output']>;
  target: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  version?: Maybe<Scalars['Int']['output']>;
};

export type Project = Node & {
  __typename?: 'Project';
  applicationTracing: ApplicationTracingState;
  baseEnvironment?: Maybe<Environment>;
  baseEnvironmentId?: Maybe<Scalars['String']['output']>;
  billingPeriod?: Maybe<BillingPeriod>;
  botPrEnvironments: Scalars['Boolean']['output'];
  buckets: ProjectBucketsConnection;
  createdAt: Scalars['DateTime']['output'];
  /** The domain of the latest deployment if there is only a single service */
  dashboardDomain?: Maybe<Scalars['String']['output']>;
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  /** @deprecated Use environment.deploymentTriggers for properly scoped access control */
  deploymentTriggers: ProjectDeploymentTriggersConnection;
  /** @deprecated Use environment.deployments for properly scoped access control */
  deployments: ProjectDeploymentsConnection;
  description?: Maybe<Scalars['String']['output']>;
  environments: ProjectEnvironmentsConnection;
  expiredAt?: Maybe<Scalars['DateTime']['output']>;
  featureFlags: Array<ActiveProjectFeatureFlag>;
  focusedPrEnvironments: Scalars['Boolean']['output'];
  forkVolumesInPrEnvironments: Scalars['Boolean']['output'];
  groups: ProjectGroupsConnection;
  id: Scalars['ID']['output'];
  isPublic: Scalars['Boolean']['output'];
  isTempProject: Scalars['Boolean']['output'];
  members: Array<ProjectMember>;
  name: Scalars['String']['output'];
  /** Platform feature flags enabled for this project (based on percentage rollout) */
  platformFeatureFlags: Array<PlatformFeatureFlag>;
  /** @deprecated Plugins have been removed */
  plugins: ProjectPluginsConnection;
  prDeploys: Scalars['Boolean']['output'];
  /** The id of the oldest non-ephemeral environment for this project (typically production). Used by the dashboard to render project cards without fetching the full environments connection. */
  primaryEnvironmentId?: Maybe<Scalars['String']['output']>;
  projectPermissions: ProjectProjectPermissionsConnection;
  /** The volumes in the project that have recently migrated to new regions */
  recentVolumeMigrations?: Maybe<Array<VolumeMigrationEvent>>;
  services: ProjectServicesConnection;
  subscriptionPlanLimit: Scalars['SubscriptionPlanLimit']['output'];
  subscriptionType: SubscriptionPlanType;
  /** @deprecated Use workspace */
  team?: Maybe<Team>;
  /** @deprecated Use workspaceId */
  teamId?: Maybe<Scalars['String']['output']>;
  unrestrictedEnvironments: ProjectUnrestrictedEnvironmentsConnection;
  updatedAt: Scalars['DateTime']['output'];
  volumes: ProjectVolumesConnection;
  workspace?: Maybe<Workspace>;
  workspaceId?: Maybe<Scalars['String']['output']>;
};


export type ProjectApplicationTracingArgs = {
  environmentId: Scalars['String']['input'];
};


export type ProjectBucketsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ProjectDeploymentTriggersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ProjectDeploymentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ProjectEnvironmentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  isEphemeral?: InputMaybe<Scalars['Boolean']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<SortOrder>;
};


export type ProjectGroupsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ProjectPluginsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ProjectProjectPermissionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ProjectRecentVolumeMigrationsArgs = {
  environmentId: Scalars['String']['input'];
};


export type ProjectServicesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ProjectUnrestrictedEnvironmentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ProjectVolumesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type ProjectAdminUpdateInput = {
  applicationTracing: ApplicationTracingState;
};

export type ProjectBucketsConnection = {
  __typename?: 'ProjectBucketsConnection';
  edges: Array<ProjectBucketsConnectionEdge>;
  pageInfo: PageInfo;
};

export type ProjectBucketsConnectionEdge = {
  __typename?: 'ProjectBucketsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Bucket;
};

export type ProjectComplianceInfo = {
  __typename?: 'ProjectComplianceInfo';
  /** Permissions for each project member */
  memberPermissions: Array<ProjectMemberPermissionsInfo>;
  projectId: Scalars['String']['output'];
  projectName: Scalars['String']['output'];
  /** Backup schedules for database services */
  serviceBackups: Array<ServiceBackupInfo>;
  /** 2FA status for each project member */
  twoFactorMembers: Array<ProjectMemberTwoFactorInfo>;
  workspaceId: Scalars['String']['output'];
};

export type ProjectCreateInput = {
  defaultEnvironmentName?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  isMonorepo?: InputMaybe<Scalars['Boolean']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  /** @deprecated Plugins are no longer supported */
  plugins?: InputMaybe<Array<Scalars['String']['input']>>;
  prDeploys?: InputMaybe<Scalars['Boolean']['input']>;
  reason?: InputMaybe<Scalars['String']['input']>;
  repo?: InputMaybe<ProjectCreateRepo>;
  runtime?: InputMaybe<PublicRuntime>;
  /** @deprecated Use workspaceId instead - teams are now workspaces */
  teamId?: InputMaybe<Scalars['String']['input']>;
  workspaceId?: InputMaybe<Scalars['String']['input']>;
};

export type ProjectCreateRepo = {
  branch: Scalars['String']['input'];
  fullRepoName: Scalars['String']['input'];
};

export type ProjectCreateWithAgentResponse = {
  __typename?: 'ProjectCreateWithAgentResponse';
  environment: Environment;
  project: Project;
};

export type ProjectDeploymentTriggersConnection = {
  __typename?: 'ProjectDeploymentTriggersConnection';
  edges: Array<ProjectDeploymentTriggersConnectionEdge>;
  pageInfo: PageInfo;
};

export type ProjectDeploymentTriggersConnectionEdge = {
  __typename?: 'ProjectDeploymentTriggersConnectionEdge';
  cursor: Scalars['String']['output'];
  node: DeploymentTrigger;
};

export type ProjectDeploymentsConnection = {
  __typename?: 'ProjectDeploymentsConnection';
  edges: Array<ProjectDeploymentsConnectionEdge>;
  pageInfo: PageInfo;
};

export type ProjectDeploymentsConnectionEdge = {
  __typename?: 'ProjectDeploymentsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Deployment;
};

export type ProjectEnvironmentsConnection = {
  __typename?: 'ProjectEnvironmentsConnection';
  edges: Array<ProjectEnvironmentsConnectionEdge>;
  pageInfo: PageInfo;
};

export type ProjectEnvironmentsConnectionEdge = {
  __typename?: 'ProjectEnvironmentsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Environment;
};

export type ProjectFeatureFlagToggleInput = {
  flag: ActiveProjectFeatureFlag;
  projectId: Scalars['String']['input'];
};

export type ProjectGroupsConnection = {
  __typename?: 'ProjectGroupsConnection';
  edges: Array<ProjectGroupsConnectionEdge>;
  pageInfo: PageInfo;
};

export type ProjectGroupsConnectionEdge = {
  __typename?: 'ProjectGroupsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Group;
};

export type ProjectInvitation = {
  __typename?: 'ProjectInvitation';
  email: Scalars['String']['output'];
  expiresAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  inviter?: Maybe<ProjectInvitationInviter>;
  isExpired: Scalars['Boolean']['output'];
  project: PublicProjectInformation;
};

export type ProjectInvitationInviter = {
  __typename?: 'ProjectInvitationInviter';
  email: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
};

export type ProjectInviteUserInput = {
  email: Scalars['String']['input'];
  link: Scalars['String']['input'];
};

export type ProjectInvitee = {
  email: Scalars['String']['input'];
  role: ProjectRole;
};

export type ProjectMember = {
  __typename?: 'ProjectMember';
  avatar?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
  role: ProjectRole;
};

export type ProjectMemberAddInput = {
  projectId: Scalars['String']['input'];
  role: ProjectRole;
  userId: Scalars['String']['input'];
};

export type ProjectMemberPermissionsInfo = {
  __typename?: 'ProjectMemberPermissionsInfo';
  email: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
  role: ProjectRole;
};

export type ProjectMemberRemoveInput = {
  projectId: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};

export type ProjectMemberTwoFactorInfo = {
  __typename?: 'ProjectMemberTwoFactorInfo';
  email: Scalars['String']['output'];
  /** List of enabled 2FA methods (AUTHENTICATOR, PASSKEY) */
  enabledMethods: Array<TwoFactorMethodCompliance>;
  name?: Maybe<Scalars['String']['output']>;
  twoFactorAuthEnabled: Scalars['Boolean']['output'];
};

export type ProjectMemberUpdateInput = {
  projectId: Scalars['String']['input'];
  role: ProjectRole;
  userId: Scalars['String']['input'];
};

export type ProjectPermission = Node & {
  __typename?: 'ProjectPermission';
  id: Scalars['ID']['output'];
  projectId: Scalars['String']['output'];
  role: ProjectRole;
  userId: Scalars['String']['output'];
};

export type ProjectPluginsConnection = {
  __typename?: 'ProjectPluginsConnection';
  edges: Array<ProjectPluginsConnectionEdge>;
  pageInfo: PageInfo;
};

export type ProjectPluginsConnectionEdge = {
  __typename?: 'ProjectPluginsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Plugin;
};

export type ProjectProjectPermissionsConnection = {
  __typename?: 'ProjectProjectPermissionsConnection';
  edges: Array<ProjectProjectPermissionsConnectionEdge>;
  pageInfo: PageInfo;
};

export type ProjectProjectPermissionsConnectionEdge = {
  __typename?: 'ProjectProjectPermissionsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: ProjectPermission;
};

export type ProjectResourceAccess = {
  __typename?: 'ProjectResourceAccess';
  customDomain: AccessRule;
  databaseDeployment: AccessRule;
  deployment: AccessRule;
  environment: AccessRule;
  /** @deprecated Plugins have been removed */
  plugin: AccessRule;
  sandbox: AccessRule;
};

export type ProjectRole =
  | 'ADMIN'
  | 'MEMBER'
  | 'VIEWER';

export type ProjectServicesConnection = {
  __typename?: 'ProjectServicesConnection';
  edges: Array<ProjectServicesConnectionEdge>;
  pageInfo: PageInfo;
};

export type ProjectServicesConnectionEdge = {
  __typename?: 'ProjectServicesConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Service;
};

export type ProjectToken = Node & {
  __typename?: 'ProjectToken';
  createdAt: Scalars['DateTime']['output'];
  displayToken: Scalars['String']['output'];
  environment: Environment;
  environmentId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  project: Project;
  projectId: Scalars['String']['output'];
};

export type ProjectTokenCreateInput = {
  environmentId: Scalars['String']['input'];
  name: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
};

export type ProjectTransferConfirmInput = {
  destinationWorkspaceId?: InputMaybe<Scalars['String']['input']>;
  ownershipTransferId: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
};

export type ProjectTransferInitiateInput = {
  memberId: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
};

export type ProjectTransferInput = {
  workspaceId: Scalars['String']['input'];
};

export type ProjectTransferToTeamInput = {
  teamId: Scalars['String']['input'];
};

export type ProjectUnrestrictedEnvironmentsConnection = {
  __typename?: 'ProjectUnrestrictedEnvironmentsConnection';
  edges: Array<ProjectUnrestrictedEnvironmentsConnectionEdge>;
  pageInfo: PageInfo;
};

export type ProjectUnrestrictedEnvironmentsConnectionEdge = {
  __typename?: 'ProjectUnrestrictedEnvironmentsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Environment;
};

export type ProjectUpdateInput = {
  baseEnvironmentId?: InputMaybe<Scalars['String']['input']>;
  /** Enable/disable pull request environments for PRs created by bots */
  botPrEnvironments?: InputMaybe<Scalars['Boolean']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  /** Enable focused PR environments that only deploy services affected by changed files */
  focusedPrEnvironments?: InputMaybe<Scalars['Boolean']['input']>;
  /** Fork volume data into PR environments instead of creating empty volumes */
  forkVolumesInPrEnvironments?: InputMaybe<Scalars['Boolean']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  prDeploys?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ProjectUsageProperty =
  | 'BACKUP_USAGE'
  | 'CPU_USAGE'
  | 'CURRENT_USAGE'
  | 'DISK_USAGE'
  | 'ESTIMATED_USAGE'
  | 'MEMORY_USAGE'
  | 'NETWORK_USAGE';

export type ProjectVolumesConnection = {
  __typename?: 'ProjectVolumesConnection';
  edges: Array<ProjectVolumesConnectionEdge>;
  pageInfo: PageInfo;
};

export type ProjectVolumesConnectionEdge = {
  __typename?: 'ProjectVolumesConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Volume;
};

export type ProjectWorkspaceMember = {
  __typename?: 'ProjectWorkspaceMember';
  email: Scalars['String']['output'];
  /** List of enabled 2FA methods (AUTHENTICATOR, PASSKEY) */
  enabledMethods: Array<TwoFactorMethodProjectWorkspace>;
  name?: Maybe<Scalars['String']['output']>;
  twoFactorAuthEnabled: Scalars['Boolean']['output'];
};

export type ProjectWorkspaceMembersResponse = {
  __typename?: 'ProjectWorkspaceMembersResponse';
  members: Array<ProjectWorkspaceMember>;
  projectId: Scalars['String']['output'];
  projectName: Scalars['String']['output'];
  workspaceId: Scalars['String']['output'];
};

export type ProjectsOrderBy =
  | 'CREATED_AT_DESC'
  | 'NAME_ASC'
  | 'UPDATED_AT_DESC';

export type ProviderAuth = Node & {
  __typename?: 'ProviderAuth';
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isAuthEnabled: Scalars['Boolean']['output'];
  metadata: Scalars['JSON']['output'];
  provider: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export type PublicProjectInformation = {
  __typename?: 'PublicProjectInformation';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type PublicProjectInvitation = InviteCode | ProjectInvitation;

export type PublicRuntime =
  | 'LEGACY'
  | 'UNSPECIFIED'
  | 'V2';

export type PublicStats = {
  __typename?: 'PublicStats';
  totalDeploymentsLastMonth: Scalars['Int']['output'];
  totalLogsLastMonth: Scalars['BigInt']['output'];
  totalProjects: Scalars['Int']['output'];
  totalRequestsLastMonth: Scalars['BigInt']['output'];
  totalServices: Scalars['Int']['output'];
  totalUsers: Scalars['Int']['output'];
};

export type PublicStatsEvent = {
  __typename?: 'PublicStatsEvent';
  key: Scalars['String']['output'];
  type: Scalars['String']['output'];
  value: Scalars['BigInt']['output'];
};

export type PurgeCacheScope =
  | 'ALL'
  | 'HTML';

export type PurgeOnDeploy =
  | 'ALL'
  | 'HTML'
  | 'OFF';

export type PurgeServiceCacheInput = {
  environmentId: Scalars['String']['input'];
  scope: PurgeCacheScope;
  serviceId: Scalars['String']['input'];
};

export type Query = {
  __typename?: 'Query';
  /**
   * Gets all deployed containers for a environment+plugin for an admin.
   * @deprecated Plugins are deprecated
   */
  adminAllContainerInfoForPluginInEnvironment: Array<ContainerInfo>;
  /** Gets all deployed containers for a environment+service for an admin. */
  adminAllContainerInfoForServiceInEnvironment: Array<ContainerInfo>;
  /** Query domains across all accounts */
  adminAllDomains: Array<Domain>;
  /** Gets all projects for an admin. */
  adminAllProjects: QueryAdminAllProjectsConnection;
  /** Gets all services for an admin. */
  adminAllServices: QueryAdminAllServicesConnection;
  /**
   * Get all containers that have been archived for a user or workspace
   * @deprecated Plugins are deprecated
   */
  adminArchivedContainers: Array<Container>;
  /** Returns the settings for auto refunds. */
  adminAutoRefundSettings: AutoRefundSettings;
  /** Returns a single banned image by name */
  adminBannedImage: BannedImage;
  /** Returns a list of all banned images */
  adminBannedImages: Array<BannedImage>;
  /** Search for buckets by name across all projects */
  adminBucketsByName: Array<Bucket>;
  /** Returns recent cryptominer detections from the rolling Redis window, enriched with service info. */
  adminCryptominerDetections: Array<CryptominerDetection>;
  /** Returns active cryptominer detections for a specific service. */
  adminCryptominerDetectionsForService: Array<CryptominerDetection>;
  /** Get all deployments for admin purposes */
  adminDeployments: QueryAdminDeploymentsConnection;
  /** Returns a list of email templates from CustomerIO */
  adminEmailTemplates: Array<AdminEmailTemplate>;
  /** Get the impact statistics for host maintenance notifications before sending */
  adminGetHostMaintenanceNotificationImpact: HostMaintenanceNotificationImpact;
  /** Get progress of a specific host maintenance workflow */
  adminGetHostMaintenanceWorkflowProgress: HostMaintenanceNotificationsProgress;
  /** Get all host maintenance notification workflows that are currently running */
  adminGetRunningHostMaintenanceWorkflows: Array<HostMaintenanceWorkflowInfo>;
  /** Returns a single OAuth client by ID (admin only) */
  adminOAuthClient?: Maybe<AdminOAuthClient>;
  /** Returns a paginated list of OAuth clients (admin only) */
  adminOAuthClients: QueryAdminOAuthClientsConnection;
  /** Get a single postgres-ha cluster from the background monitor cache */
  adminPostgresHaCluster?: Maybe<PostgresHaCluster>;
  /** Get all postgres-ha clusters cached from the background monitor workflow */
  adminPostgresHaClusters: PostgresHaClustersResult;
  /** Get a single postgres-pitr service from the background monitor cache */
  adminPostgresPitrService?: Maybe<PostgresPitrService>;
  /** Get all postgres services with PITR (point-in-time recovery) enabled, from the background monitor cache. Covers both standalone and HA Postgres. The HA cluster row is anchored on the leader / root service. */
  adminPostgresPitrServices: PostgresPitrServicesResult;
  /** Get a privnet route from ScyllaDB (admin only). Target format: privnets/domain/{nid}/{endpoint_dns}./aaaa_records */
  adminPrivnetRoute: PrivnetRouteInfo;
  /** Check if a project's canvas is blocked (admin only) */
  adminProjectCanvasBlocked: Scalars['Boolean']['output'];
  /** Check if canvas mutation logging is enabled for a project (admin only) */
  adminProjectCanvasMutationLogging: Scalars['Boolean']['output'];
  /** Returns a project overview specifically for Railway admins */
  adminProjectOverview: AdminProjectOverview;
  /** List available radar attribute definitions */
  adminRadarAttributeCatalog: Array<RadarAttributeDefinition>;
  /** Get a single radar event by ID */
  adminRadarEvent: RadarEvent;
  /** List radar events with optional filters */
  adminRadarEvents: Array<RadarEvent>;
  /** Count radar events with optional filters */
  adminRadarEventsCount: Scalars['Int']['output'];
  /** Get a single radar list by ID */
  adminRadarList: RadarList;
  /** List all radar lists */
  adminRadarLists: Array<RadarList>;
  /** Get a single radar rule by ID */
  adminRadarRule: RadarRule;
  /** List radar rules ordered by priority */
  adminRadarRules: Array<RadarRule>;
  /** Get paginated scan matches for a rule */
  adminRadarScanMatches: RadarScanMatchesResult;
  /** Get current scan status for a rule */
  adminRadarScanStatus?: Maybe<RadarScanStatus>;
  /** Find a Railway domain by its Stripe invoice ID */
  adminRailwayDomainByInvoice?: Maybe<RailwayDomain>;
  /** Search railway domains by name */
  adminRailwayDomains: Array<RailwayDomain>;
  /** Looks up an admin referral code by its code string */
  adminReferralCodeLookup?: Maybe<AdminReferralCode>;
  /** Returns a list of all admin referral codes */
  adminReferralCodes: Array<AdminReferralCode>;
  /** Returns information about a RefundRequest given its ID */
  adminRefundRequestInfo?: Maybe<RefundRequest>;
  /** Search cached GitHub repos */
  adminRepos: QueryAdminReposConnection;
  /** Get a route from ScyllaDB by target and protocol (admin only) */
  adminScyllaRoute: PrivnetRouteInfo;
  /** Get sync status for all domains and TCP proxies directly from network-cp Postgres (admin only, bypasses caches) */
  adminServiceSyncStatus: Array<ServiceSyncStatusItem>;
  /** Get all services deployed from a specific template across the platform */
  adminServicesByTemplate: QueryAdminServicesByTemplateConnection;
  /** Get admin stats. Primarily used for the admin dashboard. */
  adminStats: AdminStats;
  /** Get information about all the ongoing volume instance migrations */
  adminVolumeInstanceMigrations: Array<VolumeInstanceMigrationsQueueState>;
  /** Get all volume instances for a given volume */
  adminVolumeInstancesForVolume: Array<VolumeInstance>;
  /** For a service+environment with multiple attached VolumeInstances, returns each volume's current stacker, the running deployment instance's stacker, and a recommended keep/detach decision. */
  adminVolumeMountTriage: AdminVolumeMountTriage;
  /** Get the adoption level for a workspace */
  adoptionLevel?: Maybe<AdoptionInfo>;
  /** Get unified AI usage for a workspace */
  agentUsage: AgentUsageSummary;
  /** Returns the platform feature flags enabled for the current user */
  allPlatformFeatureFlags: Array<PlatformFeatureFlagStatus>;
  /** Introspect the current API token and its accessible workspaces. */
  apiToken: ApiTokenContext;
  /** Gets all API tokens for the authenticated user. */
  apiTokens: QueryApiTokensConnection;
  /** Get an audit log by ID */
  auditLog: AuditLog;
  /** Get a list of all audit log event types and their description */
  auditLogEventTypeInfo: Array<AuditLogEventTypeInfo>;
  /** Gets audit logs for a workspace. */
  auditLogs: QueryAuditLogsConnection;
  /** Gets the ban reason history for a user or workspace. */
  banReasonHistory: QueryBanReasonHistoryConnection;
  /** Get the S3-compatible credentials for a bucket */
  bucketInstanceDetails?: Maybe<BucketInstanceDetails>;
  /** Get the S3-compatible credentials for a bucket */
  bucketS3Credentials: Array<BucketS3CompatibleCredentials>;
  /** Fetch logs for a build */
  buildLogs: Array<Log>;
  /** Preview a canvas layout merge from one environment to another. Returns the merged state and the mutations needed to reach it. */
  canvasViewMergePreview: CanvasViewMergePreview;
  /** Gets the image URL for a Notion image block */
  changelogBlockImage: Scalars['String']['output'];
  /** Get messages for a chat thread */
  chatMessages: Array<ChatMessage>;
  /** Get a single chat thread by ID */
  chatThread?: Maybe<ChatThread>;
  /** Get chat threads for an environment */
  chatThreads: Array<ChatThread>;
  /** Returns the current ClickHouse backpressure configuration. */
  clickhouseBackpressureStatus: ClickhouseBackpressureStatus;
  /** Get compliance agreements for a workspace including HIPAA BAA and GDPR DPA status. */
  complianceAgreements: ComplianceAgreementsInfo;
  /** Whether the current session can change enforcement */
  currentSessionCanEnforceWorkspaceIdentityProvider: Scalars['Boolean']['output'];
  /** Fetch details for a custom domain */
  customDomain: CustomDomain;
  /** Checks if a custom domain is available. */
  customDomainAvailable: DomainAvailable;
  /** Get the combined bucket usage for a billing period */
  customerBucketUsage: BucketUsage;
  /** Returns the dataplane clusters in a given namespace */
  dataplaneClusters: Array<Cluster>;
  /** Returns a dataplane host for a given hostId */
  dataplaneHost: Host;
  /** Returns the dataplane hosts in a given cluster */
  dataplaneHosts: Array<HostListItem>;
  /** Returns the dataplane lighthouse tokens */
  dataplaneLighthouseTokens: Array<LighthouseToken>;
  /** Returns the dataplane namespaces */
  dataplaneNamespaces: Array<Scalars['String']['output']>;
  /** Returns a dataplane stacker container inventory for a given hostId (using orchestrator) */
  dataplaneStackerContainerInventoryLegacy: Array<ContainerInstance>;
  /** Get 7-day average deploy counts for the current hour of day. Used for reference comparison on the admin dashboard. */
  deployReferenceStats: DeployReferenceStats;
  /** Find a single deployment */
  deployment: Deployment;
  /** Find a deployment by container id */
  deploymentByContainerId: Deployment;
  /** Find a deployment by public url */
  deploymentByDomain: DeploymentByDomain;
  /** Get the deployment events for a deployment */
  deploymentEvents: QueryDeploymentEventsConnection;
  /** List deployment instance assignments for a given deployment, including which stacker each instance is on */
  deploymentInstanceAssignments: Array<DeploymentInstanceAssignment>;
  /** Get the deployment instance executions for a deployment. */
  deploymentInstanceExecutions: QueryDeploymentInstanceExecutionsConnection;
  /** Fetch logs for a deployment */
  deploymentLogs: Array<Log>;
  /** Find a single DeploymentSnapshot */
  deploymentSnapshot?: Maybe<DeploymentSnapshot>;
  /** Get a short-lived URL to the deployment snapshot code */
  deploymentSnapshotCodeUri: Scalars['String']['output'];
  /** All deployment triggers. */
  deploymentTriggers: QueryDeploymentTriggersConnection;
  /** Get all deployments */
  deployments: QueryDeploymentsConnection;
  /**
   * Domain with status
   * @deprecated Use the `status` field within the `domain` query instead
   */
  domainStatus: DomainWithStatus;
  /** All domains for a service instance */
  domains: AllDomains;
  /** Get the progress of a stacker draining */
  drainStackerProgress: DrainStackerProgress;
  /** Get the earnings details for a user. */
  earningDetails: EarningDetails;
  /** The edge entrypoints used by the domain. */
  edgeEntrypoint: EdgeEntrypoint;
  /** Preview HA static egress IPs that would be assigned without persisting */
  egressGatewayHAPreview: Array<EgressGateway>;
  /** Preview legacy static egress IP that would be assigned without persisting */
  egressGatewayLegacyPreview: Array<EgressGateway>;
  /** All egress gateways assigned to a service instance */
  egressGateways: Array<EgressGateway>;
  /** Find a single environment */
  environment: Environment;
  /** Fetch logs for a project environment. Build logs are excluded unless a snapshot ID is explicitly provided in the filter */
  environmentLogs: Array<Log>;
  /** Get a single environment patch by ID */
  environmentPatch: EnvironmentPatch;
  /** Get the patches for an environment */
  environmentPatches: QueryEnvironmentPatchesConnection;
  /** Get the latest staged commit for a single environment. */
  environmentStagedChanges: EnvironmentPatch;
  /** Gets all environments for a project. */
  environments: QueryEnvironmentsConnection;
  /** Get the estimated total cost of the project at the end of the current billing cycle. If no `startDate` is provided, the usage for the current billing period of the project owner is returned. */
  estimatedUsage: Array<EstimatedUsage>;
  /** Gets the events for a project. */
  events: QueryEventsConnection;
  /** Get the workspaces the user doesn't belong to, but needs access (like when invited to a project) */
  externalWorkspaces: Array<ExternalWorkspace>;
  /** Get information about a specific function runtime */
  functionRuntime: FunctionRuntime;
  /** List available function runtimes */
  functionRuntimes: Array<FunctionRuntime>;
  /** Get all stacker draining workflows that are currently running */
  getDrainStackerRunningWorkflows: Array<DrainStackerWorkflowInfo>;
  /** Get all published templates for support metric calculation */
  getPublishedTemplatesForSupportMetrics: QueryGetPublishedTemplatesForSupportMetricsConnection;
  /** Get all stacker stats workflows that are currently running */
  getStackerStatsRunningWorkflows: Array<StackerStatsWorkflowInfo>;
  /** Gets a template by its ID */
  getTemplate?: Maybe<HelpStationThreadTemplateInfo>;
  /** Get thread payouts */
  getThreadPayouts: Array<ThreadPayout>;
  /** Get templates created by all workspaces this user is a member or admin of */
  getUserTemplates: Array<HelpStationThreadTemplateInfo>;
  /** Gets the Temporal workflows for a user */
  getUserTemporalEvents: Array<TemporalEvent>;
  /** Checks if user has access to GitHub repository */
  gitHubRepoAccessAvailable: GitHubAccess;
  /** Gets SSH public keys from the authenticated user's GitHub account. */
  gitHubSshKeys: Array<GitHubSshKey>;
  /** Returns the user's GitHub auth status */
  githubAuth: GithubAuth;
  /** Inspect the GitHub backpressure active deployments and compare with actual DB status. */
  githubBackpressureInspect: GithubBackpressureInspection;
  /** Inspect the GitHub backpressure queued deployments and compare with actual DB status. */
  githubBackpressureInspectQueued: GithubBackpressureQueuedInspection;
  /** Returns the current GitHub backpressure status and configuration. */
  githubBackpressureStatus: GithubBackpressureStatus;
  /** Get GitHub events for a user */
  githubEvents: Array<GitHubEvent>;
  /** Check if a repo name is available */
  githubIsRepoNameAvailable: Scalars['Boolean']['output'];
  /** Get info for a GitHub pull request */
  githubPRInfo?: Maybe<GitHubPrInfo>;
  /** Checks if user has access to GitHub repository */
  githubRepo: GitHubRepoWithoutInstallation;
  /** Analyzes a repository to discover configuration */
  githubRepoAnalysis: RepoAnalysis;
  /** Get branches for a GitHub repo that the authenticated user has access to */
  githubRepoBranches: Array<GitHubBranch>;
  /** Search over repos that a user has granted Railway access to */
  githubRepoSearch2: QueryGithubRepoSearch2Connection;
  /** Get the file tree for a GitHub repository at a specific branch */
  githubRepoTree: Array<GitHubRepoFile>;
  /** Get a list of repos for a user that Railway has access to */
  githubRepos: Array<GitHubRepo>;
  /** Get a list of scopes the user has installed the installation to */
  githubWritableScopes: Array<Scalars['String']['output']>;
  /** Returns a list of usage anomalies grouped by service. */
  groupedUsageAnomalies: Array<GroupedUsageAnomaly>;
  /** Check if a user has a recent or pending withdrawal. */
  hasRecentWithdrawal: Scalars['Boolean']['output'];
  /** Reads workspace audit logs (security/admin events: SSO, 2FA, member/role changes, token mgmt, resource lifecycle). Filter by project/environment/event types/date range. Capped at 500 entries — narrow with date range if results are truncated. */
  helpStationAuditLogs: Array<HelpStationAuditLogEntry>;
  /** Narrow ownership check for CS auto-responder. Returns only whether the domain is on Railway and whether the supplied userId is an admin of the owning workspace. Returns nothing about which other workspace owns it; safe to call from a user-scoped context. */
  helpStationDomainOwnership: HelpStationDomainOwnershipResult;
  /** Gets the full domain status including DNS records, certificate state, and verification status. Uses networkcp's HTTP probe-based detection to see through CNAME flattening. */
  helpStationDomainStatus: HelpStationDomainStatusResult;
  /** Gets the user for a help station thread */
  helpStationFindUserByIdOrEmail: User;
  /** Fetch workspaces by ID for the CS admin index. Pothos resolves only the fields the gateway query asks for, so callers MUST select a slim fragment (no Stripe-touching fields like avgMonthlySpend / creditBalance / credits) to keep the call cheap. */
  helpStationListWorkspacesByIds: Array<HelpStationAdminContextWorkspaceInfo>;
  /** Looks up a Railway domain to find the associated service, project, and workspace. Use for abuse reports or takedown requests. */
  helpStationLookupDomain: HelpStationDomainLookupResult;
  /** Looks up a Central Station thread by slug. Used by admin flows (e.g. the restrict-workspace modal) to validate a pasted station.railway.com URL and preview the thread before applying a restriction. Returns null when the slug doesn't resolve. */
  helpStationLookupThread?: Maybe<HelpStationThreadLookupResult>;
  /** Gets aggregated network connections grouped by 5-tuple for a service in a given environment */
  helpStationNetworkConnections: Array<HelpStationNetworkConnection>;
  /** Gets individual network flow log entries for a service in a given environment */
  helpStationNetworkFlowLogs: Array<HelpStationNetworkFlowLog>;
  /** List a project's volume instances (optionally filtered to one environment) with capacity, usage, attached service, state, and the workspace's plan max size. Used by Central Station chat to populate the resize_volume suggestion. */
  helpStationProjectVolumes: Array<HelpStationProjectVolume>;
  /** Search workspaces by name, ID, Slack channel ID, or Stripe customer ID */
  helpStationSearchWorkspaces: Array<HelpStationAdminContextWorkspaceInfo>;
  /** Gets runtime logs (stdout/stderr) for a deployment or service for help station context */
  helpStationServiceLogs: Array<HelpStationLogEntry>;
  /** Gets the sidebar info for a help station thread based on Slack channel ID */
  helpStationSlackThreadContext: HelpStationThreadSidebarInfo;
  /** Gets the sidebar info for a help station thread */
  helpStationThreadContext: HelpStationThreadSidebarInfo;
  /** Gets the template used by a thread's linked service */
  helpStationThreadTemplate?: Maybe<HelpStationThreadTemplateInfo>;
  /** Gets usage breakdown by service for workspaces associated with given users, plus Railway Agent token usage (metered separately). */
  helpStationUsageBreakdown: Array<HelpStationWorkspaceUsage>;
  /** Gets all domains (custom and service) for the specified workspaces */
  helpStationUserDomains: Array<HelpStationUserDomainsInfo>;
  /** Gets the admin context for a workspace by workspace ID */
  helpStationWorkspaceContext: HelpStationThreadSidebarInfo;
  /** Read a workspace's plan limits — limitsVersion, base plan values, current override (if any) + its expiresAt, and the effective post-merge limit. Used by CS Chat's getWorkspaceLimits tool. */
  helpStationWorkspaceLimits: HelpStationWorkspaceLimitsView;
  /** Lists Railway-purchased (name.com) domains for a workspace with transfer-eligibility info. Includes domains not currently attached to a service. Used by CS Chat's domain transfer runbook. */
  helpStationWorkspaceRailwayDomains: Array<HelpStationRailwayDomainInfo>;
  /** Gets services and projects for specified workspaces for help station context */
  helpStationWorkspaceServices: Array<HelpStationWorkspaceServicesInfo>;
  /** Gets services grouped by environment for specified workspaces (includes environmentId) */
  helpStationWorkspaceServicesV2: Array<HelpStationWorkspaceServicesInfoV2>;
  /** Get the Herokus apps for the current user */
  herokuApps: Array<HerokuApp>;
  /** Get HTTP request duration metrics for a service (avg, p50, p90, p95, p99) */
  httpDurationMetrics: HttpDurationMetricsResult;
  /** Fetch HTTP logs for a deployment */
  httpLogs: Array<HttpLog>;
  /** Get HTTP request metrics for a service */
  httpMetrics: HttpMetricsResult;
  /** Get HTTP request metrics for a service, grouped by status code */
  httpMetricsGroupedByStatus: Array<HttpMetricsByStatusResult>;
  /** Get an integration auth by provider providerId */
  integrationAuth: IntegrationAuth;
  /** Get all integration auths for a user */
  integrationAuths: QueryIntegrationAuthsConnection;
  /** Get all integrations for a project */
  integrations: QueryIntegrationsConnection;
  /** Get an invite code by the code */
  inviteCode: InviteCode;
  /** Check if a GitHub repo is a monorepo */
  isMonorepo: Scalars['Boolean']['output'];
  /** List deployment instances for a given stacker */
  listDeploymentInstancesForStacker: Array<DeploymentInstanceAssignment>;
  /** List all available edge entrypoints */
  listEdgeEntrypoints: Array<EdgeEntrypoint>;
  /** List all stackers */
  listStackers: Array<Stacker>;
  /** Returns the current lockdown status of the platform. */
  lockdownStatus: LockdownStatus;
  /** Fetch available attributes of the logs query */
  logsAttributes: Array<LogAttributesResult>;
  /** Fetch a histogram of the logs query */
  logsHistogram: Histogram;
  /** Get limits for log queries */
  logsLimits: LogLimits;
  /** Get all published templates for a maintainer. */
  maintainerTemplates: MaintainerTemplatesResponse;
  /** Gets the authenticated user. */
  me: User;
  /** Get metrics for a project, environment, and service */
  metrics: Array<MetricsResult>;
  /** Get the progress of a stacker migration */
  migrateStackerProgress: MigrateStackerProgress;
  /** Get a collection in a MongoDB container */
  mongoCollectionData: MongoCollection;
  /** Get a list of collection names in a MongoDB container */
  mongoCollectionNames: Array<Scalars['String']['output']>;
  /** Get a list of database names in a MongoDB container */
  mongoDatabaseNames: Array<Scalars['String']['output']>;
  /** Get current monorepo import status */
  monorepoImportStatus?: Maybe<MonorepoImportStatusUpdate>;
  /** Get support threads created by the current user */
  mySupportThreads: Array<SupportThread>;
  /** Fetch aggregated network connections for an environment (grouped by connection tuple) */
  networkConnections: Array<NetworkConnection>;
  /** Fetch individual network flow logs for an environment */
  networkFlowLogs: Array<NetworkFlowLog>;
  /** Get aggregated network flow metrics per service for an environment. Returns a map of services to their peer connections with bandwidth metrics. */
  networkFlowServiceLayer: NetworkFlowServiceLayerResult;
  /** Gets notification deliveries for the authenticated user */
  notificationDeliveries: QueryNotificationDeliveriesConnection;
  /** Gets a notification delivery by ID for the authenticated user */
  notificationDelivery?: Maybe<NotificationDelivery>;
  /** Gets notification instances for project */
  notificationInstances: QueryNotificationInstancesConnection;
  /** Get all notification rules for a workspace and project */
  notificationRules: Array<NotificationRule>;
  /** Get the default notification filter configurations */
  notificationUserFilterDefaults: Scalars['JSON']['output'];
  /** Get notification filters for the authenticated user, including implicit defaults */
  notificationUserFilters: Array<NotificationUserFilter>;
  /** Get a single OAuth grant authorized by the current user */
  oauthAuthorizedApp?: Maybe<OAuthGrant>;
  /** List OAuth apps authorized by the current user */
  oauthAuthorizedApps: Array<OAuthGrant>;
  /** Get an OAuth client by ID */
  oauthClient?: Maybe<OAuthClient>;
  /** List OAuth clients for a workspace */
  oauthClients: Array<OAuthClient>;
  /** List projects the current user can grant OAuth apps access to */
  oauthGrantableProjects: Array<OAuthGrantableProject>;
  /** List workspaces the current user can grant OAuth apps access to */
  oauthGrantableWorkspaces: Array<OAuthGrantableWorkspace>;
  /** Get all observability monitors for a dashboard item */
  observabilityDashboardItems: Array<ObservabilityDashboardItem>;
  /** Get all observability dashboards for an environment */
  observabilityDashboards: QueryObservabilityDashboardsConnection;
  /** Gets all passkeys for the authenticated user */
  passkeys: QueryPasskeysConnection;
  /** Returns the current status of the platform feature. */
  platformFeatureFlags: Array<PlatformFeatureFlagStatus>;
  /** Get the current status of the platform */
  platformStatus: PlatformStatus;
  /**
   * Get a plugin by ID.
   * @deprecated Plugins are deprecated
   */
  plugin: Plugin;
  /**
   * Fetch logs for a plugin
   * @deprecated Plugins are deprecated
   */
  pluginLogs: Array<Log>;
  /** Get the email preferences for a user */
  preferences: Preferences;
  /** Get a private network endpoint for a service instance. */
  privateNetworkEndpoint?: Maybe<PrivateNetworkEndpoint>;
  /** Check if an endpoint name is available. */
  privateNetworkEndpointNameAvailable: Scalars['Boolean']['output'];
  /** List private networks for an environment. */
  privateNetworks: Array<PrivateNetwork>;
  /** Get a project by ID */
  project: Project;
  /** Get comprehensive compliance information for a project including 2FA status, member permissions, backup schedules, and compliance agreements. Requires workspace API token with admin access. */
  projectCompliance: ProjectComplianceInfo;
  /** Get a project invitation by code */
  projectInvitation: PublicProjectInvitation;
  /** Get invitations for a project */
  projectInvitations: Array<ProjectInvitation>;
  /** Get an invite code for a project for a specifc role */
  projectInviteCode: InviteCode;
  /** Gets users who belong to a project along with their role */
  projectMembers: Array<ProjectMember>;
  /** Get resource access rules for project-specific actions */
  projectResourceAccess: ProjectResourceAccess;
  /** Get a single project token by the value in the header */
  projectToken: ProjectToken;
  /** Get all project tokens for a project */
  projectTokens: QueryProjectTokensConnection;
  /** Get workspace members for a project with 2FA details */
  projectWorkspaceMembers: ProjectWorkspaceMembersResponse;
  /** Gets all projects for a user or workspace. */
  projects: QueryProjectsConnection;
  /** Fetch multiple projects by id. Skips ids the caller cannot access (does not throw on partial denial). Intended for batched dashboard hydration of a small viewport-sized set of cards. */
  projectsByIds: Array<Project>;
  /** Get public Railway stats. */
  publicStats: PublicStats;
  /** Get a Railway domain by ID */
  railwayDomain: RailwayDomain;
  /** Get a Railway domain by its domain name within a workspace */
  railwayDomainByName: RailwayDomain;
  /** List DNS records for a Railway domain */
  railwayDomainDnsRecords: Array<RailwayDomainDnsRecord>;
  /** Get Railway domains for a workspace */
  railwayDomains: Array<RailwayDomain>;
  /** Returns recent platform feature flag changes (last 48h) */
  recentPlatformFeatureFlagChanges: Array<PlatformFeatureFlagChange>;
  /** Get data for key in a Redis container */
  redisGetKey: Scalars['JSON']['output'];
  /** Get a list of keys in a Redis container */
  redisKeys: Array<RedisKey>;
  /** Scans a list of keys in a Redis container with pagination */
  redisScanKeys: RedisScanKeys;
  /** Gets the ReferralInfo for the authenticated user. */
  referralInfo: ReferralInfo;
  /**
   * Get the total referral payout earnings for a user.
   * @deprecated Use earningsDetails instead
   */
  referralPayoutsTotal: Scalars['Float']['output'];
  /** List available regions */
  regions: Array<Region>;
  /** Get metrics for a service's replicas */
  replicaMetrics: Array<MetricsReplicaResult>;
  /** Get resource access for the current user or workspace */
  resourceAccess: ResourceAccess;
  /** Get a sandbox by id. */
  sandbox?: Maybe<Sandbox>;
  /** Get the status of a sandbox template. */
  sandboxTemplate: SandboxTemplate;
  /** List sandboxes in an environment. */
  sandboxes: QuerySandboxesConnection;
  /** Search published templates by name or description */
  searchTemplates: QuerySearchTemplatesConnection;
  /** Get a service by ID */
  service: Service;
  /** Checks if a service domain is available */
  serviceDomainAvailable: DomainAvailable;
  /** Get a service instance belonging to a service and environment */
  serviceInstance: ServiceInstance;
  /** Returns the auto-deploy status for a service instance, including whether it can be enabled. */
  serviceInstanceAutoDeployStatus: ServiceInstanceAutoDeployStatus;
  /** Check if the upstream repo for a service has an update available */
  serviceInstanceIsUpdatable: Scalars['Boolean']['output'];
  /** Get the service instance resource limit overrides (null if no overrides set) */
  serviceInstanceLimitOverride?: Maybe<Scalars['ServiceInstanceLimit']['output']>;
  /** Get the merged resource limits for a service instance (includes plan defaults) */
  serviceInstanceLimits: Scalars['ServiceInstanceLimit']['output'];
  /** Analyzes a service instance's repository to discover configuration */
  serviceInstanceRepoAnalysis: RepoAnalysis;
  /** Gets all sessions for authenticated user. */
  sessions: QuerySessionsConnection;
  /** Gets the Railway workspace associated with a Slack connect channel ID */
  slackConnectWorkspace: Workspace;
  /** Get dependencies for a SQL database extension */
  sqlExtensionDependencies: Array<Scalars['String']['output']>;
  /** Get extensions that depend on a SQL database extension */
  sqlExtensionDependents: Array<Scalars['String']['output']>;
  /** Get available and installed SQL database extensions */
  sqlExtensions: Array<SqlExtension>;
  /** Get rows for a SQL table */
  sqlTable: SqlTable;
  /** Get a list of table names in SQLQL container */
  sqlTableNames: Array<Scalars['String']['output']>;
  /** Gets SSH public keys. If workspaceId is provided, returns the keys owned by that workspace (requires workspace MEMBER access). Under a workspace-scoped API token, workspaceId defaults to the token's workspace when omitted; otherwise returns the authenticated user's personal keys. */
  sshPublicKeys: QuerySshPublicKeysConnection;
  /** Get the progress of a stacker stats workflow */
  stackerStatsProgress: StackerStatsProgress;
  /** Get a support thread with its messages */
  supportThreadMessages?: Maybe<SupportThreadDetail>;
  /** Get thread slugs + last activity timestamps for badge polling */
  supportThreadsLastActivity: Array<SupportThreadActivity>;
  /** All TCP proxies for a service instance */
  tcpProxies: Array<TcpProxy>;
  /**
   * Find a team by ID
   * @deprecated Teams are now workspaces. Use the workspace query instead.
   */
  team: Team;
  /**
   * Get all templates for a team.
   * @deprecated Use templates instead - teams are now workspaces
   */
  teamTemplates: QueryTeamTemplatesConnection;
  /** Get a template by code or ID or GitHub owner and repo. */
  template: Template;
  /** Get the metrics for a template. */
  templateMetrics: TemplateMetrics;
  /** Get the total kickback earnings for a user. */
  templatePayoutsTotal: Scalars['Float']['output'];
  /** Search published templates using the backend-ranked template search index. */
  templateSearch: QueryTemplateSearchConnection;
  /** Get the source template for a project. */
  templateSourceForProject?: Maybe<Template>;
  /** Get all published templates. */
  templates: QueryTemplatesConnection;
  /** Count all published templates. */
  templatesCount: Scalars['Int']['output'];
  /** Get the top projects by a metric */
  topMetrics: TopMetricsResult;
  /** Get all trusted domains for a workspace */
  trustedDomains: QueryTrustedDomainsConnection;
  /** Gets the TwoFactorInfo for the authenticated user. */
  twoFactorInfo: TwoFactorInfo;
  /** Gets the TwoFactorStatus for the authenticated user. */
  twoFactorStatus: TwoFactorStatus;
  /**
   * Get a list of cash and credit withdrawals for a customer.
   * @deprecated Use unifiedWithdrawalsV2 instead
   */
  unifiedWithdrawals: Array<UnifiedWithdrawal>;
  /** Get a list of cash and credit withdrawals for a customer. */
  unifiedWithdrawalsV2: QueryUnifiedWithdrawalsV2Connection;
  /** Get the usage for a single project or all projects for a user/workspace. If no `projectId` or `workspaceId` is provided, the usage for the current user is returned. If no `startDate` is provided, the usage for the current billing period of the project owner is returned. */
  usage: Array<AggregatedUsage>;
  /** Get a user by id */
  user: User;
  /** Check if a user is in good standing based on their admin workspaces - returns null if not in good standing */
  userGoodStanding?: Maybe<UserStanding>;
  /** Get the user id corresponding to a Discord id */
  userIdForDiscordId: Scalars['String']['output'];
  /**
   * Get the total kickback earnings for a user.
   * @deprecated This field is deprecated and will be removed in future versions.
   */
  userKickbackEarnings: UserKickbackEarnings;
  /** Get the public profile for a user */
  userProfile: UserProfileResponse;
  /** Get the reasoning behind the risk level of a user */
  userRiskLevel: RiskLevelDetails;
  /**
   * Get all templates for the current user.
   * @deprecated Users don't have personal templates anymore, they belong to their team now
   */
  userTemplates: QueryUserTemplatesConnection;
  /** Get all users */
  users: QueryUsersConnection;
  /** Gets all users with same IP as specified user. */
  usersWithClashingIP: Array<UserWithClashingIp>;
  /** All variables by pluginId or serviceId. If neither are provided, all shared variables are returned. */
  variables: Scalars['EnvironmentVariables']['output'];
  /** Filterable, unrendered variables for a provided environment */
  variablesForEnvironment: Scalars['ProvidedEnvironmentVariables']['output'];
  /** All rendered variables that are required for a service deployment. */
  variablesForServiceDeployment: Scalars['EnvironmentVariables']['output'];
  /** Get information about the user's Vercel accounts */
  vercelInfo: VercelInfo;
  /** Get a single volume instance by id */
  volumeInstance: VolumeInstance;
  /** List backups of a volume instance */
  volumeInstanceBackupList: Array<VolumeInstanceBackup>;
  /** List backups schedules of a volume instance */
  volumeInstanceBackupScheduleList: Array<VolumeInstanceBackupSchedule>;
  /** Get the Stripe Connect login link for a withdrawal account. */
  withdrawalAccountStripeConnectLoginLink: Scalars['String']['output'];
  /** Get the Stripe Connect onboarding link for a withdrawal account. */
  withdrawalAccountStripeConnectOnboardingLink: Scalars['String']['output'];
  /** Get the supported countries for cash withdrawal accounts. */
  withdrawalAccountSupportedCountries: Array<Scalars['String']['output']>;
  /**
   * Get all withdrawal accounts for a user.
   * @deprecated Use withdrawalAccountsV2 instead
   */
  withdrawalAccounts: Array<WithdrawalAccountInfo>;
  /** Get all withdrawal accounts for a user. */
  withdrawalAccountsV2: Array<WithdrawalAccount>;
  /** Get the available balance for a user. */
  withdrawalAvailableBalance: Scalars['Float']['output'];
  /** Get withdrawals for a customer. */
  withdrawals: Array<WithdrawalType>;
  /**
   * Get the sum of all completed and pending withdrawals for a user.
   * @deprecated Use earningDetails instead
   */
  withdrawalsToCash: Scalars['Float']['output'];
  /**
   * Get the total kickback credits for a user.
   * @deprecated Use earningDetails instead
   */
  withdrawalsToCredit: Scalars['Float']['output'];
  /** Gets the status of a workflow */
  workflowStatus: WorkflowResult;
  /** Get the workspace */
  workspace: Workspace;
  /** Find a workspace by invite code */
  workspaceByCode: Workspace;
  /** Check if a workspace is in good standing - returns null if not in good standing */
  workspaceGoodStanding?: Maybe<WorkspaceStanding>;
  /** Gets all identity providers of a workspace */
  workspaceIdentityProviders: QueryWorkspaceIdentityProvidersConnection;
  /** Get the policies for a workspace */
  workspacePolicy?: Maybe<WorkspacePolicy>;
  /** List deploy sources that can be added to a workspace policy. */
  workspacePolicySelectableDeploySources: Array<WorkspacePolicySelectableDeploySource>;
  /** Get all templates for a workspace. */
  workspaceTemplates: QueryWorkspaceTemplatesConnection;
  /** Get the top movers for workspaces within a defined period */
  workspaceTopMovers: WorkspaceMoverInfo;
  /** Get all workspaces (admin only) */
  workspaces: QueryWorkspacesConnection;
};


export type QueryAdminAllContainerInfoForPluginInEnvironmentArgs = {
  environmentId: Scalars['String']['input'];
  pluginId: Scalars['String']['input'];
};


export type QueryAdminAllContainerInfoForServiceInEnvironmentArgs = {
  environmentId: Scalars['String']['input'];
  fetchInactive?: InputMaybe<Scalars['Boolean']['input']>;
  serviceId: Scalars['String']['input'];
};


export type QueryAdminAllDomainsArgs = {
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  query: Scalars['String']['input'];
};


export type QueryAdminAllProjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  expired?: InputMaybe<Scalars['Boolean']['input']>;
  filter?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAdminAllServicesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  filter?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAdminArchivedContainersArgs = {
  userId?: InputMaybe<Scalars['String']['input']>;
  workspaceId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAdminBannedImageArgs = {
  image: Scalars['String']['input'];
};


export type QueryAdminBucketsByNameArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  name: Scalars['String']['input'];
};


export type QueryAdminCryptominerDetectionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAdminCryptominerDetectionsForServiceArgs = {
  serviceId: Scalars['String']['input'];
};


export type QueryAdminDeploymentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  input: AdminDeploymentListInput;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAdminGetHostMaintenanceNotificationImpactArgs = {
  stackerHostname: Scalars['String']['input'];
};


export type QueryAdminGetHostMaintenanceWorkflowProgressArgs = {
  workflowId: Scalars['String']['input'];
};


export type QueryAdminOAuthClientArgs = {
  id: Scalars['String']['input'];
};


export type QueryAdminOAuthClientsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  includeDeleted?: InputMaybe<Scalars['Boolean']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAdminPostgresHaClusterArgs = {
  environmentId: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
};


export type QueryAdminPostgresHaClustersArgs = {
  healthFilter?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sortDir?: InputMaybe<Scalars['String']['input']>;
  sortField?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAdminPostgresPitrServiceArgs = {
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type QueryAdminPostgresPitrServicesArgs = {
  flavorFilter?: InputMaybe<Scalars['String']['input']>;
  healthFilter?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sortDir?: InputMaybe<Scalars['String']['input']>;
  sortField?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAdminPrivnetRouteArgs = {
  endpointDns: Scalars['String']['input'];
  networkId: Scalars['String']['input'];
};


export type QueryAdminProjectCanvasBlockedArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryAdminProjectCanvasMutationLoggingArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryAdminProjectOverviewArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryAdminRadarEventArgs = {
  id: Scalars['String']['input'];
};


export type QueryAdminRadarEventsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  ruleId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<RadarEventStatus>;
};


export type QueryAdminRadarEventsCountArgs = {
  ruleId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<RadarEventStatus>;
};


export type QueryAdminRadarListArgs = {
  id: Scalars['String']['input'];
};


export type QueryAdminRadarRuleArgs = {
  id: Scalars['String']['input'];
};


export type QueryAdminRadarRulesArgs = {
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryAdminRadarScanMatchesArgs = {
  hideActioned?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  ruleId: Scalars['String']['input'];
};


export type QueryAdminRadarScanStatusArgs = {
  ruleId: Scalars['String']['input'];
};


export type QueryAdminRailwayDomainByInvoiceArgs = {
  invoiceId: Scalars['String']['input'];
};


export type QueryAdminRailwayDomainsArgs = {
  query: Scalars['String']['input'];
};


export type QueryAdminReferralCodeLookupArgs = {
  code: Scalars['String']['input'];
};


export type QueryAdminRefundRequestInfoArgs = {
  id: Scalars['String']['input'];
};


export type QueryAdminReposArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  installationId?: InputMaybe<Scalars['String']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  ownerLogin?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAdminScyllaRouteArgs = {
  protocol: Scalars['String']['input'];
  target: Scalars['String']['input'];
};


export type QueryAdminServiceSyncStatusArgs = {
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type QueryAdminServicesByTemplateArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  templateCode: Scalars['String']['input'];
};


export type QueryAdminVolumeInstancesForVolumeArgs = {
  volumeId: Scalars['String']['input'];
};


export type QueryAdminVolumeMountTriageArgs = {
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type QueryAdoptionLevelArgs = {
  workspaceId: Scalars['String']['input'];
};


export type QueryAgentUsageArgs = {
  workspaceId: Scalars['String']['input'];
};


export type QueryApiTokensArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAuditLogArgs = {
  id: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};


export type QueryAuditLogsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<AuditLogFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<SortOrder>;
  workspaceId: Scalars['String']['input'];
};


export type QueryBanReasonHistoryArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
  workspaceId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryBucketInstanceDetailsArgs = {
  bucketId: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
};


export type QueryBucketS3CredentialsArgs = {
  bucketId: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
};


export type QueryBuildLogsArgs = {
  deploymentId: Scalars['String']['input'];
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  startDate?: InputMaybe<Scalars['DateTime']['input']>;
};


export type QueryCanvasViewMergePreviewArgs = {
  sourceEnvironmentId: Scalars['String']['input'];
  targetEnvironmentId: Scalars['String']['input'];
};


export type QueryChangelogBlockImageArgs = {
  id: Scalars['String']['input'];
};


export type QueryChatMessagesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  threadId: Scalars['String']['input'];
};


export type QueryChatThreadArgs = {
  threadId: Scalars['String']['input'];
};


export type QueryChatThreadsArgs = {
  environmentId: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryComplianceAgreementsArgs = {
  workspaceId: Scalars['String']['input'];
};


export type QueryCurrentSessionCanEnforceWorkspaceIdentityProviderArgs = {
  workspaceId: Scalars['String']['input'];
};


export type QueryCustomDomainArgs = {
  id: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
};


export type QueryCustomDomainAvailableArgs = {
  domain: Scalars['String']['input'];
};


export type QueryCustomerBucketUsageArgs = {
  endDate: Scalars['DateTime']['input'];
  startDate: Scalars['DateTime']['input'];
  workspaceId: Scalars['String']['input'];
};


export type QueryDataplaneClustersArgs = {
  label?: InputMaybe<Scalars['String']['input']>;
  namespace?: InputMaybe<Scalars['String']['input']>;
};


export type QueryDataplaneHostArgs = {
  hostId: Scalars['String']['input'];
};


export type QueryDataplaneHostsArgs = {
  clusterId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryDataplaneStackerContainerInventoryLegacyArgs = {
  hostId: Scalars['String']['input'];
  runtimes?: InputMaybe<Array<ComputeRuntime>>;
};


export type QueryDeploymentArgs = {
  id: Scalars['String']['input'];
};


export type QueryDeploymentByContainerIdArgs = {
  containerId: Scalars['String']['input'];
};


export type QueryDeploymentByDomainArgs = {
  domain: Scalars['String']['input'];
};


export type QueryDeploymentEventsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['String']['input'];
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryDeploymentInstanceAssignmentsArgs = {
  deploymentId: Scalars['String']['input'];
};


export type QueryDeploymentInstanceExecutionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  input: DeploymentInstanceExecutionListInput;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryDeploymentLogsArgs = {
  deploymentId: Scalars['String']['input'];
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  startDate?: InputMaybe<Scalars['DateTime']['input']>;
};


export type QueryDeploymentSnapshotArgs = {
  deploymentId: Scalars['String']['input'];
};


export type QueryDeploymentSnapshotCodeUriArgs = {
  deploymentId: Scalars['String']['input'];
};


export type QueryDeploymentTriggersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  environmentId: Scalars['String']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  projectId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type QueryDeploymentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  input: DeploymentListInput;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryDomainStatusArgs = {
  id: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
};


export type QueryDomainsArgs = {
  environmentId: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type QueryDrainStackerProgressArgs = {
  workflowId: Scalars['String']['input'];
};


export type QueryEarningDetailsArgs = {
  customerId: Scalars['String']['input'];
};


export type QueryEdgeEntrypointArgs = {
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type QueryEgressGatewayHaPreviewArgs = {
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type QueryEgressGatewayLegacyPreviewArgs = {
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type QueryEgressGatewaysArgs = {
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type QueryEnvironmentArgs = {
  id: Scalars['String']['input'];
  projectId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryEnvironmentLogsArgs = {
  afterDate?: InputMaybe<Scalars['String']['input']>;
  afterLimit?: InputMaybe<Scalars['Int']['input']>;
  anchorDate?: InputMaybe<Scalars['String']['input']>;
  beforeDate?: InputMaybe<Scalars['String']['input']>;
  beforeLimit?: InputMaybe<Scalars['Int']['input']>;
  environmentId: Scalars['String']['input'];
  filter?: InputMaybe<Scalars['String']['input']>;
};


export type QueryEnvironmentPatchArgs = {
  id: Scalars['String']['input'];
};


export type QueryEnvironmentPatchesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  environmentId: Scalars['String']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryEnvironmentStagedChangesArgs = {
  environmentId: Scalars['String']['input'];
};


export type QueryEnvironmentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  isEphemeral?: InputMaybe<Scalars['Boolean']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  projectId: Scalars['String']['input'];
};


export type QueryEstimatedUsageArgs = {
  includeDeleted?: InputMaybe<Scalars['Boolean']['input']>;
  measurements: Array<MetricMeasurement>;
  projectId?: InputMaybe<Scalars['String']['input']>;
  teamId?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
  workspaceId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryEventsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  environmentId?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<EventFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  projectId: Scalars['String']['input'];
};


export type QueryExternalWorkspacesArgs = {
  projectId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryFunctionRuntimeArgs = {
  name: FunctionRuntimeName;
};


export type QueryGetPublishedTemplatesForSupportMetricsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryGetTemplateArgs = {
  templateId: Scalars['String']['input'];
};


export type QueryGetUserTemplatesArgs = {
  userId: Scalars['String']['input'];
};


export type QueryGetUserTemporalEventsArgs = {
  projectId?: InputMaybe<Scalars['String']['input']>;
  ticketCreationTs: Scalars['String']['input'];
  userId: Scalars['String']['input'];
  workspaces: Array<Scalars['String']['input']>;
};


export type QueryGitHubRepoAccessAvailableArgs = {
  fullRepoName: Scalars['String']['input'];
};


export type QueryGithubEventsArgs = {
  userId: Scalars['String']['input'];
};


export type QueryGithubIsRepoNameAvailableArgs = {
  fullRepoName: Scalars['String']['input'];
};


export type QueryGithubPrInfoArgs = {
  prNumber: Scalars['Int']['input'];
  serviceId: Scalars['String']['input'];
};


export type QueryGithubRepoArgs = {
  fullRepoName: Scalars['String']['input'];
};


export type QueryGithubRepoAnalysisArgs = {
  branch?: InputMaybe<Scalars['String']['input']>;
  fullRepoName: Scalars['String']['input'];
};


export type QueryGithubRepoBranchesArgs = {
  owner: Scalars['String']['input'];
  repo: Scalars['String']['input'];
};


export type QueryGithubRepoSearch2Args = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  ownerIds?: InputMaybe<Array<Scalars['String']['input']>>;
  searchQuery?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGithubRepoTreeArgs = {
  branch: Scalars['String']['input'];
  fullRepoName: Scalars['String']['input'];
  recursive?: InputMaybe<Scalars['Boolean']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGroupedUsageAnomaliesArgs = {
  input: GroupedUsageAnomaliesInput;
};


export type QueryHasRecentWithdrawalArgs = {
  customerId: Scalars['String']['input'];
};


export type QueryHelpStationAuditLogsArgs = {
  endDate?: InputMaybe<Scalars['String']['input']>;
  environmentId?: InputMaybe<Scalars['String']['input']>;
  eventTypes?: InputMaybe<Array<Scalars['String']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  projectId?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
  workspaceId: Scalars['String']['input'];
};


export type QueryHelpStationDomainOwnershipArgs = {
  domainName: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};


export type QueryHelpStationDomainStatusArgs = {
  domainName: Scalars['String']['input'];
};


export type QueryHelpStationFindUserByIdOrEmailArgs = {
  email?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHelpStationListWorkspacesByIdsArgs = {
  ids: Array<Scalars['String']['input']>;
};


export type QueryHelpStationLookupDomainArgs = {
  domainName: Scalars['String']['input'];
};


export type QueryHelpStationLookupThreadArgs = {
  slug: Scalars['String']['input'];
};


export type QueryHelpStationNetworkConnectionsArgs = {
  endDate?: InputMaybe<Scalars['String']['input']>;
  environmentId: Scalars['String']['input'];
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  serviceId?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHelpStationNetworkFlowLogsArgs = {
  endDate?: InputMaybe<Scalars['String']['input']>;
  environmentId: Scalars['String']['input'];
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  serviceId?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHelpStationProjectVolumesArgs = {
  environmentId?: InputMaybe<Scalars['String']['input']>;
  projectId: Scalars['String']['input'];
};


export type QueryHelpStationSearchWorkspacesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
};


export type QueryHelpStationServiceLogsArgs = {
  deploymentId?: InputMaybe<Scalars['String']['input']>;
  endDate?: InputMaybe<Scalars['String']['input']>;
  environmentId?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  serviceId?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHelpStationSlackThreadContextArgs = {
  slackChannelId: Scalars['String']['input'];
};


export type QueryHelpStationThreadContextArgs = {
  userIds: Array<Scalars['String']['input']>;
};


export type QueryHelpStationThreadTemplateArgs = {
  serviceId: Scalars['String']['input'];
};


export type QueryHelpStationUsageBreakdownArgs = {
  userIds: Array<Scalars['String']['input']>;
};


export type QueryHelpStationUserDomainsArgs = {
  workspaceIds: Array<Scalars['String']['input']>;
};


export type QueryHelpStationWorkspaceContextArgs = {
  workspaceId: Scalars['String']['input'];
};


export type QueryHelpStationWorkspaceLimitsArgs = {
  workspaceId: Scalars['String']['input'];
};


export type QueryHelpStationWorkspaceRailwayDomainsArgs = {
  workspaceId: Scalars['String']['input'];
};


export type QueryHelpStationWorkspaceServicesArgs = {
  workspaceIds: Array<Scalars['String']['input']>;
};


export type QueryHelpStationWorkspaceServicesV2Args = {
  workspaceIds: Array<Scalars['String']['input']>;
};


export type QueryHttpDurationMetricsArgs = {
  endDate: Scalars['DateTime']['input'];
  environmentId: Scalars['String']['input'];
  method?: InputMaybe<Scalars['String']['input']>;
  path?: InputMaybe<Scalars['String']['input']>;
  serviceId: Scalars['String']['input'];
  startDate: Scalars['DateTime']['input'];
  statusCode?: InputMaybe<Scalars['Int']['input']>;
  stepSeconds?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryHttpLogsArgs = {
  afterDate?: InputMaybe<Scalars['String']['input']>;
  afterLimit?: InputMaybe<Scalars['Int']['input']>;
  anchorDate?: InputMaybe<Scalars['String']['input']>;
  beforeDate?: InputMaybe<Scalars['String']['input']>;
  beforeLimit?: InputMaybe<Scalars['Int']['input']>;
  deploymentId: Scalars['String']['input'];
  endDate?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
};


export type QueryHttpMetricsArgs = {
  endDate: Scalars['DateTime']['input'];
  environmentId: Scalars['String']['input'];
  method?: InputMaybe<Scalars['String']['input']>;
  path?: InputMaybe<Scalars['String']['input']>;
  serviceId: Scalars['String']['input'];
  startDate: Scalars['DateTime']['input'];
  statusCode?: InputMaybe<Scalars['Int']['input']>;
  stepSeconds?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryHttpMetricsGroupedByStatusArgs = {
  endDate: Scalars['DateTime']['input'];
  environmentId: Scalars['String']['input'];
  method?: InputMaybe<Scalars['String']['input']>;
  path?: InputMaybe<Scalars['String']['input']>;
  serviceId: Scalars['String']['input'];
  startDate: Scalars['DateTime']['input'];
  stepSeconds?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryIntegrationAuthArgs = {
  provider: Scalars['String']['input'];
  providerId: Scalars['String']['input'];
};


export type QueryIntegrationAuthsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryIntegrationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  projectId: Scalars['String']['input'];
};


export type QueryInviteCodeArgs = {
  code: Scalars['String']['input'];
};


export type QueryIsMonorepoArgs = {
  branch: Scalars['String']['input'];
  fullRepoName: Scalars['String']['input'];
};


export type QueryListDeploymentInstancesForStackerArgs = {
  stackerId: Scalars['String']['input'];
};


export type QueryLogsAttributesArgs = {
  endDate?: InputMaybe<Scalars['String']['input']>;
  environmentId: Scalars['String']['input'];
  filter?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
};


export type QueryLogsHistogramArgs = {
  endDate?: InputMaybe<Scalars['String']['input']>;
  environmentId: Scalars['String']['input'];
  filter?: InputMaybe<Scalars['String']['input']>;
  maxBuckets?: InputMaybe<Scalars['Int']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
};


export type QueryLogsLimitsArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryMaintainerTemplatesArgs = {
  maintainerSlug: Scalars['String']['input'];
};


export type QueryMetricsArgs = {
  averagingWindowSeconds?: InputMaybe<Scalars['Int']['input']>;
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  environmentId?: InputMaybe<Scalars['String']['input']>;
  groupBy?: InputMaybe<Array<MetricTag>>;
  includeDeleted?: InputMaybe<Scalars['Boolean']['input']>;
  measurements: Array<MetricMeasurement>;
  pluginId?: InputMaybe<Scalars['String']['input']>;
  projectId?: InputMaybe<Scalars['String']['input']>;
  sampleRateSeconds?: InputMaybe<Scalars['Int']['input']>;
  serviceId?: InputMaybe<Scalars['String']['input']>;
  startDate: Scalars['DateTime']['input'];
  teamId?: InputMaybe<Scalars['String']['input']>;
  volumeId?: InputMaybe<Scalars['String']['input']>;
  volumeInstanceExternalId?: InputMaybe<Scalars['String']['input']>;
  workspaceId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMigrateStackerProgressArgs = {
  migrationId: Scalars['String']['input'];
  stackerId: Scalars['String']['input'];
};


export type QueryMongoCollectionDataArgs = {
  database: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  name: Scalars['String']['input'];
  offset?: InputMaybe<Scalars['Int']['input']>;
  serviceId: Scalars['String']['input'];
};


export type QueryMongoCollectionNamesArgs = {
  database: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type QueryMongoDatabaseNamesArgs = {
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type QueryMonorepoImportStatusArgs = {
  environmentId: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
};


export type QueryNetworkConnectionsArgs = {
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  environmentId: Scalars['String']['input'];
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  serviceId?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['DateTime']['input']>;
};


export type QueryNetworkFlowLogsArgs = {
  afterDate?: InputMaybe<Scalars['String']['input']>;
  afterLimit?: InputMaybe<Scalars['Int']['input']>;
  anchorDate?: InputMaybe<Scalars['String']['input']>;
  beforeDate?: InputMaybe<Scalars['String']['input']>;
  beforeLimit?: InputMaybe<Scalars['Int']['input']>;
  environmentId: Scalars['String']['input'];
  filter?: InputMaybe<Scalars['String']['input']>;
  serviceId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryNetworkFlowServiceLayerArgs = {
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  environmentId: Scalars['String']['input'];
  startDate?: InputMaybe<Scalars['DateTime']['input']>;
};


export type QueryNotificationDeliveriesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<NotificationDeliveryFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryNotificationDeliveryArgs = {
  id: Scalars['String']['input'];
};


export type QueryNotificationInstancesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter: NotificationInstanceFilterInput;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryNotificationRulesArgs = {
  projectId?: InputMaybe<Scalars['String']['input']>;
  workspaceId: Scalars['String']['input'];
};


export type QueryNotificationUserFiltersArgs = {
  token?: InputMaybe<Scalars['String']['input']>;
};


export type QueryOauthAuthorizedAppArgs = {
  id: Scalars['String']['input'];
};


export type QueryOauthClientArgs = {
  id: Scalars['String']['input'];
};


export type QueryOauthClientsArgs = {
  workspaceId: Scalars['String']['input'];
};


export type QueryObservabilityDashboardItemsArgs = {
  dashboardId?: InputMaybe<Scalars['String']['input']>;
  environmentId: Scalars['String']['input'];
  resourceId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryObservabilityDashboardsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  environmentId: Scalars['String']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryPasskeysArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryPluginArgs = {
  id: Scalars['String']['input'];
};


export type QueryPluginLogsArgs = {
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  environmentId: Scalars['String']['input'];
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  pluginId: Scalars['String']['input'];
  startDate?: InputMaybe<Scalars['DateTime']['input']>;
};


export type QueryPreferencesArgs = {
  token?: InputMaybe<Scalars['String']['input']>;
};


export type QueryPrivateNetworkEndpointArgs = {
  environmentId: Scalars['String']['input'];
  privateNetworkId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type QueryPrivateNetworkEndpointNameAvailableArgs = {
  environmentId: Scalars['String']['input'];
  prefix: Scalars['String']['input'];
  privateNetworkId: Scalars['String']['input'];
};


export type QueryPrivateNetworksArgs = {
  environmentId: Scalars['String']['input'];
};


export type QueryProjectArgs = {
  id: Scalars['String']['input'];
};


export type QueryProjectComplianceArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryProjectInvitationArgs = {
  code: Scalars['String']['input'];
};


export type QueryProjectInvitationsArgs = {
  id: Scalars['String']['input'];
};


export type QueryProjectInviteCodeArgs = {
  projectId: Scalars['String']['input'];
  role: ProjectRole;
};


export type QueryProjectMembersArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryProjectResourceAccessArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryProjectTokensArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  projectId: Scalars['String']['input'];
};


export type QueryProjectWorkspaceMembersArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryProjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  includeDeleted?: InputMaybe<Scalars['Boolean']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<ProjectsOrderBy>;
  teamId?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
  workspaceId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryProjectsByIdsArgs = {
  ids: Array<Scalars['String']['input']>;
};


export type QueryRailwayDomainArgs = {
  id: Scalars['String']['input'];
};


export type QueryRailwayDomainByNameArgs = {
  domain: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};


export type QueryRailwayDomainDnsRecordsArgs = {
  domain: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};


export type QueryRailwayDomainsArgs = {
  status?: InputMaybe<RailwayDomainStatus>;
  workspaceId: Scalars['String']['input'];
};


export type QueryRedisGetKeyArgs = {
  environmentId: Scalars['String']['input'];
  key: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type QueryRedisKeysArgs = {
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type QueryRedisScanKeysArgs = {
  cursor?: InputMaybe<Scalars['Int']['input']>;
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type QueryReferralInfoArgs = {
  workspaceId: Scalars['String']['input'];
};


export type QueryReferralPayoutsTotalArgs = {
  customerId: Scalars['String']['input'];
};


export type QueryRegionsArgs = {
  projectId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryReplicaMetricsArgs = {
  averagingWindowSeconds?: InputMaybe<Scalars['Int']['input']>;
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  environmentId: Scalars['String']['input'];
  measurements: Array<MetricMeasurement>;
  sampleRateSeconds?: InputMaybe<Scalars['Int']['input']>;
  serviceId: Scalars['String']['input'];
  startDate: Scalars['DateTime']['input'];
};


export type QueryResourceAccessArgs = {
  explicitResourceOwner: ExplicitOwnerInput;
};


export type QuerySandboxArgs = {
  environmentId: Scalars['String']['input'];
  id: Scalars['String']['input'];
};


export type QuerySandboxTemplateArgs = {
  environmentId: Scalars['String']['input'];
  id: Scalars['ID']['input'];
};


export type QuerySandboxesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  environmentId: Scalars['String']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerySearchTemplatesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  recommended?: InputMaybe<Scalars['Boolean']['input']>;
  search: Scalars['String']['input'];
  verified?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryServiceArgs = {
  id: Scalars['String']['input'];
};


export type QueryServiceDomainAvailableArgs = {
  domain: Scalars['String']['input'];
};


export type QueryServiceInstanceArgs = {
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type QueryServiceInstanceAutoDeployStatusArgs = {
  environmentId: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type QueryServiceInstanceIsUpdatableArgs = {
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type QueryServiceInstanceLimitOverrideArgs = {
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type QueryServiceInstanceLimitsArgs = {
  environmentId: Scalars['String']['input'];
  projectId?: InputMaybe<Scalars['String']['input']>;
  serviceId: Scalars['String']['input'];
};


export type QueryServiceInstanceRepoAnalysisArgs = {
  environmentId: Scalars['String']['input'];
  rootDirectory?: InputMaybe<Scalars['String']['input']>;
  serviceId: Scalars['String']['input'];
};


export type QuerySessionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerySlackConnectWorkspaceArgs = {
  slackConnectId: Scalars['String']['input'];
};


export type QuerySqlExtensionDependenciesArgs = {
  databaseType: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  extension: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type QuerySqlExtensionDependentsArgs = {
  databaseType: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  extension: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type QuerySqlExtensionsArgs = {
  databaseType: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type QuerySqlTableArgs = {
  databaseType: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  name: Scalars['String']['input'];
  offset?: InputMaybe<Scalars['Int']['input']>;
  serviceId: Scalars['String']['input'];
};


export type QuerySqlTableNamesArgs = {
  databaseType: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type QuerySshPublicKeysArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  workspaceId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryStackerStatsProgressArgs = {
  workflowId: Scalars['String']['input'];
};


export type QuerySupportThreadMessagesArgs = {
  slug: Scalars['String']['input'];
};


export type QueryTcpProxiesArgs = {
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type QueryTeamArgs = {
  id: Scalars['String']['input'];
};


export type QueryTeamTemplatesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  teamId: Scalars['String']['input'];
};


export type QueryTemplateArgs = {
  code?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  owner?: InputMaybe<Scalars['String']['input']>;
  repo?: InputMaybe<Scalars['String']['input']>;
};


export type QueryTemplateMetricsArgs = {
  id: Scalars['String']['input'];
};


export type QueryTemplatePayoutsTotalArgs = {
  customerId: Scalars['String']['input'];
};


export type QueryTemplateSearchArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  includeRankingScoreDetails?: InputMaybe<Scalars['Boolean']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
  verified?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryTemplateSourceForProjectArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryTemplatesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  databasesOnly?: InputMaybe<Scalars['Boolean']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  recommended?: InputMaybe<Scalars['Boolean']['input']>;
  verified?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryTopMetricsArgs = {
  averagingWindowSeconds?: InputMaybe<Scalars['Int']['input']>;
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  limit: Scalars['Int']['input'];
  measurement: MetricMeasurement;
  sampleRateSeconds?: InputMaybe<Scalars['Int']['input']>;
  startDate: Scalars['DateTime']['input'];
};


export type QueryTrustedDomainsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  workspaceId: Scalars['String']['input'];
};


export type QueryTwoFactorStatusArgs = {
  twoFactorLinkingKey?: InputMaybe<Scalars['String']['input']>;
};


export type QueryUnifiedWithdrawalsArgs = {
  customerId: Scalars['String']['input'];
};


export type QueryUnifiedWithdrawalsV2Args = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  customerId: Scalars['String']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryUsageArgs = {
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  groupBy?: InputMaybe<Array<MetricTag>>;
  includeDeleted?: InputMaybe<Scalars['Boolean']['input']>;
  measurements: Array<MetricMeasurement>;
  projectId?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['DateTime']['input']>;
  teamId?: InputMaybe<Scalars['String']['input']>;
  useSmallDateChunks?: InputMaybe<Scalars['Boolean']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
  workspaceId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryUserArgs = {
  userId: Scalars['String']['input'];
};


export type QueryUserGoodStandingArgs = {
  userId: Scalars['String']['input'];
};


export type QueryUserIdForDiscordIdArgs = {
  discordId: Scalars['String']['input'];
};


export type QueryUserKickbackEarningsArgs = {
  userId: Scalars['String']['input'];
};


export type QueryUserProfileArgs = {
  username: Scalars['String']['input'];
};


export type QueryUserRiskLevelArgs = {
  userId: Scalars['String']['input'];
};


export type QueryUserTemplatesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryUsersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  input?: InputMaybe<UsersFilterInput>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryUsersWithClashingIpArgs = {
  userId: Scalars['String']['input'];
};


export type QueryVariablesArgs = {
  environmentId: Scalars['String']['input'];
  pluginId?: InputMaybe<Scalars['String']['input']>;
  projectId: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['String']['input']>;
  unrendered?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryVariablesForEnvironmentArgs = {
  id: Scalars['String']['input'];
  input: VariablesForEnvironmentInput;
};


export type QueryVariablesForServiceDeploymentArgs = {
  environmentId: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};


export type QueryVolumeInstanceArgs = {
  id: Scalars['String']['input'];
};


export type QueryVolumeInstanceBackupListArgs = {
  volumeInstanceId: Scalars['String']['input'];
};


export type QueryVolumeInstanceBackupScheduleListArgs = {
  volumeInstanceId: Scalars['String']['input'];
};


export type QueryWithdrawalAccountStripeConnectLoginLinkArgs = {
  withdrawalAccountId: Scalars['String']['input'];
};


export type QueryWithdrawalAccountStripeConnectOnboardingLinkArgs = {
  withdrawalAccountId: Scalars['String']['input'];
};


export type QueryWithdrawalAccountsArgs = {
  customerId: Scalars['String']['input'];
};


export type QueryWithdrawalAccountsV2Args = {
  customerId: Scalars['String']['input'];
};


export type QueryWithdrawalAvailableBalanceArgs = {
  customerId: Scalars['String']['input'];
};


export type QueryWithdrawalsArgs = {
  customerId: Scalars['String']['input'];
  status?: InputMaybe<WithdrawalStatusType>;
};


export type QueryWithdrawalsToCashArgs = {
  customerId: Scalars['String']['input'];
};


export type QueryWithdrawalsToCreditArgs = {
  customerId: Scalars['String']['input'];
};


export type QueryWorkflowStatusArgs = {
  workflowId: Scalars['String']['input'];
};


export type QueryWorkspaceArgs = {
  workspaceId: Scalars['String']['input'];
};


export type QueryWorkspaceByCodeArgs = {
  code: Scalars['String']['input'];
};


export type QueryWorkspaceGoodStandingArgs = {
  workspaceId: Scalars['String']['input'];
};


export type QueryWorkspaceIdentityProvidersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  workspaceId: Scalars['String']['input'];
};


export type QueryWorkspacePolicyArgs = {
  workspaceId: Scalars['String']['input'];
};


export type QueryWorkspacePolicySelectableDeploySourcesArgs = {
  sourceType: WorkspacePolicyDeploySourceType;
  workspaceId: Scalars['String']['input'];
};


export type QueryWorkspaceTemplatesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  workspaceId: Scalars['String']['input'];
};


export type QueryWorkspaceTopMoversArgs = {
  input: WorkspaceTopMoversInput;
};


export type QueryWorkspacesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  hasPartnerProfile?: InputMaybe<Scalars['Boolean']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  pro?: InputMaybe<Scalars['Boolean']['input']>;
  state?: InputMaybe<Scalars['String']['input']>;
};

export type QueryAdminAllProjectsConnection = {
  __typename?: 'QueryAdminAllProjectsConnection';
  edges: Array<QueryAdminAllProjectsConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryAdminAllProjectsConnectionEdge = {
  __typename?: 'QueryAdminAllProjectsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Project;
};

export type QueryAdminAllServicesConnection = {
  __typename?: 'QueryAdminAllServicesConnection';
  edges: Array<QueryAdminAllServicesConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryAdminAllServicesConnectionEdge = {
  __typename?: 'QueryAdminAllServicesConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Service;
};

export type QueryAdminDeploymentsConnection = {
  __typename?: 'QueryAdminDeploymentsConnection';
  edges: Array<QueryAdminDeploymentsConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryAdminDeploymentsConnectionEdge = {
  __typename?: 'QueryAdminDeploymentsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Deployment;
};

export type QueryAdminOAuthClientsConnection = {
  __typename?: 'QueryAdminOAuthClientsConnection';
  edges: Array<QueryAdminOAuthClientsConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryAdminOAuthClientsConnectionEdge = {
  __typename?: 'QueryAdminOAuthClientsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: AdminOAuthClient;
};

export type QueryAdminReposConnection = {
  __typename?: 'QueryAdminReposConnection';
  edges: Array<QueryAdminReposConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryAdminReposConnectionEdge = {
  __typename?: 'QueryAdminReposConnectionEdge';
  cursor: Scalars['String']['output'];
  node: AdminRepo;
};

export type QueryAdminServicesByTemplateConnection = {
  __typename?: 'QueryAdminServicesByTemplateConnection';
  edges: Array<QueryAdminServicesByTemplateConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryAdminServicesByTemplateConnectionEdge = {
  __typename?: 'QueryAdminServicesByTemplateConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Service;
};

export type QueryApiTokensConnection = {
  __typename?: 'QueryApiTokensConnection';
  edges: Array<QueryApiTokensConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryApiTokensConnectionEdge = {
  __typename?: 'QueryApiTokensConnectionEdge';
  cursor: Scalars['String']['output'];
  node: ApiToken;
};

export type QueryAuditLogsConnection = {
  __typename?: 'QueryAuditLogsConnection';
  edges: Array<QueryAuditLogsConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryAuditLogsConnectionEdge = {
  __typename?: 'QueryAuditLogsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: AuditLog;
};

export type QueryBanReasonHistoryConnection = {
  __typename?: 'QueryBanReasonHistoryConnection';
  edges: Array<QueryBanReasonHistoryConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryBanReasonHistoryConnectionEdge = {
  __typename?: 'QueryBanReasonHistoryConnectionEdge';
  cursor: Scalars['String']['output'];
  node: BanReasonHistory;
};

export type QueryDeploymentEventsConnection = {
  __typename?: 'QueryDeploymentEventsConnection';
  edges: Array<QueryDeploymentEventsConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryDeploymentEventsConnectionEdge = {
  __typename?: 'QueryDeploymentEventsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: DeploymentEvent;
};

export type QueryDeploymentInstanceExecutionsConnection = {
  __typename?: 'QueryDeploymentInstanceExecutionsConnection';
  edges: Array<QueryDeploymentInstanceExecutionsConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryDeploymentInstanceExecutionsConnectionEdge = {
  __typename?: 'QueryDeploymentInstanceExecutionsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: DeploymentInstanceExecution;
};

export type QueryDeploymentTriggersConnection = {
  __typename?: 'QueryDeploymentTriggersConnection';
  edges: Array<QueryDeploymentTriggersConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryDeploymentTriggersConnectionEdge = {
  __typename?: 'QueryDeploymentTriggersConnectionEdge';
  cursor: Scalars['String']['output'];
  node: DeploymentTrigger;
};

export type QueryDeploymentsConnection = {
  __typename?: 'QueryDeploymentsConnection';
  edges: Array<QueryDeploymentsConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryDeploymentsConnectionEdge = {
  __typename?: 'QueryDeploymentsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Deployment;
};

export type QueryEnvironmentPatchesConnection = {
  __typename?: 'QueryEnvironmentPatchesConnection';
  edges: Array<QueryEnvironmentPatchesConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryEnvironmentPatchesConnectionEdge = {
  __typename?: 'QueryEnvironmentPatchesConnectionEdge';
  cursor: Scalars['String']['output'];
  node: EnvironmentPatch;
};

export type QueryEnvironmentsConnection = {
  __typename?: 'QueryEnvironmentsConnection';
  edges: Array<QueryEnvironmentsConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryEnvironmentsConnectionEdge = {
  __typename?: 'QueryEnvironmentsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Environment;
};

export type QueryEventsConnection = {
  __typename?: 'QueryEventsConnection';
  edges: Array<QueryEventsConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryEventsConnectionEdge = {
  __typename?: 'QueryEventsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Event;
};

export type QueryGetPublishedTemplatesForSupportMetricsConnection = {
  __typename?: 'QueryGetPublishedTemplatesForSupportMetricsConnection';
  edges: Array<QueryGetPublishedTemplatesForSupportMetricsConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryGetPublishedTemplatesForSupportMetricsConnectionEdge = {
  __typename?: 'QueryGetPublishedTemplatesForSupportMetricsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Template;
};

export type QueryGithubRepoSearch2Connection = {
  __typename?: 'QueryGithubRepoSearch2Connection';
  edges: Array<QueryGithubRepoSearch2ConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryGithubRepoSearch2ConnectionEdge = {
  __typename?: 'QueryGithubRepoSearch2ConnectionEdge';
  cursor: Scalars['String']['output'];
  node: UserGithubRepo;
};

export type QueryIntegrationAuthsConnection = {
  __typename?: 'QueryIntegrationAuthsConnection';
  edges: Array<QueryIntegrationAuthsConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryIntegrationAuthsConnectionEdge = {
  __typename?: 'QueryIntegrationAuthsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: IntegrationAuth;
};

export type QueryIntegrationsConnection = {
  __typename?: 'QueryIntegrationsConnection';
  edges: Array<QueryIntegrationsConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryIntegrationsConnectionEdge = {
  __typename?: 'QueryIntegrationsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Integration;
};

export type QueryNotificationDeliveriesConnection = {
  __typename?: 'QueryNotificationDeliveriesConnection';
  edges: Array<QueryNotificationDeliveriesConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryNotificationDeliveriesConnectionEdge = {
  __typename?: 'QueryNotificationDeliveriesConnectionEdge';
  cursor: Scalars['String']['output'];
  node: NotificationDelivery;
};

export type QueryNotificationInstancesConnection = {
  __typename?: 'QueryNotificationInstancesConnection';
  edges: Array<QueryNotificationInstancesConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryNotificationInstancesConnectionEdge = {
  __typename?: 'QueryNotificationInstancesConnectionEdge';
  cursor: Scalars['String']['output'];
  node: NotificationInstance;
};

export type QueryObservabilityDashboardsConnection = {
  __typename?: 'QueryObservabilityDashboardsConnection';
  edges: Array<QueryObservabilityDashboardsConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryObservabilityDashboardsConnectionEdge = {
  __typename?: 'QueryObservabilityDashboardsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: ObservabilityDashboard;
};

export type QueryPasskeysConnection = {
  __typename?: 'QueryPasskeysConnection';
  edges: Array<QueryPasskeysConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryPasskeysConnectionEdge = {
  __typename?: 'QueryPasskeysConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Passkey;
};

export type QueryProjectTokensConnection = {
  __typename?: 'QueryProjectTokensConnection';
  edges: Array<QueryProjectTokensConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryProjectTokensConnectionEdge = {
  __typename?: 'QueryProjectTokensConnectionEdge';
  cursor: Scalars['String']['output'];
  node: ProjectToken;
};

export type QueryProjectsConnection = {
  __typename?: 'QueryProjectsConnection';
  edges: Array<QueryProjectsConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryProjectsConnectionEdge = {
  __typename?: 'QueryProjectsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Project;
};

export type QuerySandboxesConnection = {
  __typename?: 'QuerySandboxesConnection';
  edges: Array<QuerySandboxesConnectionEdge>;
  pageInfo: PageInfo;
};

export type QuerySandboxesConnectionEdge = {
  __typename?: 'QuerySandboxesConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Sandbox;
};

export type QuerySearchTemplatesConnection = {
  __typename?: 'QuerySearchTemplatesConnection';
  edges: Array<QuerySearchTemplatesConnectionEdge>;
  pageInfo: PageInfo;
};

export type QuerySearchTemplatesConnectionEdge = {
  __typename?: 'QuerySearchTemplatesConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Template;
};

export type QuerySessionsConnection = {
  __typename?: 'QuerySessionsConnection';
  edges: Array<QuerySessionsConnectionEdge>;
  pageInfo: PageInfo;
};

export type QuerySessionsConnectionEdge = {
  __typename?: 'QuerySessionsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Session;
};

export type QuerySshPublicKeysConnection = {
  __typename?: 'QuerySshPublicKeysConnection';
  edges: Array<QuerySshPublicKeysConnectionEdge>;
  pageInfo: PageInfo;
};

export type QuerySshPublicKeysConnectionEdge = {
  __typename?: 'QuerySshPublicKeysConnectionEdge';
  cursor: Scalars['String']['output'];
  node: SshPublicKey;
};

export type QueryTeamTemplatesConnection = {
  __typename?: 'QueryTeamTemplatesConnection';
  edges: Array<QueryTeamTemplatesConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryTeamTemplatesConnectionEdge = {
  __typename?: 'QueryTeamTemplatesConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Template;
};

export type QueryTemplateSearchConnection = {
  __typename?: 'QueryTemplateSearchConnection';
  edges: Array<QueryTemplateSearchConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryTemplateSearchConnectionEdge = {
  __typename?: 'QueryTemplateSearchConnectionEdge';
  cursor: Scalars['String']['output'];
  node: TemplateSearchResult;
};

export type QueryTemplatesConnection = {
  __typename?: 'QueryTemplatesConnection';
  edges: Array<QueryTemplatesConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryTemplatesConnectionEdge = {
  __typename?: 'QueryTemplatesConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Template;
};

export type QueryTrustedDomainsConnection = {
  __typename?: 'QueryTrustedDomainsConnection';
  edges: Array<QueryTrustedDomainsConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryTrustedDomainsConnectionEdge = {
  __typename?: 'QueryTrustedDomainsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: TrustedDomain;
};

export type QueryUnifiedWithdrawalsV2Connection = {
  __typename?: 'QueryUnifiedWithdrawalsV2Connection';
  edges: Array<QueryUnifiedWithdrawalsV2ConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryUnifiedWithdrawalsV2ConnectionEdge = {
  __typename?: 'QueryUnifiedWithdrawalsV2ConnectionEdge';
  cursor: Scalars['String']['output'];
  node: UnifiedWithdrawal;
};

export type QueryUserTemplatesConnection = {
  __typename?: 'QueryUserTemplatesConnection';
  edges: Array<QueryUserTemplatesConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryUserTemplatesConnectionEdge = {
  __typename?: 'QueryUserTemplatesConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Template;
};

export type QueryUsersConnection = {
  __typename?: 'QueryUsersConnection';
  edges: Array<QueryUsersConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryUsersConnectionEdge = {
  __typename?: 'QueryUsersConnectionEdge';
  cursor: Scalars['String']['output'];
  node: User;
};

export type QueryWorkspaceIdentityProvidersConnection = {
  __typename?: 'QueryWorkspaceIdentityProvidersConnection';
  edges: Array<QueryWorkspaceIdentityProvidersConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryWorkspaceIdentityProvidersConnectionEdge = {
  __typename?: 'QueryWorkspaceIdentityProvidersConnectionEdge';
  cursor: Scalars['String']['output'];
  node: WorkspaceIdentityProvider;
};

export type QueryWorkspaceTemplatesConnection = {
  __typename?: 'QueryWorkspaceTemplatesConnection';
  edges: Array<QueryWorkspaceTemplatesConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryWorkspaceTemplatesConnectionEdge = {
  __typename?: 'QueryWorkspaceTemplatesConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Template;
};

export type QueryWorkspacesConnection = {
  __typename?: 'QueryWorkspacesConnection';
  edges: Array<QueryWorkspacesConnectionEdge>;
  pageInfo: PageInfo;
};

export type QueryWorkspacesConnectionEdge = {
  __typename?: 'QueryWorkspacesConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Workspace;
};

export type RadarAction =
  | 'ALLOW'
  | 'BAN'
  | 'BLOCK'
  | 'RESTRICT'
  | 'REVIEW';

export type RadarActionResult = {
  __typename?: 'RadarActionResult';
  workflowId?: Maybe<Scalars['String']['output']>;
};

export type RadarAttributeDefinition = {
  __typename?: 'RadarAttributeDefinition';
  description: Scalars['String']['output'];
  name: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type RadarEvent = Node & {
  __typename?: 'RadarEvent';
  attributes: Scalars['JSON']['output'];
  createdAt: Scalars['DateTime']['output'];
  deployment?: Maybe<Deployment>;
  deploymentId?: Maybe<Scalars['String']['output']>;
  environment?: Maybe<Environment>;
  environmentId?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  note?: Maybe<Scalars['String']['output']>;
  project?: Maybe<Project>;
  projectId?: Maybe<Scalars['String']['output']>;
  reviewedAt?: Maybe<Scalars['DateTime']['output']>;
  reviewedBy?: Maybe<RadarEventUser>;
  reviewedById?: Maybe<Scalars['String']['output']>;
  rule: RadarRule;
  ruleId: Scalars['String']['output'];
  service?: Maybe<Service>;
  serviceId?: Maybe<Scalars['String']['output']>;
  status: RadarEventStatus;
  updatedAt: Scalars['DateTime']['output'];
  user?: Maybe<RadarEventUser>;
  userId?: Maybe<Scalars['String']['output']>;
  workspace: Workspace;
  workspaceId: Scalars['String']['output'];
};

export type RadarEventStatus =
  | 'BANNED'
  | 'BLOCKED'
  | 'PENDING_REVIEW'
  | 'RESTRICTED'
  | 'SKIPPED';

export type RadarEventUser = {
  __typename?: 'RadarEventUser';
  avatar?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
};

export type RadarList = Node & {
  __typename?: 'RadarList';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  items: Array<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type RadarListUpsertInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  items: Array<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type RadarMatchedRule = {
  __typename?: 'RadarMatchedRule';
  action: Scalars['String']['output'];
  ruleId: Scalars['String']['output'];
  ruleName: Scalars['String']['output'];
};

export type RadarMode =
  | 'AUTO'
  | 'MANUAL';

export type RadarRule = Node & {
  __typename?: 'RadarRule';
  action: RadarAction;
  actionReason?: Maybe<Scalars['String']['output']>;
  condition: Scalars['JSON']['output'];
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  enabled: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  mode: RadarMode;
  name: Scalars['String']['output'];
  priority: Scalars['Int']['output'];
  restrictionType?: Maybe<RestrictionType>;
  updatedAt: Scalars['DateTime']['output'];
};

export type RadarRuleUpsertInput = {
  action: RadarAction;
  actionReason?: InputMaybe<Scalars['String']['input']>;
  condition: Scalars['JSON']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  enabled: Scalars['Boolean']['input'];
  id?: InputMaybe<Scalars['String']['input']>;
  mode: RadarMode;
  name: Scalars['String']['input'];
  priority: Scalars['Int']['input'];
  restrictionType?: InputMaybe<RestrictionType>;
};

export type RadarScanMatch = {
  __typename?: 'RadarScanMatch';
  attributes: Scalars['JSON']['output'];
  banReason?: Maybe<Scalars['String']['output']>;
  candidateId: Scalars['String']['output'];
  environmentId?: Maybe<Scalars['String']['output']>;
  isRestricted: Scalars['Boolean']['output'];
  matchedRules: Array<RadarMatchedRule>;
  projectId?: Maybe<Scalars['String']['output']>;
  projectName?: Maybe<Scalars['String']['output']>;
  serviceId?: Maybe<Scalars['String']['output']>;
  serviceName?: Maybe<Scalars['String']['output']>;
  sourceImage?: Maybe<Scalars['String']['output']>;
  sourceRepo?: Maybe<Scalars['String']['output']>;
  verdict: Scalars['String']['output'];
  workspaceId: Scalars['String']['output'];
  workspaceName?: Maybe<Scalars['String']['output']>;
};

export type RadarScanMatchesResult = {
  __typename?: 'RadarScanMatchesResult';
  hasMore: Scalars['Boolean']['output'];
  matches: Array<RadarScanMatch>;
  totalCount: Scalars['Int']['output'];
};

export type RadarScanStatus = {
  __typename?: 'RadarScanStatus';
  appliedCount: Scalars['Int']['output'];
  appliedFailedCount: Scalars['Int']['output'];
  appliedSkippedCount: Scalars['Int']['output'];
  bannedMatchCount: Scalars['Int']['output'];
  candidatesEvaluated: Scalars['Int']['output'];
  completedAt?: Maybe<Scalars['String']['output']>;
  matchCount: Scalars['Int']['output'];
  matchesCapped: Scalars['Boolean']['output'];
  scanType?: Maybe<Scalars['String']['output']>;
  startedAt?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  timeRangeEnd?: Maybe<Scalars['String']['output']>;
  timeRangeStart?: Maybe<Scalars['String']['output']>;
};

export type RadarScanType =
  | 'SERVICE'
  | 'WORKSPACE';

export type RailwayDomain = {
  __typename?: 'RailwayDomain';
  autoRenewEnabled: Scalars['Boolean']['output'];
  connectedServiceInstances: Array<ConnectedServiceInstance>;
  createdAt: Scalars['DateTime']['output'];
  domain: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isRefundable: Scalars['Boolean']['output'];
  isTransferEligible: Scalars['Boolean']['output'];
  /** Authoritative nameservers currently delegated for this domain at the registrar. */
  nameservers: RailwayDomainNameservers;
  nextBillingDate?: Maybe<Scalars['DateTime']['output']>;
  purchasePrice: Scalars['Int']['output'];
  registrationYears: Scalars['Int']['output'];
  renewalPrice: Scalars['Int']['output'];
  status: RailwayDomainStatus;
  stripeStatus?: Maybe<SubscriptionState>;
  stripeSubscriptionId?: Maybe<Scalars['String']['output']>;
  transferEligibleAt: Scalars['DateTime']['output'];
  workspaceId: Scalars['String']['output'];
  workspaceName?: Maybe<Scalars['String']['output']>;
};

export type RailwayDomainCancelPurchaseInput = {
  railwayDomainId: Scalars['String']['input'];
};

export type RailwayDomainCompletePurchaseInput = {
  environmentId?: InputMaybe<Scalars['String']['input']>;
  projectId?: InputMaybe<Scalars['String']['input']>;
  railwayDomainId: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['String']['input']>;
  targetPort?: InputMaybe<Scalars['Int']['input']>;
};

export type RailwayDomainDnsRecord = {
  __typename?: 'RailwayDomainDnsRecord';
  answer: Scalars['String']['output'];
  domainName: Scalars['String']['output'];
  fqdn: Scalars['String']['output'];
  host: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  priority?: Maybe<Scalars['Int']['output']>;
  ttl: Scalars['Int']['output'];
  type: RailwayDomainDnsRecordType;
};

export type RailwayDomainDnsRecordCreateInput = {
  answer: Scalars['String']['input'];
  domain: Scalars['String']['input'];
  host: Scalars['String']['input'];
  priority?: InputMaybe<Scalars['Int']['input']>;
  ttl?: InputMaybe<Scalars['Int']['input']>;
  type: RailwayDomainDnsRecordType;
  workspaceId: Scalars['String']['input'];
};

export type RailwayDomainDnsRecordDeleteInput = {
  domain: Scalars['String']['input'];
  recordId: Scalars['Int']['input'];
  workspaceId: Scalars['String']['input'];
};

export type RailwayDomainDnsRecordType =
  | 'A'
  | 'AAAA'
  | 'ANAME'
  | 'CNAME'
  | 'MX'
  | 'NS'
  | 'SRV'
  | 'TXT';

export type RailwayDomainDnsRecordUpdateInput = {
  answer: Scalars['String']['input'];
  domain: Scalars['String']['input'];
  host: Scalars['String']['input'];
  priority?: InputMaybe<Scalars['Int']['input']>;
  recordId: Scalars['Int']['input'];
  ttl?: InputMaybe<Scalars['Int']['input']>;
  type: RailwayDomainDnsRecordType;
  workspaceId: Scalars['String']['input'];
};

export type RailwayDomainInitiateTransferOutInput = {
  id: Scalars['String']['input'];
};

export type RailwayDomainNameservers = {
  __typename?: 'RailwayDomainNameservers';
  /** True when the domain is delegated to Name.com's nameservers (Railway-managed DNS). */
  isDefault: Scalars['Boolean']['output'];
  nameservers: Array<Scalars['String']['output']>;
};

export type RailwayDomainNameserversSetInput = {
  id: Scalars['String']['input'];
  /** Hostnames of the nameservers to delegate to (2-13). Pass an empty list to reset to Name.com's account-level defaults for this domain. */
  nameservers: Array<Scalars['String']['input']>;
};

export type RailwayDomainPurchaseInput = {
  domain: Scalars['String']['input'];
  environmentId?: InputMaybe<Scalars['String']['input']>;
  paymentMethodId?: InputMaybe<Scalars['String']['input']>;
  projectId?: InputMaybe<Scalars['String']['input']>;
  purchasePrice: Scalars['Float']['input'];
  serviceId?: InputMaybe<Scalars['String']['input']>;
  targetPort?: InputMaybe<Scalars['Int']['input']>;
  workspaceId: Scalars['String']['input'];
  years?: InputMaybe<Scalars['Int']['input']>;
};

export type RailwayDomainPurchaseResult = {
  __typename?: 'RailwayDomainPurchaseResult';
  paymentIntentClientSecret?: Maybe<Scalars['String']['output']>;
  railwayDomainId: Scalars['String']['output'];
};

export type RailwayDomainStatus =
  | 'ACTIVE'
  | 'EXPIRED'
  | 'PURCHASING'
  | 'REFUNDED';

export type RailwayDomainTransferOutResult = {
  __typename?: 'RailwayDomainTransferOutResult';
  authCode: Scalars['String']['output'];
};

export type RailwayDomainUpdateInput = {
  autoRenewEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['String']['input'];
};

export type RecoveryCodeValidateInput = {
  code: Scalars['String']['input'];
  twoFactorLinkingKey?: InputMaybe<Scalars['String']['input']>;
};

export type RecoveryCodes = {
  __typename?: 'RecoveryCodes';
  recoveryCodes: Array<Scalars['String']['output']>;
};

export type RedisKey = {
  __typename?: 'RedisKey';
  name: Scalars['String']['output'];
  ttl?: Maybe<Scalars['BigInt']['output']>;
  type: Scalars['String']['output'];
};

export type RedisScanKeys = {
  __typename?: 'RedisScanKeys';
  count: Scalars['Int']['output'];
  cursor: Scalars['Int']['output'];
  keys: Array<RedisKey>;
};

export type ReferralInfo = Node & {
  __typename?: 'ReferralInfo';
  code: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  referralStats: ReferralStats;
  status: Scalars['String']['output'];
};

export type ReferralInfoUpdateInput = {
  code: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};

export type ReferralStats = {
  __typename?: 'ReferralStats';
  credited: Scalars['Int']['output'];
  pending: Scalars['Int']['output'];
};

export type ReferralStatus =
  | 'REFEREE_CREDITED'
  | 'REFERRER_CREDITED'
  | 'REGISTERED';

export type ReferralUser = {
  __typename?: 'ReferralUser';
  code: Scalars['String']['output'];
  id: Scalars['String']['output'];
  status: ReferralStatus;
};

export type RefreshGithubReposCacheResult = {
  __typename?: 'RefreshGithubReposCacheResult';
  jobId?: Maybe<Scalars['String']['output']>;
};

export type RefundFormInput = {
  message: Scalars['String']['input'];
  stripeInvoiceId: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};

export type RefundRequest = Node & {
  __typename?: 'RefundRequest';
  amount: Scalars['Int']['output'];
  decision?: Maybe<RefundRequestDecisionEnum>;
  id: Scalars['ID']['output'];
  invoiceId: Scalars['String']['output'];
  plainThreadId?: Maybe<Scalars['String']['output']>;
  reason: Scalars['String']['output'];
  userId?: Maybe<Scalars['String']['output']>;
  workspace: Workspace;
};

/** Possible decisions for a RefundRequest */
export type RefundRequestDecisionEnum =
  | 'AUTO_REFUNDED'
  | 'AUTO_REJECTED'
  | 'MANUALLY_REFUNDED';

export type Region = {
  __typename?: 'Region';
  /** Region country */
  country: Scalars['String']['output'];
  deploymentConstraints?: Maybe<RegionDeploymentConstraints>;
  /** Region ID (airport code) */
  id?: Maybe<Scalars['String']['output']>;
  location: Scalars['String']['output'];
  name: Scalars['String']['output'];
  region?: Maybe<Scalars['String']['output']>;
  workspaceId?: Maybe<Scalars['String']['output']>;
};

export type RegionDeploymentConstraints = {
  __typename?: 'RegionDeploymentConstraints';
  /** Deprecation information for the region */
  deprecationInfo?: Maybe<RegionDeprecationInfo>;
};

export type RegionDeprecationInfo = {
  __typename?: 'RegionDeprecationInfo';
  /** Specifies if the region is deprecated */
  isDeprecated: Scalars['Boolean']['output'];
  /** Replacement region for the deprecated region */
  replacementRegion: Scalars['String']['output'];
};

export type RegistrationStatus =
  | 'ONBOARDED'
  | 'REGISTERED'
  | 'WAITLISTED';

/** Private Docker registry credentials. Only available for Pro plan deployments. */
export type RegistryCredentialsInput = {
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};

export type ReissueInvoiceInput = {
  stripeInvoiceId: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};

export type ReissuedInvoice = Node & {
  __typename?: 'ReissuedInvoice';
  id: Scalars['ID']['output'];
  originalInvoiceId: Scalars['String']['output'];
  reissuedInvoiceId?: Maybe<Scalars['String']['output']>;
  workspace: Workspace;
  workspaceId: Scalars['String']['output'];
};

export type RemoveServiceInstanceLimitOverrideInput = {
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};

export type ReplicateVolumeInstanceSnapshotStatus =
  | 'COMPLETED'
  | 'FAILED'
  | 'INITIATED'
  | 'TRANSFERRING'
  | 'UNRECOGNIZED';

/** The status of a volume instance replication */
export type ReplicateVolumeInstanceStatus =
  | 'COMPLETED'
  | 'ERROR'
  | 'QUEUED'
  | 'TRANSFERRING_OFFLINE'
  | 'TRANSFERRING_ONLINE';

export type RepoAnalysis = {
  __typename?: 'RepoAnalysis';
  monorepo?: Maybe<RepoAnalysisMonorepoInfo>;
  services: Array<RepoAnalysisDiscoveredService>;
};

export type RepoAnalysisBuild =
  | 'FROM_IMAGE'
  | 'FROM_SOURCE';

export type RepoAnalysisBuildConfig = {
  __typename?: 'RepoAnalysisBuildConfig';
  dockerfilePath?: Maybe<Scalars['String']['output']>;
};

export type RepoAnalysisConfigRef = {
  __typename?: 'RepoAnalysisConfigRef';
  path: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type RepoAnalysisDiscoveredService = {
  __typename?: 'RepoAnalysisDiscoveredService';
  /** @deprecated Use source.image to determine build type */
  build: RepoAnalysisBuild;
  buildCommand?: Maybe<Scalars['String']['output']>;
  buildConfig?: Maybe<RepoAnalysisBuildConfig>;
  /** @deprecated Use source.rootDirectory instead */
  buildPath: Scalars['String']['output'];
  configs: Array<RepoAnalysisConfigRef>;
  dir?: Maybe<Scalars['String']['output']>;
  healthcheckPath?: Maybe<Scalars['String']['output']>;
  /** @deprecated Use source.image instead */
  image: Scalars['String']['output'];
  name: Scalars['String']['output'];
  network: RepoAnalysisNetwork;
  preDeployCommand?: Maybe<Scalars['String']['output']>;
  region?: Maybe<Scalars['String']['output']>;
  replicas?: Maybe<Scalars['Int']['output']>;
  resources?: Maybe<RepoAnalysisResourceLimits>;
  restartPolicy?: Maybe<RepoAnalysisRestartPolicy>;
  runtime: RepoAnalysisRuntime;
  schedule?: Maybe<Scalars['String']['output']>;
  source?: Maybe<RepoAnalysisServiceSource>;
  startCommand?: Maybe<Scalars['String']['output']>;
  variables: Array<RepoAnalysisEnvVariable>;
  volumes: Array<RepoAnalysisVolume>;
};

export type RepoAnalysisEnvType =
  | 'BOOLEAN'
  | 'NUMERIC'
  | 'SECRET'
  | 'STRING'
  | 'URL'
  | 'UUID';

export type RepoAnalysisEnvVariable = {
  __typename?: 'RepoAnalysisEnvVariable';
  confidence: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  secretMetadata?: Maybe<RepoAnalysisSecretMetadata>;
  sensitive: Scalars['Boolean']['output'];
  source: RepoAnalysisConfigRef;
  type: RepoAnalysisEnvType;
  useCase: RepoAnalysisUseCase;
  value: Scalars['String']['output'];
};

export type RepoAnalysisMonorepoInfo = {
  __typename?: 'RepoAnalysisMonorepoInfo';
  configs: Array<RepoAnalysisConfigRef>;
  services: Scalars['RepoAnalysisMonorepoServices']['output'];
  tool?: Maybe<RepoAnalysisMonorepoTool>;
  type: RepoAnalysisMonorepoType;
};

export type RepoAnalysisMonorepoServiceMeta = {
  __typename?: 'RepoAnalysisMonorepoServiceMeta';
  buildCommand?: Maybe<Scalars['String']['output']>;
  packageName?: Maybe<Scalars['String']['output']>;
  startCommand?: Maybe<Scalars['String']['output']>;
  watchPatterns?: Maybe<Array<Scalars['String']['output']>>;
};

export type RepoAnalysisMonorepoTool =
  | 'nx'
  | 'turborepo';

export type RepoAnalysisMonorepoType =
  | 'bun'
  | 'npm'
  | 'pnpm'
  | 'yarn';

export type RepoAnalysisNetwork =
  | 'NONE'
  | 'PRIVATE'
  | 'PUBLIC';

export type RepoAnalysisResourceLimits = {
  __typename?: 'RepoAnalysisResourceLimits';
  cpus?: Maybe<Scalars['Float']['output']>;
  memoryMB?: Maybe<Scalars['Int']['output']>;
};

export type RepoAnalysisRestartPolicy = {
  __typename?: 'RepoAnalysisRestartPolicy';
  maxRetries?: Maybe<Scalars['Int']['output']>;
  type: RepoAnalysisRestartPolicyType;
};

export type RepoAnalysisRestartPolicyType =
  | 'ALWAYS'
  | 'NEVER'
  | 'ON_FAILURE';

export type RepoAnalysisRuntime =
  | 'CONTINUOUS'
  | 'SCHEDULED';

export type RepoAnalysisSecretAlphabet =
  | 'ALPHANUMERIC'
  | 'BASE64'
  | 'HEX'
  | 'UNKNOWN';

export type RepoAnalysisSecretMetadata = {
  __typename?: 'RepoAnalysisSecretMetadata';
  alphabet: RepoAnalysisSecretAlphabet;
  length: Scalars['Int']['output'];
};

export type RepoAnalysisServiceSource = {
  __typename?: 'RepoAnalysisServiceSource';
  branch?: Maybe<Scalars['String']['output']>;
  commitSha?: Maybe<Scalars['String']['output']>;
  image?: Maybe<Scalars['String']['output']>;
  provider?: Maybe<RepoAnalysisSourceProvider>;
  repo?: Maybe<Scalars['String']['output']>;
  rootDirectory?: Maybe<Scalars['String']['output']>;
};

export type RepoAnalysisSourceProvider =
  | 'GITHUB'
  | 'GITLAB';

export type RepoAnalysisUseCase =
  | 'API_KEY'
  | 'AUTH'
  | 'DATABASE'
  | 'ENCRYPTION'
  | 'OBSERVABILITY'
  | 'SERVICE'
  | 'UNKNOWN';

export type RepoAnalysisVolume = {
  __typename?: 'RepoAnalysisVolume';
  mountPath: Scalars['String']['output'];
  sizeMB?: Maybe<Scalars['Int']['output']>;
};

export type ResetPluginCredentialsInput = {
  environmentId: Scalars['String']['input'];
};

export type ResetPluginInput = {
  environmentId: Scalars['String']['input'];
};

export type ResolveBanAppealInput = {
  appealId: Scalars['String']['input'];
  resolutionNote: Scalars['String']['input'];
  resolvedByUserId?: InputMaybe<Scalars['String']['input']>;
};

export type ResourceAccess = {
  __typename?: 'ResourceAccess';
  deployment: AccessRule;
  project: AccessRule;
};

export type ResourceOwnerType =
  | 'WORKSPACE';

export type RestartPolicyType =
  | 'ALWAYS'
  | 'NEVER'
  | 'ON_FAILURE';

export type RestrictionStatus =
  | 'ACTIVE'
  | 'LIFTED'
  | 'SUPERSEDED';

export type RestrictionType =
  | 'BAN'
  | 'FULL'
  | 'REQUIRE_CARD'
  | 'THROTTLE';

export type RiskLevelDetails = {
  __typename?: 'RiskLevelDetails';
  compositeScore: CompositeScore;
  fairUse: Scalars['Boolean']['output'];
  terms: Scalars['Boolean']['output'];
};

export type RoutingRepairResult = {
  __typename?: 'RoutingRepairResult';
  message: Scalars['String']['output'];
  totalItemsFound: Scalars['Int']['output'];
  workflowId: Scalars['String']['output'];
  workflowStarted: Scalars['Boolean']['output'];
};

export type RuntimeVersion =
  | 'DOCKER'
  | 'PODMAN'
  | 'UNSPECIFIED';

export type SqlColumnInput = {
  constraint?: InputMaybe<Scalars['String']['input']>;
  default?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  type: Scalars['String']['input'];
};

/** SQL database extension information */
export type SqlExtension = {
  __typename?: 'SQLExtension';
  comment?: Maybe<Scalars['String']['output']>;
  defaultVersion: Scalars['String']['output'];
  installedVersion?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
};

/** Result of installing a SQL database extension */
export type SqlExtensionInstallResult = {
  __typename?: 'SQLExtensionInstallResult';
  installedDependencies: Array<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

/** Field metadata for SQL query results */
export type SqlFieldInfo = {
  __typename?: 'SQLFieldInfo';
  columnID?: Maybe<Scalars['Int']['output']>;
  dataTypeID?: Maybe<Scalars['Int']['output']>;
  dataTypeModifier?: Maybe<Scalars['Int']['output']>;
  dataTypeSize?: Maybe<Scalars['Int']['output']>;
  format?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  tableName?: Maybe<Scalars['String']['output']>;
};

/** Response returned after running a raw query */
export type SqlRawQueryResponse = {
  __typename?: 'SQLRawQueryResponse';
  fields: Array<SqlFieldInfo>;
  rowCount: Scalars['Int']['output'];
  rows: Array<Scalars['JSON']['output']>;
};

export type SqlRowInput = {
  name: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type SqlTable = {
  __typename?: 'SQLTable';
  columnNames: Array<Scalars['String']['output']>;
  columnTypes: Array<Scalars['Int']['output']>;
  name: Scalars['String']['output'];
  primaryKey: Scalars['String']['output'];
  rows: Array<Scalars['JSON']['output']>;
  totalRows: Scalars['Int']['output'];
};

export type Sandbox = {
  __typename?: 'Sandbox';
  createdAt: Scalars['DateTime']['output'];
  environmentId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  idleTimeoutMinutes?: Maybe<Scalars['Int']['output']>;
  region: Scalars['String']['output'];
  status: SandboxStatus;
};

export type SandboxCreateInput = {
  environmentId: Scalars['String']['input'];
  idleTimeoutMinutes?: InputMaybe<Scalars['Int']['input']>;
  template?: InputMaybe<SandboxTemplateInput>;
};

export type SandboxExecOutput = {
  __typename?: 'SandboxExecOutput';
  data?: Maybe<Scalars['String']['output']>;
  exitCode?: Maybe<Scalars['Int']['output']>;
  isStderr: Scalars['Boolean']['output'];
  seq: Scalars['String']['output'];
};

export type SandboxExecResult = {
  __typename?: 'SandboxExecResult';
  cursor: Scalars['String']['output'];
  execId: Scalars['String']['output'];
  exitCode?: Maybe<Scalars['Int']['output']>;
  state: SandboxExecState;
  stderr: Scalars['String']['output'];
  stdout: Scalars['String']['output'];
  timedOut: Scalars['Boolean']['output'];
  truncated: Scalars['Boolean']['output'];
};

export type SandboxExecState =
  | 'COMPLETED'
  | 'INTERRUPTED'
  | 'RUNNING';

export type SandboxStatus =
  | 'CREATING'
  | 'DESTROYED'
  | 'DESTROYING'
  | 'FAILED'
  | 'RUNNING';

export type SandboxTemplate = {
  __typename?: 'SandboxTemplate';
  environmentId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  status: SandboxTemplateStatus;
};

export type SandboxTemplateInput = {
  baseImageDigest?: InputMaybe<Scalars['String']['input']>;
  instructions: Array<Scalars['String']['input']>;
};

export type SandboxTemplateStatus =
  | 'BUILDING'
  | 'FAILED'
  | 'PENDING'
  | 'READY';

export type SendBountyWonEmailInput = {
  bountyAmount: Scalars['Float']['input'];
  threadTitle: Scalars['String']['input'];
  threadUrl: Scalars['String']['input'];
  userId: Scalars['String']['input'];
  workspaceName: Scalars['String']['input'];
};

export type SendCommunityThreadNotificationEmailInput = {
  postEntryContent?: InputMaybe<Scalars['String']['input']>;
  threadTitle: Scalars['String']['input'];
  threadUrl: Scalars['String']['input'];
  userIds: Array<Scalars['String']['input']>;
};

export type SendCommunityWelcomeEmailInput = {
  userId: Scalars['String']['input'];
};

export type SendNewBountyEmailInput = {
  threadTitle: Scalars['String']['input'];
  threadUrl: Scalars['String']['input'];
  userIds: Array<Scalars['String']['input']>;
};

export type SendQuestionMovedToBountyEmailInput = {
  threadTitle: Scalars['String']['input'];
  threadUrl: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};

export type SendTemplateQueueEmailInput = {
  templateId: Scalars['String']['input'];
  threadTitle: Scalars['String']['input'];
  threadUrl: Scalars['String']['input'];
};

export type SendTemplateQueueReminderEmailInput = {
  templateId: Scalars['String']['input'];
};

export type Service = Node & {
  __typename?: 'Service';
  createdAt: Scalars['DateTime']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  /** @deprecated Use environment.deployments for properly scoped access control */
  deployments: ServiceDeploymentsConnection;
  featureFlags: Array<ActiveServiceFeatureFlag>;
  groupId?: Maybe<Scalars['String']['output']>;
  /** Whether this service has hidden registry credentials from a template. When true, the credentials are stored in the template and used during deployment. */
  hasHiddenRegistryCredentialsFromTemplate: Scalars['Boolean']['output'];
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  parentServiceId?: Maybe<Scalars['String']['output']>;
  project: Project;
  projectId: Scalars['String']['output'];
  repoTriggers: ServiceRepoTriggersConnection;
  /** @deprecated Use environment.serviceInstances for properly scoped access control */
  serviceInstances: ServiceServiceInstancesConnection;
  templateId?: Maybe<Scalars['String']['output']>;
  templateServiceId?: Maybe<Scalars['String']['output']>;
  templateThreadSlug?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};


export type ServiceDeploymentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ServiceRepoTriggersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ServiceServiceInstancesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type ServiceBackupInfo = {
  __typename?: 'ServiceBackupInfo';
  /** List of enabled backup schedule kinds (DAILY, WEEKLY, MONTHLY) */
  schedules: Array<VolumeInstanceBackupScheduleKind>;
  serviceId: Scalars['String']['output'];
  serviceName: Scalars['String']['output'];
};

export type ServiceConnectInput = {
  /** The branch to connect to. e.g. 'main' */
  branch?: InputMaybe<Scalars['String']['input']>;
  /** Name of the Dockerhub or GHCR image to connect this service to. */
  image?: InputMaybe<Scalars['String']['input']>;
  /** The full name of the repo to connect to. e.g. 'railwayapp/starters' */
  repo?: InputMaybe<Scalars['String']['input']>;
};

export type ServiceCreateInput = {
  branch?: InputMaybe<Scalars['String']['input']>;
  /** Environment ID. If the specified environment is a fork, the service will only be created in it. Otherwise it will created in all environments that are not forks of other environments */
  environmentId?: InputMaybe<Scalars['String']['input']>;
  icon?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  projectId: Scalars['String']['input'];
  registryCredentials?: InputMaybe<RegistryCredentialsInput>;
  source?: InputMaybe<ServiceSourceInput>;
  /** Template ID. Required when templateServiceId is provided. */
  templateId?: InputMaybe<Scalars['String']['input']>;
  /** Template service ID within the template's serializedConfig. Required when templateId is provided. */
  templateServiceId?: InputMaybe<Scalars['String']['input']>;
  variables?: InputMaybe<Scalars['EnvironmentVariables']['input']>;
};

export type ServiceDeploymentsConnection = {
  __typename?: 'ServiceDeploymentsConnection';
  edges: Array<ServiceDeploymentsConnectionEdge>;
  pageInfo: PageInfo;
};

export type ServiceDeploymentsConnectionEdge = {
  __typename?: 'ServiceDeploymentsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Deployment;
};

export type ServiceDomain = Domain & {
  __typename?: 'ServiceDomain';
  adminService?: Maybe<Service>;
  /** @deprecated Removed; always null. */
  cdnMode?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  domain: Scalars['String']['output'];
  edgeId?: Maybe<Scalars['String']['output']>;
  environmentId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  newDomainName?: Maybe<Scalars['String']['output']>;
  newHostLabel?: Maybe<Scalars['String']['output']>;
  projectId?: Maybe<Scalars['String']['output']>;
  serviceId: Scalars['String']['output'];
  suffix?: Maybe<Scalars['String']['output']>;
  syncStatus: ServiceDomainSyncStatus;
  targetPort?: Maybe<Scalars['Int']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type ServiceDomainCreateInput = {
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
  targetPort?: InputMaybe<Scalars['Int']['input']>;
};

export type ServiceDomainSyncStatus =
  | 'ACTIVE'
  | 'CREATING'
  | 'DELETED'
  | 'DELETING'
  | 'UNSPECIFIED'
  | 'UPDATING';

export type ServiceDomainUpdateInput = {
  domain: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  serviceDomainId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
  targetPort?: InputMaybe<Scalars['Int']['input']>;
};

export type ServiceFeatureFlagToggleInput = {
  flag: ActiveServiceFeatureFlag;
  serviceId: Scalars['String']['input'];
};

/** Network flow data for a single service */
export type ServiceFlowEntry = {
  __typename?: 'ServiceFlowEntry';
  /** List of peer connections with their metrics */
  peers: Array<ServicePeerEntry>;
  /** The service ID */
  serviceId: Scalars['String']['output'];
};

export type ServiceInstance = Node & {
  __typename?: 'ServiceInstance';
  /** All currently active (deployed and running) deployments for this service instance */
  activeDeployments: Array<Deployment>;
  buildCommand?: Maybe<Scalars['String']['output']>;
  builder: Builder;
  createdAt: Scalars['DateTime']['output'];
  cronSchedule?: Maybe<Scalars['String']['output']>;
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  dockerfilePath?: Maybe<Scalars['String']['output']>;
  domains: AllDomains;
  drainingSeconds?: Maybe<Scalars['Int']['output']>;
  edgeConfig?: Maybe<EdgeConfig>;
  environmentId: Scalars['String']['output'];
  healthcheckPath?: Maybe<Scalars['String']['output']>;
  healthcheckTimeout?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  /** Check if a Docker image update is available for this service instance */
  imageUpdateStatus?: Maybe<Scalars['ImageUpdateStatus']['output']>;
  ipv6EgressEnabled?: Maybe<Scalars['Boolean']['output']>;
  isUpdatable: Scalars['Boolean']['output'];
  /** The most recent deployment for this service instance */
  latestDeployment?: Maybe<Deployment>;
  nextCronRunAt?: Maybe<Scalars['DateTime']['output']>;
  nixpacksPlan?: Maybe<Scalars['JSON']['output']>;
  numReplicas?: Maybe<Scalars['Int']['output']>;
  overlapSeconds?: Maybe<Scalars['Int']['output']>;
  preDeployCommand?: Maybe<Scalars['JSON']['output']>;
  railpackInfo?: Maybe<Scalars['RailpackInfo']['output']>;
  railwayConfigFile?: Maybe<Scalars['String']['output']>;
  region?: Maybe<Scalars['String']['output']>;
  restartPolicyMaxRetries: Scalars['Int']['output'];
  restartPolicyType: RestartPolicyType;
  rootDirectory?: Maybe<Scalars['String']['output']>;
  service: Service;
  serviceId: Scalars['String']['output'];
  serviceName: Scalars['String']['output'];
  sleepApplication?: Maybe<Scalars['Boolean']['output']>;
  source?: Maybe<ServiceSource>;
  startCommand?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  upstreamUrl?: Maybe<Scalars['String']['output']>;
  watchPatterns: Array<Scalars['String']['output']>;
};


export type ServiceInstanceImageUpdateStatusArgs = {
  skipCache?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ServiceInstanceAutoDeployStatus = {
  __typename?: 'ServiceInstanceAutoDeployStatus';
  canEnable: Scalars['Boolean']['output'];
  enabled: Scalars['Boolean']['output'];
  reason?: Maybe<Scalars['String']['output']>;
};

export type ServiceInstanceAutoDeployUpdateInput = {
  enabled: Scalars['Boolean']['input'];
  environmentId: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};

export type ServiceInstanceAutoDeployUpdateResult = {
  __typename?: 'ServiceInstanceAutoDeployUpdateResult';
  enabled: Scalars['Boolean']['output'];
};

export type ServiceInstanceImageUpdateSkipInput = {
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
  shas: Array<Scalars['String']['input']>;
};

export type ServiceInstanceLimitsUpdateInput = {
  environmentId: Scalars['String']['input'];
  /** Amount of memory in GB to allocate to the service instance */
  memoryGB?: InputMaybe<Scalars['Float']['input']>;
  serviceId: Scalars['String']['input'];
  /** Number of vCPUs to allocate to the service instance */
  vCPUs?: InputMaybe<Scalars['Float']['input']>;
};

export type ServiceInstanceUpdateInput = {
  buildCommand?: InputMaybe<Scalars['String']['input']>;
  builder?: InputMaybe<Builder>;
  cronSchedule?: InputMaybe<Scalars['String']['input']>;
  dockerfilePath?: InputMaybe<Scalars['String']['input']>;
  drainingSeconds?: InputMaybe<Scalars['Int']['input']>;
  healthcheckPath?: InputMaybe<Scalars['String']['input']>;
  healthcheckTimeout?: InputMaybe<Scalars['Int']['input']>;
  ipv6EgressEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  multiRegionConfig?: InputMaybe<Scalars['JSON']['input']>;
  nixpacksPlan?: InputMaybe<Scalars['JSON']['input']>;
  numReplicas?: InputMaybe<Scalars['Int']['input']>;
  overlapSeconds?: InputMaybe<Scalars['Int']['input']>;
  preDeployCommand?: InputMaybe<Array<Scalars['String']['input']>>;
  railwayConfigFile?: InputMaybe<Scalars['String']['input']>;
  region?: InputMaybe<Scalars['String']['input']>;
  registryCredentials?: InputMaybe<RegistryCredentialsInput>;
  restartPolicyMaxRetries?: InputMaybe<Scalars['Int']['input']>;
  restartPolicyType?: InputMaybe<RestartPolicyType>;
  rootDirectory?: InputMaybe<Scalars['String']['input']>;
  sleepApplication?: InputMaybe<Scalars['Boolean']['input']>;
  source?: InputMaybe<ServiceSourceInput>;
  startCommand?: InputMaybe<Scalars['String']['input']>;
  watchPatterns?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** A single peer connection for a service */
export type ServicePeerEntry = {
  __typename?: 'ServicePeerEntry';
  /** The endpoint key in format '{peer_kind}_{identifier}', e.g. 'service_uuid', 'edge_proxy_dc4', 'internet_global' */
  endpointKey: Scalars['String']['output'];
  /** The aggregated metrics for this connection */
  metrics: ServicePeerMetrics;
};

/** Aggregated network flow metrics for a service-to-peer connection */
export type ServicePeerMetrics = {
  __typename?: 'ServicePeerMetrics';
  /** Average egress bytes per second */
  egressBytesPerSecond: Scalars['Float']['output'];
  /** Average egress packets per second */
  egressPacketsPerSecond: Scalars['Float']['output'];
  /** Average ingress bytes per second */
  ingressBytesPerSecond: Scalars['Float']['output'];
  /** Average ingress packets per second */
  ingressPacketsPerSecond: Scalars['Float']['output'];
};

export type ServiceRepoTriggersConnection = {
  __typename?: 'ServiceRepoTriggersConnection';
  edges: Array<ServiceRepoTriggersConnectionEdge>;
  pageInfo: PageInfo;
};

export type ServiceRepoTriggersConnectionEdge = {
  __typename?: 'ServiceRepoTriggersConnectionEdge';
  cursor: Scalars['String']['output'];
  node: DeploymentTrigger;
};

export type ServiceServiceInstancesConnection = {
  __typename?: 'ServiceServiceInstancesConnection';
  edges: Array<ServiceServiceInstancesConnectionEdge>;
  pageInfo: PageInfo;
};

export type ServiceServiceInstancesConnectionEdge = {
  __typename?: 'ServiceServiceInstancesConnectionEdge';
  cursor: Scalars['String']['output'];
  node: ServiceInstance;
};

export type ServiceSource = {
  __typename?: 'ServiceSource';
  image?: Maybe<Scalars['String']['output']>;
  repo?: Maybe<Scalars['String']['output']>;
};

export type ServiceSourceInput = {
  image?: InputMaybe<Scalars['String']['input']>;
  repo?: InputMaybe<Scalars['String']['input']>;
};

export type ServiceStatus = {
  __typename?: 'ServiceStatus';
  crashed: Scalars['Int']['output'];
  online: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type ServiceSyncStatusItem = {
  __typename?: 'ServiceSyncStatusItem';
  name: Scalars['String']['output'];
  syncStatus: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type ServiceUpdateInput = {
  icon?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type Session = Node & {
  __typename?: 'Session';
  createdAt: Scalars['DateTime']['output'];
  expiredAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  isCurrent: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  type: SessionType;
  updatedAt: Scalars['DateTime']['output'];
};

export type SessionType =
  | 'BROWSER'
  | 'CLI'
  | 'FORUMS';

export type SetDomainTrafficLimitInput = {
  limit?: InputMaybe<DomainTrafficLimitInput>;
  ttlSeconds?: InputMaybe<Scalars['Int']['input']>;
};

export type SetGithubBackpressureConfigInput = {
  enabled: Scalars['Boolean']['input'];
  maxConcurrent: Scalars['Int']['input'];
  plan: GithubBackpressurePlanType;
};

export type SetPercentagePlatformFeatureFlagInput = {
  flag: PlatformFeatureFlag;
  percentage: Scalars['Int']['input'];
};

export type SetServiceInstanceLimitOverrideInput = {
  config: Scalars['ServiceInstanceLimit']['input'];
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};

export type SetupAgentEventTrackInput = {
  agentSessionId?: InputMaybe<Scalars['String']['input']>;
  arch?: InputMaybe<Scalars['String']['input']>;
  caller?: InputMaybe<Scalars['String']['input']>;
  cliVersion?: InputMaybe<Scalars['String']['input']>;
  configuredClients?: InputMaybe<Array<Scalars['String']['input']>>;
  errorMessage?: InputMaybe<Scalars['String']['input']>;
  installRequestId?: InputMaybe<Scalars['String']['input']>;
  isCi?: InputMaybe<Scalars['Boolean']['input']>;
  os?: InputMaybe<Scalars['String']['input']>;
  phase: Scalars['String']['input'];
  sessionId?: InputMaybe<Scalars['String']['input']>;
  success?: InputMaybe<Scalars['Boolean']['input']>;
};

export type SharedVariableConfigureInput = {
  disabledServiceIds: Array<Scalars['String']['input']>;
  enabledServiceIds: Array<Scalars['String']['input']>;
  environmentId: Scalars['String']['input'];
  name: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
};

export type ShellTokenInput = {
  environmentId: Scalars['String']['input'];
  instanceId: Scalars['String']['input'];
  kind?: InputMaybe<Scalars['String']['input']>;
  scope: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['String']['input']>;
};

export type SimilarTemplate = {
  __typename?: 'SimilarTemplate';
  code: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  creator?: Maybe<TemplateCreator>;
  deploys: Scalars['Int']['output'];
  description?: Maybe<Scalars['String']['output']>;
  health?: Maybe<Scalars['Float']['output']>;
  image?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  /** @deprecated Use workspaceId */
  teamId?: Maybe<Scalars['String']['output']>;
  userId?: Maybe<Scalars['String']['output']>;
  workspaceId?: Maybe<Scalars['String']['output']>;
};

export type SortOrder =
  | 'asc'
  | 'desc';

export type SpendCommitment = Node & {
  __typename?: 'SpendCommitment';
  features: Array<Scalars['SpendCommitmentFeatureId']['output']>;
  id: Scalars['ID']['output'];
  minSpendAmountCents: Scalars['Int']['output'];
};

export type SpendCommitmentCancelInput = {
  customerId: Scalars['String']['input'];
};

export type SshPublicKey = Node & {
  __typename?: 'SshPublicKey';
  createdAt: Scalars['DateTime']['output'];
  fingerprint: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  publicKey: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  userId?: Maybe<Scalars['String']['output']>;
  workspaceId?: Maybe<Scalars['String']['output']>;
};

export type SshPublicKeyCreateInput = {
  name: Scalars['String']['input'];
  publicKey: Scalars['String']['input'];
  workspaceId?: InputMaybe<Scalars['String']['input']>;
};

export type Stacker = {
  __typename?: 'Stacker';
  IP?: Maybe<Scalars['String']['output']>;
  hostname?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  isCordoned: Scalars['Boolean']['output'];
  region?: Maybe<Scalars['String']['output']>;
  zone?: Maybe<Scalars['String']['output']>;
};

export type StackerStatsProgress = {
  __typename?: 'StackerStatsProgress';
  enrichedDeploymentInstances: Array<EnrichedDeploymentInstance>;
  totalStackerDeploymentInstanceCount: Scalars['Int']['output'];
};

export type StackerStatsWorkflowInfo = {
  __typename?: 'StackerStatsWorkflowInfo';
  stackerId: Scalars['String']['output'];
  workflowId: Scalars['String']['output'];
};

export type StaleWhileRevalidateConfig = {
  __typename?: 'StaleWhileRevalidateConfig';
  enabled: Scalars['Boolean']['output'];
};

export type StaleWhileRevalidateInput = {
  enabled: Scalars['Boolean']['input'];
};

export type StripePaymentIntentStatus =
  | 'requires_action'
  | 'requires_capture';

export type StripeSubscriptionStatus =
  | 'active'
  | 'incomplete'
  | 'past_due';

export type Subscription = {
  __typename?: 'Subscription';
  /** Subscribe to updates for a volume's backups */
  backups: BackupUpdate;
  /** Stream logs for a build */
  buildLogs: Array<Log>;
  /** Invalidate the frontend cache for an environment */
  canvasInvalidation: InvalidationResult;
  /** Subscribe to agent response events */
  chatStream: Array<AgentStreamEvent>;
  /** Subscribe to updates for a specific deployment */
  deployment: Deployment;
  /** Subscribe to deployment events for a specific deployment */
  deploymentEvents: DeploymentEvent;
  /** Subscribe to deployment instance executions for a specific deployment */
  deploymentInstanceExecutions: DeploymentInstanceExecution;
  /** Stream logs for a deployment */
  deploymentLogs: Array<Log>;
  /** Stream logs for a project environment */
  environmentLogs: Array<Log>;
  /** Subscribe to real-time progress updates for environment patch applications */
  environmentPatchProgress: EnvironmentPatchProgress;
  /** Subscribe to updates for the staged patch for a single environment. */
  environmentStagedPatch: EnvironmentPatch;
  /** Stream function code for a prompt */
  functionGenerate: Array<GenAiTextBlock>;
  /** Subscribe to GitHub repository cache refresh status */
  githubRefreshStatus: GithubRefreshStatus;
  /** Subscribe to GitHub repository cache refresh status with error details */
  githubRefreshStatusV2: GithubRefreshStatusResult;
  /** Stream HTTP logs for a deployment */
  httpLogs: Array<HttpLog>;
  /** Subscribe to monorepo import status updates */
  monorepoImportStatus: MonorepoImportStatusUpdate;
  /** Stream network flow logs for an environment */
  networkFlowLogs: Array<NetworkFlowLog>;
  /** Subscribe to notification delivery updates (created and resolved) for the authenticated user */
  notificationDeliveryUpdated: NotificationDeliveryUpdate;
  /**
   * Stream logs for a plugin
   * @deprecated Plugins are deprecated
   */
  pluginLogs: Array<Log>;
  /** Subscribe to AI-assisted project setup events */
  projectCreateWithAgentStream: Array<AgentStreamEvent>;
  /** Subscribe to Railway public stats */
  publicStats: PublicStatsEvent;
  /** Fires when a new match is found during a radar scan */
  radarScanMatchAdded: RadarScanMatch;
  /** Fires when any radar rule or list is created, updated, or deleted */
  radarUpdated: Scalars['Boolean']['output'];
  /** Subscribe to migration progress updates for a volume */
  replicationProgress: VolumeReplicationProgressUpdate;
  /** Stream stdout/stderr of a running sandbox exec. Resumable: pass the last seq as cursor to re-attach without gaps. */
  sandboxExecOutput: Array<SandboxExecOutput>;
  /** Invalidate the frontend sandbox cache for an environment. */
  sandboxInvalidation: InvalidationResult;
  /** Subscribe to volume lock status updates for a project and environment */
  volumeLockStatus: VolumeLockStatusUpdate;
  /** Subscribe to updates for a workspace's downgrade */
  workspaceDowngrades: WorkspaceDowngradesUpdate;
};


export type SubscriptionBackupsArgs = {
  volumeInstanceId: Scalars['String']['input'];
};


export type SubscriptionBuildLogsArgs = {
  deploymentId: Scalars['String']['input'];
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type SubscriptionCanvasInvalidationArgs = {
  environmentId: Scalars['String']['input'];
};


export type SubscriptionChatStreamArgs = {
  streamId: Scalars['String']['input'];
};


export type SubscriptionDeploymentArgs = {
  id: Scalars['String']['input'];
};


export type SubscriptionDeploymentEventsArgs = {
  id: Scalars['String']['input'];
};


export type SubscriptionDeploymentInstanceExecutionsArgs = {
  input: DeploymentInstanceExecutionInput;
};


export type SubscriptionDeploymentLogsArgs = {
  deploymentId: Scalars['String']['input'];
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type SubscriptionEnvironmentLogsArgs = {
  afterDate?: InputMaybe<Scalars['String']['input']>;
  afterLimit?: InputMaybe<Scalars['Int']['input']>;
  anchorDate?: InputMaybe<Scalars['String']['input']>;
  beforeDate?: InputMaybe<Scalars['String']['input']>;
  beforeLimit?: InputMaybe<Scalars['Int']['input']>;
  environmentId: Scalars['String']['input'];
  filter?: InputMaybe<Scalars['String']['input']>;
};


export type SubscriptionEnvironmentPatchProgressArgs = {
  environmentId: Scalars['String']['input'];
};


export type SubscriptionEnvironmentStagedPatchArgs = {
  environmentId: Scalars['String']['input'];
};


export type SubscriptionFunctionGenerateArgs = {
  environmentId?: InputMaybe<Scalars['String']['input']>;
  prompt: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['String']['input']>;
};


export type SubscriptionGithubRefreshStatusArgs = {
  jobId: Scalars['String']['input'];
};


export type SubscriptionHttpLogsArgs = {
  afterDate?: InputMaybe<Scalars['String']['input']>;
  afterLimit?: InputMaybe<Scalars['Int']['input']>;
  anchorDate?: InputMaybe<Scalars['String']['input']>;
  beforeDate?: InputMaybe<Scalars['String']['input']>;
  beforeLimit?: InputMaybe<Scalars['Int']['input']>;
  deploymentId: Scalars['String']['input'];
  filter?: InputMaybe<Scalars['String']['input']>;
};


export type SubscriptionMonorepoImportStatusArgs = {
  environmentId: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
};


export type SubscriptionNetworkFlowLogsArgs = {
  afterDate?: InputMaybe<Scalars['String']['input']>;
  afterLimit?: InputMaybe<Scalars['Int']['input']>;
  anchorDate?: InputMaybe<Scalars['String']['input']>;
  beforeDate?: InputMaybe<Scalars['String']['input']>;
  beforeLimit?: InputMaybe<Scalars['Int']['input']>;
  environmentId: Scalars['String']['input'];
  filter?: InputMaybe<Scalars['String']['input']>;
  serviceId?: InputMaybe<Scalars['String']['input']>;
};


export type SubscriptionPluginLogsArgs = {
  environmentId: Scalars['String']['input'];
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  pluginId: Scalars['String']['input'];
};


export type SubscriptionProjectCreateWithAgentStreamArgs = {
  id: Scalars['String']['input'];
};


export type SubscriptionRadarScanMatchAddedArgs = {
  ruleId: Scalars['String']['input'];
};


export type SubscriptionReplicationProgressArgs = {
  volumeInstanceId: Scalars['String']['input'];
};


export type SubscriptionSandboxExecOutputArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  environmentId: Scalars['String']['input'];
  execId: Scalars['String']['input'];
  id: Scalars['String']['input'];
};


export type SubscriptionSandboxInvalidationArgs = {
  environmentId: Scalars['String']['input'];
};


export type SubscriptionVolumeLockStatusArgs = {
  environmentId: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
};


export type SubscriptionWorkspaceDowngradesArgs = {
  workspaceId: Scalars['String']['input'];
};

export type SubscriptionDiscount = {
  __typename?: 'SubscriptionDiscount';
  couponId: Scalars['String']['output'];
  couponName: Scalars['String']['output'];
};

export type SubscriptionItem = {
  __typename?: 'SubscriptionItem';
  itemId: Scalars['String']['output'];
  priceDollars?: Maybe<Scalars['Float']['output']>;
  priceId: Scalars['String']['output'];
  productId: Scalars['String']['output'];
  quantity?: Maybe<Scalars['BigInt']['output']>;
};

export type SubscriptionModel =
  | 'FREE'
  | 'TEAM'
  | 'USER';

export type SubscriptionPlanType =
  | 'free'
  | 'hobby'
  | 'pro'
  | 'trial';

export type SubscriptionState =
  | 'ACTIVE'
  | 'CANCELLED'
  | 'INACTIVE'
  | 'PAST_DUE'
  | 'UNPAID';

export type SupportMessage = {
  __typename?: 'SupportMessage';
  attachments: Array<SupportMessageAttachment>;
  author?: Maybe<SupportMessageAuthor>;
  body?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  inReplyTo?: Maybe<SupportMessageReplyRef>;
  type: Scalars['String']['output'];
};

export type SupportMessageAttachment = {
  __typename?: 'SupportMessageAttachment';
  filename?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  mimetype?: Maybe<Scalars['String']['output']>;
};

export type SupportMessageAuthor = {
  __typename?: 'SupportMessageAuthor';
  railwayAvatarUrl?: Maybe<Scalars['String']['output']>;
  railwayIsAdmin: Scalars['Boolean']['output'];
  railwayUserId?: Maybe<Scalars['String']['output']>;
  railwayUsername?: Maybe<Scalars['String']['output']>;
};

export type SupportMessageReplyRef = {
  __typename?: 'SupportMessageReplyRef';
  author?: Maybe<SupportMessageAuthor>;
  body?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
};

export type SupportThread = {
  __typename?: 'SupportThread';
  createdAt: Scalars['DateTime']['output'];
  isPrivate: Scalars['Boolean']['output'];
  lastActivityAt?: Maybe<Scalars['DateTime']['output']>;
  replyCount: Scalars['Int']['output'];
  slug: Scalars['String']['output'];
  status: Scalars['String']['output'];
  subject: Scalars['String']['output'];
  topicDisplayName?: Maybe<Scalars['String']['output']>;
  topicSlug: Scalars['String']['output'];
};

export type SupportThreadActivity = {
  __typename?: 'SupportThreadActivity';
  lastActivityAt?: Maybe<Scalars['DateTime']['output']>;
  slug: Scalars['String']['output'];
};

export type SupportThreadDetail = {
  __typename?: 'SupportThreadDetail';
  author?: Maybe<SupportMessageAuthor>;
  createdAt: Scalars['DateTime']['output'];
  isPrivate: Scalars['Boolean']['output'];
  lastActivityAt?: Maybe<Scalars['DateTime']['output']>;
  messages: Array<SupportMessage>;
  replyCount: Scalars['Int']['output'];
  slug: Scalars['String']['output'];
  status: Scalars['String']['output'];
  subject: Scalars['String']['output'];
  topicDisplayName?: Maybe<Scalars['String']['output']>;
  topicSlug: Scalars['String']['output'];
};

export type SupportTierOverride =
  | 'BUSINESS_CLASS'
  | 'BUSINESS_CLASS_TRIAL';

export type SyncRoutesInput = {
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};

export type SyncRoutesResult = {
  __typename?: 'SyncRoutesResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  syncedTargets: Array<Scalars['String']['output']>;
};

export type TcpProxy = {
  __typename?: 'TCPProxy';
  applicationPort: Scalars['Int']['output'];
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  domain: Scalars['String']['output'];
  environmentId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  proxyPort: Scalars['Int']['output'];
  serviceId: Scalars['String']['output'];
  syncStatus: TcpProxySyncStatus;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type TcpProxyCreateInput = {
  applicationPort: Scalars['Int']['input'];
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};

export type TcpProxySyncStatus =
  | 'ACTIVE'
  | 'CREATING'
  | 'DELETED'
  | 'DELETING'
  | 'UNSPECIFIED'
  | 'UPDATING';

export type TaxIdInput = {
  type: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type Team = Node & {
  __typename?: 'Team';
  /** @deprecated Use workspace object instead */
  adoptionHistory: Array<AdoptionInfo>;
  /** @deprecated Use workspace object instead */
  adoptionLevel: Scalars['Float']['output'];
  /** @deprecated Use workspace object instead */
  apiTokenRateLimit?: Maybe<ApiTokenRateLimit>;
  /** @deprecated Use workspace object instead */
  avatar?: Maybe<Scalars['String']['output']>;
  /** @deprecated Use workspace object instead */
  createdAt: Scalars['DateTime']['output'];
  /** @deprecated Use workspace object instead */
  customer: Customer;
  /** @deprecated Use workspace object instead */
  id: Scalars['ID']['output'];
  /** @deprecated Use workspace object instead */
  members: Array<TeamMember>;
  /** @deprecated Use workspace object instead */
  name: Scalars['String']['output'];
  /** @deprecated Use workspace object instead */
  preferredRegion?: Maybe<Scalars['String']['output']>;
  /** @deprecated Use workspace object instead */
  projects: TeamProjectsConnection;
  /** @deprecated Use workspace object instead */
  slackChannelId?: Maybe<Scalars['String']['output']>;
  /** @deprecated Use workspace object instead */
  supportTierOverride?: Maybe<SupportTierOverride>;
  /** @deprecated Use workspace object instead */
  teamPermissions: Array<TeamPermission>;
  /** @deprecated Use workspace object instead */
  updatedAt: Scalars['DateTime']['output'];
  /** @deprecated Use workspace object instead */
  workspace: Workspace;
};


export type TeamProjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type TeamMember = {
  __typename?: 'TeamMember';
  avatar?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  /** Only retrieved if requested by an admin */
  featureFlags?: Maybe<Array<ActiveFeatureFlag>>;
  id: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
  role: TeamRole;
};

export type TeamPermission = Node & {
  __typename?: 'TeamPermission';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  role: TeamRole;
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['String']['output'];
  workspaceId: Scalars['String']['output'];
};

export type TeamProjectsConnection = {
  __typename?: 'TeamProjectsConnection';
  edges: Array<TeamProjectsConnectionEdge>;
  pageInfo: PageInfo;
};

export type TeamProjectsConnectionEdge = {
  __typename?: 'TeamProjectsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Project;
};

export type TeamRole =
  | 'ADMIN'
  | 'MEMBER'
  | 'VIEWER';

export type TelemetrySendInput = {
  command: Scalars['String']['input'];
  environmentId?: InputMaybe<Scalars['String']['input']>;
  error: Scalars['String']['input'];
  projectId?: InputMaybe<Scalars['String']['input']>;
  serviceId?: InputMaybe<Scalars['String']['input']>;
  stacktrace: Scalars['String']['input'];
  version?: InputMaybe<Scalars['String']['input']>;
};

export type Template = Node & {
  __typename?: 'Template';
  activeProjects: Scalars['Int']['output'];
  canvasConfig?: Maybe<Scalars['CanvasConfig']['output']>;
  category?: Maybe<Scalars['String']['output']>;
  code: Scalars['String']['output'];
  communityThreadSlug?: Maybe<Scalars['String']['output']>;
  /** @deprecated Use serializedConfig instead */
  config: Scalars['TemplateConfig']['output'];
  createdAt: Scalars['DateTime']['output'];
  creator?: Maybe<TemplateCreator>;
  demoProjectId?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  guides?: Maybe<TemplateGuide>;
  health?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  image?: Maybe<Scalars['String']['output']>;
  isApproved: Scalars['Boolean']['output'];
  isV2Template: Scalars['Boolean']['output'];
  isVerified: Scalars['Boolean']['output'];
  languages?: Maybe<Array<Scalars['String']['output']>>;
  maintainer?: Maybe<MaintainerWorkspace>;
  /** @deprecated Deprecated in favor of listing the fields individually. */
  metadata: Scalars['TemplateMetadata']['output'];
  name: Scalars['String']['output'];
  projects: Scalars['Int']['output'];
  readme?: Maybe<Scalars['String']['output']>;
  recentProjects: Scalars['Int']['output'];
  serializedConfig?: Maybe<Scalars['SerializedTemplateConfig']['output']>;
  services: TemplateServicesConnection;
  similarTemplates: Array<SimilarTemplate>;
  status: TemplateStatus;
  supportHealthMetrics?: Maybe<Scalars['SupportHealthMetrics']['output']>;
  tags?: Maybe<Array<Scalars['String']['output']>>;
  /** @deprecated Use workspaceId */
  teamId?: Maybe<Scalars['String']['output']>;
  totalPayout: Scalars['Float']['output'];
  updatedAt: Scalars['DateTime']['output'];
  workspaceId?: Maybe<Scalars['String']['output']>;
};


export type TemplateServicesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type TemplateCloneInput = {
  code: Scalars['String']['input'];
  /** @deprecated Use workspaceId instead - teams are now workspaces */
  teamId?: InputMaybe<Scalars['String']['input']>;
  workspaceId?: InputMaybe<Scalars['String']['input']>;
};

export type TemplateCreateV2Input = {
  canvasConfig?: InputMaybe<Scalars['CanvasConfig']['input']>;
  metadata: Scalars['TemplateMetadata']['input'];
  serializedConfig: Scalars['SerializedTemplateConfig']['input'];
  workspaceId?: InputMaybe<Scalars['String']['input']>;
};

export type TemplateCreator = {
  __typename?: 'TemplateCreator';
  avatar?: Maybe<Scalars['String']['output']>;
  hasPublicProfile: Scalars['Boolean']['output'];
  name?: Maybe<Scalars['String']['output']>;
  username?: Maybe<Scalars['String']['output']>;
};

export type TemplateDeleteInput = {
  /** @deprecated Use workspaceId instead - teams are now workspaces */
  teamId?: InputMaybe<Scalars['String']['input']>;
  workspaceId?: InputMaybe<Scalars['String']['input']>;
};

export type TemplateDeployInput = {
  environmentId?: InputMaybe<Scalars['String']['input']>;
  /** @deprecated The databases from the template will be used. */
  plugins?: InputMaybe<Array<Scalars['String']['input']>>;
  projectId?: InputMaybe<Scalars['String']['input']>;
  services: Array<TemplateDeployService>;
  /** @deprecated Use workspaceId instead - teams are now workspaces */
  teamId?: InputMaybe<Scalars['String']['input']>;
  templateCode?: InputMaybe<Scalars['String']['input']>;
  workspaceId?: InputMaybe<Scalars['String']['input']>;
};

export type TemplateDeployPayload = {
  __typename?: 'TemplateDeployPayload';
  projectId: Scalars['String']['output'];
  workflowId?: Maybe<Scalars['String']['output']>;
};

export type TemplateDeployService = {
  commit?: InputMaybe<Scalars['String']['input']>;
  hasDomain?: InputMaybe<Scalars['Boolean']['input']>;
  healthcheckPath?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  isPrivate?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  owner?: InputMaybe<Scalars['String']['input']>;
  preDeployCommand?: InputMaybe<Array<Scalars['String']['input']>>;
  rootDirectory?: InputMaybe<Scalars['String']['input']>;
  serviceIcon?: InputMaybe<Scalars['String']['input']>;
  serviceName: Scalars['String']['input'];
  startCommand?: InputMaybe<Scalars['String']['input']>;
  tcpProxyApplicationPort?: InputMaybe<Scalars['Int']['input']>;
  template: Scalars['String']['input'];
  variables?: InputMaybe<Scalars['EnvironmentVariables']['input']>;
  volumes?: InputMaybe<Array<Scalars['TemplateVolume']['input']>>;
};

export type TemplateDeployV2Input = {
  environmentId?: InputMaybe<Scalars['String']['input']>;
  /** Use an existing service as the cluster root instead of creating a new one. Used for HA cluster conversion where an existing postgres becomes the primary. */
  existingRootServiceId?: InputMaybe<Scalars['String']['input']>;
  /** The group to deploy the template into */
  groupId?: InputMaybe<Scalars['String']['input']>;
  projectId?: InputMaybe<Scalars['String']['input']>;
  /** Override the auto-generated project name for the newly created project. */
  projectName?: InputMaybe<Scalars['String']['input']>;
  serializedConfig: Scalars['SerializedTemplateConfig']['input'];
  /** If true, create resources and patch but don't deploy. Returns patchId for later commit. */
  stageOnly?: InputMaybe<Scalars['Boolean']['input']>;
  /** @deprecated Use workspaceId instead - teams are now workspaces */
  teamId?: InputMaybe<Scalars['String']['input']>;
  templateId: Scalars['String']['input'];
  workspaceId?: InputMaybe<Scalars['String']['input']>;
};

export type TemplateGenerateInput = {
  environmentId?: InputMaybe<Scalars['String']['input']>;
  projectId: Scalars['String']['input'];
  /** @deprecated This argument is unused */
  teamId?: InputMaybe<Scalars['String']['input']>;
};

export type TemplateGuide = {
  __typename?: 'TemplateGuide';
  post?: Maybe<Scalars['String']['output']>;
  video?: Maybe<Scalars['String']['output']>;
};

export type TemplateMaintainerUpsertInput = {
  workspaceId: Scalars['String']['input'];
};

export type TemplateMetrics = {
  __typename?: 'TemplateMetrics';
  activeDeployments: Scalars['Int']['output'];
  deploymentsLast90Days: Scalars['Int']['output'];
  earningsLast30Days: Scalars['Float']['output'];
  earningsLast90Days: Scalars['Float']['output'];
  eligibleForSupportBonus: Scalars['Boolean']['output'];
  supportHealth: Scalars['Float']['output'];
  templateHealth: Scalars['Float']['output'];
  totalDeployments: Scalars['Int']['output'];
  totalEarnings: Scalars['Float']['output'];
};

export type TemplatePublishInput = {
  category: Scalars['String']['input'];
  demoProjectId?: InputMaybe<Scalars['String']['input']>;
  description: Scalars['String']['input'];
  image?: InputMaybe<Scalars['String']['input']>;
  readme: Scalars['String']['input'];
  /** @deprecated Use workspaceId instead - teams are now workspaces */
  teamId?: InputMaybe<Scalars['String']['input']>;
  workspaceId?: InputMaybe<Scalars['String']['input']>;
};

export type TemplateRevertInput = {
  /** The environment ID containing the cluster */
  environmentId: Scalars['String']['input'];
  /** The group ID to delete when reverting */
  groupId?: InputMaybe<Scalars['String']['input']>;
  /** The project ID containing the cluster */
  projectId: Scalars['String']['input'];
  /** The root service ID of the HA cluster to revert */
  rootServiceId: Scalars['String']['input'];
  /** If true, stage changes instead of deploying. Returns patchId. */
  stageOnly?: InputMaybe<Scalars['Boolean']['input']>;
  /** The template code to revert (e.g., 'ha-postgres') */
  templateCode: Scalars['String']['input'];
};

export type TemplateSearchHighlights = {
  __typename?: 'TemplateSearchHighlights';
  category?: Maybe<Scalars['String']['output']>;
  code?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  searchTerms?: Maybe<Array<Scalars['String']['output']>>;
};

export type TemplateSearchRankingScoreDetail = {
  __typename?: 'TemplateSearchRankingScoreDetail';
  details: Scalars['JSON']['output'];
  order?: Maybe<Scalars['Int']['output']>;
  rule: Scalars['String']['output'];
  score?: Maybe<Scalars['Float']['output']>;
};

export type TemplateSearchResult = {
  __typename?: 'TemplateSearchResult';
  adjustedRankingScore?: Maybe<Scalars['Float']['output']>;
  code: Scalars['String']['output'];
  creatorName?: Maybe<Scalars['String']['output']>;
  deploymentCount: Scalars['Int']['output'];
  description?: Maybe<Scalars['String']['output']>;
  healthScore?: Maybe<Scalars['Float']['output']>;
  highlights?: Maybe<TemplateSearchHighlights>;
  id: Scalars['String']['output'];
  image?: Maybe<Scalars['String']['output']>;
  isVerified: Scalars['Boolean']['output'];
  matchedFields?: Maybe<Array<Scalars['String']['output']>>;
  meilisearchRank?: Maybe<Scalars['Int']['output']>;
  name: Scalars['String']['output'];
  qualityAdjustment?: Maybe<Scalars['Float']['output']>;
  rankingScore?: Maybe<Scalars['Float']['output']>;
  rankingScoreDetails?: Maybe<Array<TemplateSearchRankingScoreDetail>>;
};

export type TemplateService = Node & {
  __typename?: 'TemplateService';
  config: Scalars['TemplateServiceConfig']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  templateId: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type TemplateServiceSourceEjectInput = {
  projectId: Scalars['String']['input'];
  repoName: Scalars['String']['input'];
  repoOwner: Scalars['String']['input'];
  /** Provide multiple serviceIds when ejecting services from a monorepo. */
  serviceIds: Array<Scalars['String']['input']>;
  upstreamUrl: Scalars['String']['input'];
};

export type TemplateServicesConnection = {
  __typename?: 'TemplateServicesConnection';
  edges: Array<TemplateServicesConnectionEdge>;
  pageInfo: PageInfo;
};

export type TemplateServicesConnectionEdge = {
  __typename?: 'TemplateServicesConnectionEdge';
  cursor: Scalars['String']['output'];
  node: TemplateService;
};

export type TemplateStatus =
  | 'HIDDEN'
  | 'PUBLISHED'
  | 'UNPUBLISHED';

export type TemplateSupportMetricsUpdate = {
  supportHealthMetrics: Scalars['SupportHealthMetrics']['input'];
  templateId: Scalars['String']['input'];
};

export type TemplateUpsertConfigInput = {
  canvasConfig?: InputMaybe<Scalars['CanvasConfig']['input']>;
  name: Scalars['String']['input'];
  serializedConfig: Scalars['SerializedTemplateConfig']['input'];
  workspaceId: Scalars['String']['input'];
};

export type TemplateUpsertSettingsInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  image?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};

export type TemporalEvent = {
  __typename?: 'TemporalEvent';
  externalId: Scalars['String']['output'];
  failureDetails: Array<TemporalFailureDetail>;
  projectName: Scalars['String']['output'];
  rawData: Scalars['String']['output'];
  source: Scalars['String']['output'];
  timestamp: Scalars['DateTime']['output'];
  userId: Scalars['String']['output'];
  workspaceId: Scalars['String']['output'];
  workspaceName: Scalars['String']['output'];
};

export type TemporalFailureDetail = {
  __typename?: 'TemporalFailureDetail';
  activityType?: Maybe<Scalars['String']['output']>;
  failure: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type ThreadPayout = {
  __typename?: 'ThreadPayout';
  resourceId: Scalars['String']['output'];
};

export type TogglePlatformFeatureFlagInput = {
  flag: PlatformFeatureFlag;
  status: Scalars['Boolean']['input'];
};

export type TogglePlatformServiceInput = {
  platformServiceKey: PlatformServiceKey;
  reason?: InputMaybe<Scalars['String']['input']>;
  status: PlatformServiceStatus;
};

/** The result of a top metrics query. */
export type TopMetricsResult = {
  __typename?: 'TopMetricsResult';
  metrics: Array<MetricsResult>;
  projects: Array<Project>;
};

export type TotalUsage = {
  __typename?: 'TotalUsage';
  current?: Maybe<Scalars['Float']['output']>;
  estimated?: Maybe<Scalars['Float']['output']>;
};

export type TriggerDeploymentDiagnosisResponse = {
  __typename?: 'TriggerDeploymentDiagnosisResponse';
  streamId: Scalars['String']['output'];
  threadId: Scalars['String']['output'];
};

export type TriggerDeploymentFixPrResponse = {
  __typename?: 'TriggerDeploymentFixPRResponse';
  error?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type TriggerRoutingRepairInput = {
  environmentId: Scalars['String']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
  serviceId: Scalars['String']['input'];
};

export type TrustedDomain = {
  __typename?: 'TrustedDomain';
  domainName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  role: Scalars['String']['output'];
  status: TrustedDomainStatus;
  verificationData: TrustedDomainVerificationData;
  verificationType: Scalars['String']['output'];
  workspaceId: Scalars['String']['output'];
};

export type TrustedDomainStatus =
  | 'FAILED'
  | 'PENDING'
  | 'VERIFIED';

export type TrustedDomainVerificationData = {
  __typename?: 'TrustedDomainVerificationData';
  dnsHost?: Maybe<Scalars['String']['output']>;
  domainMatch?: Maybe<Domain>;
  domainStatus?: Maybe<CustomDomainStatus>;
  token?: Maybe<Scalars['String']['output']>;
};

export type TwoFactorInfo = {
  __typename?: 'TwoFactorInfo';
  hasRecoveryCodes: Scalars['Boolean']['output'];
  isVerified: Scalars['Boolean']['output'];
};

export type TwoFactorInfoCreateInput = {
  token: Scalars['String']['input'];
};

export type TwoFactorInfoSecret = {
  __typename?: 'TwoFactorInfoSecret';
  secret: Scalars['String']['output'];
  uri: Scalars['String']['output'];
};

export type TwoFactorInfoValidateInput = {
  token: Scalars['String']['input'];
  twoFactorLinkingKey?: InputMaybe<Scalars['String']['input']>;
};

export type TwoFactorMethod =
  | 'AUTHENTICATOR'
  | 'PASSKEY';

export type TwoFactorMethodCompliance =
  | 'AUTHENTICATOR'
  | 'PASSKEY';

export type TwoFactorMethodProjectWorkspace =
  | 'AUTHENTICATOR'
  | 'PASSKEY';

export type TwoFactorStatus = {
  __typename?: 'TwoFactorStatus';
  enabledMethods: Array<TwoFactorMethod>;
  isEnabled: Scalars['Boolean']['output'];
};

export type UnifiedWithdrawal = CreditWithdrawalInfo | Withdrawal | WithdrawalType;

export type UpdateNotificationRuleInput = {
  channelConfigs?: InputMaybe<Array<Scalars['NotificationChannelConfig']['input']>>;
  ephemeralEnvironments?: InputMaybe<Scalars['Boolean']['input']>;
  eventTypes?: InputMaybe<Array<Scalars['String']['input']>>;
  severities?: InputMaybe<Array<NotificationSeverity>>;
};

export type UpdateServiceEdgeConfigInput = {
  config: EdgeConfigInput;
  environmentId: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};

export type UsageAnomaly = Node & {
  __typename?: 'UsageAnomaly';
  actedOn?: Maybe<Scalars['DateTime']['output']>;
  action?: Maybe<UsageAnomalyAction>;
  actorId?: Maybe<Scalars['String']['output']>;
  flaggedAt: Scalars['DateTime']['output'];
  flaggedFor: UsageAnomalyFlagReason;
  id: Scalars['ID']['output'];
};

/** Possible actions for a UsageAnomaly. */
export type UsageAnomalyAction =
  | 'ALLOWED'
  | 'AUTOBANNED'
  | 'BANNED';

export type UsageAnomalyAllowInput = {
  usageAnomalyIds: Array<Scalars['String']['input']>;
};

/** Possible flag reasons for a UsageAnomaly. */
export type UsageAnomalyFlagReason =
  | 'HIGH_CPU_USAGE'
  | 'HIGH_DISK_USAGE'
  | 'HIGH_NETWORK_USAGE';

export type UsageLimit = Node & {
  __typename?: 'UsageLimit';
  agentHardLimitCents?: Maybe<Scalars['Int']['output']>;
  agentSoftLimitCents?: Maybe<Scalars['Int']['output']>;
  customerId: Scalars['String']['output'];
  hardLimit?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  isOverLimit: Scalars['Boolean']['output'];
  softLimit: Scalars['Int']['output'];
};

export type UsageLimitRemoveInput = {
  customerId: Scalars['String']['input'];
};

export type UsageLimitSetInput = {
  customerId: Scalars['String']['input'];
  hardLimitDollars?: InputMaybe<Scalars['Int']['input']>;
  softLimitDollars: Scalars['Int']['input'];
};

export type User = Node & {
  __typename?: 'User';
  agreedFairUse: Scalars['Boolean']['output'];
  apiTokenRateLimit?: Maybe<ApiTokenRateLimit>;
  avatar?: Maybe<Scalars['String']['output']>;
  /** @deprecated Resolve via the user's workspaces and check for an active BAN restriction. This field will be removed after the WorkspaceRestriction migration completes. */
  banReason?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  featureFlags: Array<ActiveFeatureFlag>;
  flags: Array<UserFlag>;
  githubProviderId?: Maybe<Scalars['String']['output']>;
  githubUsername?: Maybe<Scalars['String']['output']>;
  has2FA: Scalars['Boolean']['output'];
  hasPasskeys: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  isAdmin: Scalars['Boolean']['output'];
  isConductor: Scalars['Boolean']['output'];
  isVerified: Scalars['Boolean']['output'];
  lastLogin: Scalars['DateTime']['output'];
  name?: Maybe<Scalars['String']['output']>;
  platformFeatureFlags: Array<ActivePlatformFlag>;
  profile?: Maybe<UserProfile>;
  /** @deprecated This field will not return anything anymore, go through the workspace's projects */
  projects: UserProjectsConnection;
  providerAuths: UserProviderAuthsConnection;
  registrationStatus: RegistrationStatus;
  restrictionHistory: Array<UserRestrictionHistoryEntry>;
  riskLevel?: Maybe<Scalars['Float']['output']>;
  termsAgreedOn?: Maybe<Scalars['DateTime']['output']>;
  username?: Maybe<Scalars['String']['output']>;
  /** @deprecated Use user.workspaces instead, no user are associated to a workspace */
  workspace?: Maybe<Workspace>;
  /** Workspaces user is member of */
  workspaces: Array<Workspace>;
};


export type UserProjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type UserProviderAuthsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type UserRestrictionHistoryArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
};

export type UserBanInput = {
  reason: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};

export type UserFlag =
  | 'BETA';

export type UserFlagsRemoveInput = {
  flags: Array<UserFlag>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type UserFlagsSetInput = {
  flags: Array<UserFlag>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type UserGithubRepo = Node & {
  __typename?: 'UserGithubRepo';
  createdAt: Scalars['DateTime']['output'];
  defaultBranch: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  fullName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  installationId: Scalars['String']['output'];
  isPrivate: Scalars['Boolean']['output'];
  lastPushedAt: Scalars['DateTime']['output'];
  name: Scalars['String']['output'];
  ownerAvatarUrl?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type UserKickbackEarnings = {
  __typename?: 'UserKickbackEarnings';
  total_amount: Scalars['Float']['output'];
};

export type UserProfile = {
  __typename?: 'UserProfile';
  bio?: Maybe<Scalars['String']['output']>;
  isPublic: Scalars['Boolean']['output'];
  website?: Maybe<Scalars['String']['output']>;
};

export type UserProfileResponse = {
  __typename?: 'UserProfileResponse';
  avatar?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  customerId?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  isTrialing?: Maybe<Scalars['Boolean']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  profile: UserProfile;
  /** Gets all public projects for a user. */
  publicProjects: UserProfileResponsePublicProjectsConnection;
  /** @deprecated There are no personal templates anymore, they all belong to a workspace */
  publishedTemplates: Array<SimilarTemplate>;
  state?: Maybe<Scalars['String']['output']>;
  totalDeploys: Scalars['Int']['output'];
  username?: Maybe<Scalars['String']['output']>;
};


export type UserProfileResponsePublicProjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type UserProfileResponsePublicProjectsConnection = {
  __typename?: 'UserProfileResponsePublicProjectsConnection';
  edges: Array<UserProfileResponsePublicProjectsConnectionEdge>;
  pageInfo: PageInfo;
};

export type UserProfileResponsePublicProjectsConnectionEdge = {
  __typename?: 'UserProfileResponsePublicProjectsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Project;
};

export type UserProfileUpdateInput = {
  bio?: InputMaybe<Scalars['String']['input']>;
  isPublic: Scalars['Boolean']['input'];
  website?: InputMaybe<Scalars['String']['input']>;
};

export type UserProjectsConnection = {
  __typename?: 'UserProjectsConnection';
  edges: Array<UserProjectsConnectionEdge>;
  pageInfo: PageInfo;
};

export type UserProjectsConnectionEdge = {
  __typename?: 'UserProjectsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Project;
};

export type UserProviderAuthsConnection = {
  __typename?: 'UserProviderAuthsConnection';
  edges: Array<UserProviderAuthsConnectionEdge>;
  pageInfo: PageInfo;
};

export type UserProviderAuthsConnectionEdge = {
  __typename?: 'UserProviderAuthsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: ProviderAuth;
};

export type UserRestrictionHistoryEntry = {
  __typename?: 'UserRestrictionHistoryEntry';
  membershipRole?: Maybe<TeamRole>;
  restriction: WorkspaceRestriction;
  userAppealedRestriction: Scalars['Boolean']['output'];
  workspace: Workspace;
};

export type UserRiskLevelUpdateInput = {
  riskLevel?: InputMaybe<Scalars['Float']['input']>;
  userId: Scalars['String']['input'];
};

export type UserStanding = {
  __typename?: 'UserStanding';
  goodStandingWorkspaceCount: Scalars['Int']['output'];
  /** Whether this user is admin of any Enterprise or Enterprise POC workspace */
  isEnterprise: Scalars['Boolean']['output'];
  joinDate: Scalars['String']['output'];
  /** Most recent high-value paid invoice from good standing workspaces */
  recentHighValueInvoice: InvoiceStandingDetails;
};

export type UserUpdateInput = {
  avatar?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  username?: InputMaybe<Scalars['String']['input']>;
};

export type UserWithClashingIp = {
  __typename?: 'UserWithClashingIP';
  email: Scalars['String']['output'];
  id: Scalars['String']['output'];
  isBanned: Scalars['Boolean']['output'];
};

export type UsersFilterInput = {
  admin?: InputMaybe<Scalars['Boolean']['input']>;
  banned?: InputMaybe<Scalars['Boolean']['input']>;
  filter?: InputMaybe<Scalars['String']['input']>;
  referredUsers?: InputMaybe<Scalars['Boolean']['input']>;
  riskLevel?: InputMaybe<Scalars['Float']['input']>;
  usageSubscription?: InputMaybe<Scalars['Boolean']['input']>;
};

export type Variable = Node & {
  __typename?: 'Variable';
  createdAt: Scalars['DateTime']['output'];
  environment: Environment;
  environmentId?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isSealed: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  plugin: Plugin;
  /** @deprecated Plugins have been removed */
  pluginId?: Maybe<Scalars['String']['output']>;
  references: Array<Scalars['String']['output']>;
  service: Service;
  serviceId?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type VariableCollectionUpsertInput = {
  environmentId: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
  /** When set to true, removes all existing variables before upserting the new collection. */
  replace?: InputMaybe<Scalars['Boolean']['input']>;
  serviceId?: InputMaybe<Scalars['String']['input']>;
  /** Skip deploys for affected services */
  skipDeploys?: InputMaybe<Scalars['Boolean']['input']>;
  variables: Scalars['EnvironmentVariables']['input'];
};

export type VariableDeleteInput = {
  environmentId: Scalars['String']['input'];
  name: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['String']['input']>;
};

export type VariableUpsertInput = {
  environmentId: Scalars['String']['input'];
  name: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
  serviceId?: InputMaybe<Scalars['String']['input']>;
  /** Skip deploys for affected services */
  skipDeploys?: InputMaybe<Scalars['Boolean']['input']>;
  value: Scalars['String']['input'];
};

export type VariablesForEnvironmentInput = {
  type?: EnvironmentVariableType;
};

export type VercelAccount = {
  __typename?: 'VercelAccount';
  id: Scalars['String']['output'];
  integrationAuthId: Scalars['String']['output'];
  isUser: Scalars['Boolean']['output'];
  name?: Maybe<Scalars['String']['output']>;
  projects: Array<VercelProject>;
  slug?: Maybe<Scalars['String']['output']>;
};

export type VercelInfo = {
  __typename?: 'VercelInfo';
  accounts: Array<VercelAccount>;
};

export type VercelProject = {
  __typename?: 'VercelProject';
  accountId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type Volume = Node & {
  __typename?: 'Volume';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  project: Project;
  projectId: Scalars['String']['output'];
  /** @deprecated Use environment.volumeInstances for properly scoped access control */
  volumeInstances: VolumeVolumeInstancesConnection;
};


export type VolumeVolumeInstancesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type VolumeCreateInput = {
  /** The environment to deploy the volume instances into. If `null`, the volume will not be deployed to any environment. `undefined` will deploy to all environments. */
  environmentId?: InputMaybe<Scalars['String']['input']>;
  /** The path in the container to mount the volume to */
  mountPath: Scalars['String']['input'];
  /** The project to create the volume in */
  projectId: Scalars['String']['input'];
  /** The region to create the volume instances in. If not provided, the default region will be used. */
  region?: InputMaybe<Scalars['String']['input']>;
  /** The service to attach the volume to. If not provided, the volume will be disconnected. */
  serviceId?: InputMaybe<Scalars['String']['input']>;
  /** The size of the volume in MB. If not provided, the default size will be used. */
  sizeMB?: InputMaybe<Scalars['Int']['input']>;
  /** The IP address of the stacker to create the volume instances on. */
  stackerIP?: InputMaybe<Scalars['String']['input']>;
};

export type VolumeDetachmentReason =
  | 'ORPHANED_STATEFUL'
  | 'TRULY_DETACHED';

export type VolumeInstance = Node & {
  __typename?: 'VolumeInstance';
  createdAt: Scalars['DateTime']['output'];
  currentSizeMB: Scalars['Float']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  environment: Environment;
  environmentId: Scalars['String']['output'];
  externalId?: Maybe<Scalars['String']['output']>;
  forks: VolumeInstanceForksConnection;
  id: Scalars['ID']['output'];
  isForked: Scalars['Boolean']['output'];
  isPendingDeletion: Scalars['Boolean']['output'];
  maxAvailableSizeMB: Scalars['Float']['output'];
  mountPath: Scalars['String']['output'];
  mountPathHistory: Array<VolumeInstanceMountPathHistory>;
  parentVolumeInstanceId?: Maybe<Scalars['String']['output']>;
  region?: Maybe<Scalars['String']['output']>;
  service: Service;
  serviceId?: Maybe<Scalars['String']['output']>;
  sizeMB: Scalars['Int']['output'];
  stacker?: Maybe<Scalars['String']['output']>;
  state?: Maybe<VolumeState>;
  volume: Volume;
  volumeId: Scalars['String']['output'];
};


export type VolumeInstanceForksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type VolumeInstanceBackup = {
  __typename?: 'VolumeInstanceBackup';
  createdAt: Scalars['DateTime']['output'];
  creatorId?: Maybe<Scalars['String']['output']>;
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  externalId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
  referencedMB?: Maybe<Scalars['Int']['output']>;
  scheduleId?: Maybe<Scalars['String']['output']>;
  usedMB?: Maybe<Scalars['Int']['output']>;
  volumeInstanceSizeMB?: Maybe<Scalars['Int']['output']>;
};

export type VolumeInstanceBackupSchedule = Node & {
  __typename?: 'VolumeInstanceBackupSchedule';
  createdAt: Scalars['DateTime']['output'];
  cron: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  kind: VolumeInstanceBackupScheduleKind;
  name: Scalars['String']['output'];
  retentionSeconds?: Maybe<Scalars['Int']['output']>;
};

export type VolumeInstanceBackupScheduleKind =
  | 'DAILY'
  | 'MONTHLY'
  | 'WEEKLY';

export type VolumeInstanceChangeRegionInput = {
  /** The region of the volume instance. If provided and different from the current region, a migration of the volume to the new region will be triggered, which will cause downtime for services that have this volume attached. */
  region: Scalars['String']['input'];
};

export type VolumeInstanceForksConnection = {
  __typename?: 'VolumeInstanceForksConnection';
  edges: Array<VolumeInstanceForksConnectionEdge>;
  pageInfo: PageInfo;
};

export type VolumeInstanceForksConnectionEdge = {
  __typename?: 'VolumeInstanceForksConnectionEdge';
  cursor: Scalars['String']['output'];
  node: VolumeInstance;
};

export type VolumeInstanceMigration = {
  __typename?: 'VolumeInstanceMigration';
  environmentId: Scalars['String']['output'];
  projectId: Scalars['String']['output'];
  serviceId?: Maybe<Scalars['String']['output']>;
  volumeId: Scalars['String']['output'];
  volumeInstanceExternalId: Scalars['String']['output'];
  volumeInstanceId: Scalars['String']['output'];
};

export type VolumeInstanceMigrationsQueueState = {
  __typename?: 'VolumeInstanceMigrationsQueueState';
  error?: Maybe<Scalars['String']['output']>;
  inProgressMigrations: Array<VolumeInstanceMigration>;
  isPaused: Scalars['Boolean']['output'];
  maxConcurrent: Scalars['Int']['output'];
  queuedMigrations: Array<VolumeInstanceMigration>;
  stackerId: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type VolumeInstanceMountPathHistory = Node & {
  __typename?: 'VolumeInstanceMountPathHistory';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  mountPath: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  volumeInstance: VolumeInstance;
};

export type VolumeInstanceReplicationProgress = {
  __typename?: 'VolumeInstanceReplicationProgress';
  bytesTransferred: Scalars['BigInt']['output'];
  percentComplete: Scalars['Float']['output'];
  timestamp: Scalars['DateTime']['output'];
  transferRateMbps?: Maybe<Scalars['Float']['output']>;
};

export type VolumeInstanceResizeInput = {
  /** Whether to perform an online resize. If true, the volume will be resized without detaching it from the service. If false, the volume will be resized by detaching it from the service first. Default is false. */
  onlineResize?: InputMaybe<Scalars['Boolean']['input']>;
  /** The size of the volume instance in MB. You can only resize a volume upwards */
  targetSizeMB: Scalars['Int']['input'];
};

export type VolumeInstanceUpdateInput = {
  /** The mount path of the volume instance. If not provided, the mount path will not be updated. */
  mountPath?: InputMaybe<Scalars['String']['input']>;
  /** The service to attach the volume to. If not provided, the volume will be disconnected. */
  serviceId?: InputMaybe<Scalars['String']['input']>;
  /** The state of the volume instance. If not provided, the state will not be updated. */
  state?: InputMaybe<VolumeState>;
};

export type VolumeLockStatus = {
  __typename?: 'VolumeLockStatus';
  operation?: Maybe<Scalars['String']['output']>;
  timestamp: Scalars['String']['output'];
};

export type VolumeLockStatusUpdate = {
  __typename?: 'VolumeLockStatusUpdate';
  lockStatus: VolumeLockStatus;
  volumeInstanceId: Scalars['String']['output'];
};

export type VolumeMigrationEvent = {
  __typename?: 'VolumeMigrationEvent';
  acknowledgedAt?: Maybe<Scalars['DateTime']['output']>;
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  deploymentId: Scalars['String']['output'];
  destVolumeInstance: VolumeMigrationEventVolumeInstance;
  id: Scalars['String']['output'];
  reason?: Maybe<Scalars['String']['output']>;
  sourceServiceId: Scalars['String']['output'];
  sourceVolumeInstance: VolumeMigrationEventVolumeInstance;
  updatedAt: Scalars['DateTime']['output'];
};

export type VolumeMigrationEventVolume = {
  __typename?: 'VolumeMigrationEventVolume';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  projectId: Scalars['String']['output'];
};

export type VolumeMigrationEventVolumeInstance = {
  __typename?: 'VolumeMigrationEventVolumeInstance';
  environmentId: Scalars['String']['output'];
  externalId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  mountPath: Scalars['String']['output'];
  region?: Maybe<Scalars['String']['output']>;
  serviceId?: Maybe<Scalars['String']['output']>;
  volume: VolumeMigrationEventVolume;
};

export type VolumeReplicationProgressUpdate = {
  __typename?: 'VolumeReplicationProgressUpdate';
  currentSnapshot: VolumeSnapshotReplicationProgressUpdate;
  destExternalId: Scalars['String']['output'];
  destRegion?: Maybe<Scalars['String']['output']>;
  destStackerId?: Maybe<Scalars['String']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  estimatedTimeRemainingMs?: Maybe<Scalars['BigInt']['output']>;
  history: Array<VolumeInstanceReplicationProgress>;
  nbSnapshots: Scalars['Int']['output'];
  offlineBytesTransferred: Scalars['BigInt']['output'];
  offlineTotalBytes: Scalars['BigInt']['output'];
  onlineBytesTransferred: Scalars['BigInt']['output'];
  onlineTotalBytes: Scalars['BigInt']['output'];
  percentComplete: Scalars['Float']['output'];
  snapshotsSizes: Array<Scalars['BigInt']['output']>;
  srcExternalId: Scalars['String']['output'];
  srcRegion?: Maybe<Scalars['String']['output']>;
  srcStackerId?: Maybe<Scalars['String']['output']>;
  status: ReplicateVolumeInstanceStatus;
  transferRateMbps?: Maybe<Scalars['Float']['output']>;
};

export type VolumeSnapshotReplicationProgressUpdate = {
  __typename?: 'VolumeSnapshotReplicationProgressUpdate';
  bytesTransferred: Scalars['BigInt']['output'];
  compressedBytesTransferred: Scalars['BigInt']['output'];
  compressedTransferRateMbps?: Maybe<Scalars['Float']['output']>;
  elapsedMs: Scalars['Int']['output'];
  error?: Maybe<Scalars['String']['output']>;
  estimatedTimeRemainingMs?: Maybe<Scalars['BigInt']['output']>;
  index: Scalars['Int']['output'];
  percentComplete: Scalars['Float']['output'];
  startedAt?: Maybe<Scalars['DateTime']['output']>;
  status: ReplicateVolumeInstanceSnapshotStatus;
  totalBytes: Scalars['BigInt']['output'];
  transferRateMbps?: Maybe<Scalars['Float']['output']>;
};

export type VolumeState =
  | 'DELETED'
  | 'DELETING'
  | 'ERROR'
  | 'MIGRATING'
  | 'MIGRATION_PENDING'
  | 'READY'
  | 'RESTORING'
  | 'UPDATING';

export type VolumeUpdateInput = {
  /** The name of the volume */
  name?: InputMaybe<Scalars['String']['input']>;
};

export type VolumeVolumeInstancesConnection = {
  __typename?: 'VolumeVolumeInstancesConnection';
  edges: Array<VolumeVolumeInstancesConnectionEdge>;
  pageInfo: PageInfo;
};

export type VolumeVolumeInstancesConnectionEdge = {
  __typename?: 'VolumeVolumeInstancesConnectionEdge';
  cursor: Scalars['String']['output'];
  node: VolumeInstance;
};

export type Withdrawal = Node & {
  __typename?: 'Withdrawal';
  amount: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  customerId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  status: WithdrawalStatusType;
  updatedAt: Scalars['DateTime']['output'];
  withdrawalAccount: WithdrawalAccount;
  withdrawalAccountId: Scalars['String']['output'];
};

export type WithdrawalAccount = Node & {
  __typename?: 'WithdrawalAccount';
  customerId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  platform: WithdrawalPlatformTypes;
  platformDetails: Scalars['String']['output'];
  stripeConnectInfo?: Maybe<WithdrawalAccountStripeConnectInfo>;
};

export type WithdrawalAccountInfo = {
  __typename?: 'WithdrawalAccountInfo';
  customerId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  platform: WithdrawalPlatformTypes;
  platformDetails: Scalars['String']['output'];
  stripeConnectInfo?: Maybe<WithdrawalAccountStripeConnectInfo>;
};

export type WithdrawalAccountStripeConnectInfo = {
  __typename?: 'WithdrawalAccountStripeConnectInfo';
  bankLast4?: Maybe<Scalars['String']['output']>;
  cardLast4?: Maybe<Scalars['String']['output']>;
  hasOnboarded: Scalars['Boolean']['output'];
  needsAttention: Scalars['Boolean']['output'];
};

export type WithdrawalPlatformTypes =
  | 'BMAC'
  | 'GITHUB'
  | 'PAYPAL'
  | 'STRIPE_CONNECT';

export type WithdrawalRequestInput = {
  amount: Scalars['Float']['input'];
  customerId: Scalars['String']['input'];
  withdrawalAccountId: Scalars['String']['input'];
};

export type WithdrawalStatusType =
  | 'CANCELLED'
  | 'COMPLETED'
  | 'FAILED'
  | 'PENDING';

export type WithdrawalToCreditInput = {
  amount: Scalars['Float']['input'];
  customerId: Scalars['String']['input'];
};

export type WithdrawalType = {
  __typename?: 'WithdrawalType';
  amount: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  customerId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  status: WithdrawalStatusType;
  updatedAt: Scalars['DateTime']['output'];
  withdrawalAccount: WithdrawalAccountInfo;
  withdrawalAccountId: Scalars['String']['output'];
};

export type WorkflowId = {
  __typename?: 'WorkflowId';
  workflowId?: Maybe<Scalars['String']['output']>;
};

export type WorkflowResult = {
  __typename?: 'WorkflowResult';
  error?: Maybe<Scalars['String']['output']>;
  status: WorkflowStatus;
};

export type WorkflowStatus =
  | 'Complete'
  | 'Error'
  | 'NotFound'
  | 'Running';

export type Workspace = Node & {
  __typename?: 'Workspace';
  adoptionHistory: Array<AdoptionInfo>;
  adoptionLevel: Scalars['Float']['output'];
  /** @deprecated Deprecated regions are no longer supported. */
  allowDeprecatedRegions?: Maybe<Scalars['Boolean']['output']>;
  apiTokenRateLimit?: Maybe<ApiTokenRateLimit>;
  avatar?: Maybe<Scalars['String']['output']>;
  /** @deprecated Use `workspace.restriction` and check for an active BAN restriction. This field will be removed after the WorkspaceRestriction migration completes. */
  banReason?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  currentSessionHasAccess?: Maybe<Scalars['Boolean']['output']>;
  customer: Customer;
  deploymentsNeedApproval: DeploymentsNeedApproval;
  discordRole?: Maybe<Scalars['String']['output']>;
  /** Whether 2FA enforcement is enabled for this workspace. */
  has2FAEnforcement: Scalars['Boolean']['output'];
  /** Whether automatic deployment diagnosis is enabled for this workspace. */
  hasAutomaticDiagnosis: Scalars['Boolean']['output'];
  /** @deprecated Deprecated in favour of the SpendCommitment schema. */
  hasBAA?: Maybe<Scalars['Boolean']['output']>;
  hasCompanyDeploymentSources: Scalars['Boolean']['output'];
  /** Whether this workspace has access to guardrails policies. */
  hasGuardrailsAccess: Scalars['Boolean']['output'];
  /** @deprecated Deprecated in favour of the SpendCommitment schema. */
  hasRBAC: Scalars['Boolean']['output'];
  hasSAML: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  identityProviders: WorkspaceIdentityProvidersConnection;
  isVipWorkspace: Scalars['Boolean']['output'];
  limitsVersion: LimitsVersion;
  members: Array<WorkspaceMember>;
  name: Scalars['String']['output'];
  partnerProfile?: Maybe<PartnerProfile>;
  plan: Plan;
  preferredRegion?: Maybe<Scalars['String']['output']>;
  /** Total number of projects in this workspace. Used by the dashboard to show an exact count without paginating through every project. */
  projectCount: Scalars['Int']['output'];
  projects: WorkspaceProjectsConnection;
  /** Whether the current user's access is redacted due to pending 2FA requirement. Returns true if the user is a workspace member, workspace has 2FA enforcement enabled, and the current user needs to enable 2FA. */
  redactedDueTo2FAPending: Scalars['Boolean']['output'];
  referredUsers: Array<ReferralUser>;
  restriction?: Maybe<WorkspaceRestriction>;
  restrictions: WorkspaceRestrictionsConnection;
  slackChannelId?: Maybe<Scalars['String']['output']>;
  /** @deprecated Use plan field instead */
  subscriptionModel: SubscriptionModel;
  subscriptionPlanLimit?: Maybe<Scalars['SubscriptionPlanLimit']['output']>;
  supportTierOverride?: Maybe<SupportTierOverride>;
  /** @deprecated Teams are being removed from the system, don't use it */
  team?: Maybe<Team>;
  updatedAt: Scalars['DateTime']['output'];
  /** Get a list of user emails in the workspace who do not have verified 2FA enabled. Returns an empty array if all users have 2FA enabled. */
  usersWithout2FA: Array<Scalars['String']['output']>;
  viewerRole?: Maybe<TeamRole>;
};


export type WorkspaceIdentityProvidersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type WorkspaceProjectCountArgs = {
  includeDeleted?: InputMaybe<Scalars['Boolean']['input']>;
};


export type WorkspaceProjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type WorkspaceRestrictionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type WorkspaceBanInput = {
  banReason: Scalars['String']['input'];
  threadId?: InputMaybe<Scalars['String']['input']>;
};

export type WorkspaceCompletePostCreationTasksInput = {
  plan: Plan;
  subscriptionId: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};

export type WorkspaceCreateAndSubscribeInput = {
  avatar?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  paymentMethodId: Scalars['String']['input'];
  plan: Plan;
};

export type WorkspaceCreateAndSubscribeV2Response = {
  __typename?: 'WorkspaceCreateAndSubscribeV2Response';
  customerId: Scalars['String']['output'];
  paymentIntentClientSecret?: Maybe<Scalars['String']['output']>;
  subscriptionId: Scalars['String']['output'];
  subscriptionStatus: StripeSubscriptionStatus;
  workspaceId: Scalars['String']['output'];
};

export type WorkspaceDowngradesUpdate = {
  __typename?: 'WorkspaceDowngradesUpdate';
  blockers: Array<Scalars['String']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  userId: Scalars['String']['output'];
  workspaceId: Scalars['String']['output'];
};

export type WorkspaceIdPConnection = {
  __typename?: 'WorkspaceIdPConnection';
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  provider?: Maybe<Scalars['String']['output']>;
  status: WorkspaceIdPConnectionStatus;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type WorkspaceIdPConnectionStatus =
  | 'ACTIVE'
  | 'DRAFT'
  | 'INACTIVE'
  | 'PENDING'
  | 'VALIDATING';

export type WorkspaceIdentityProvider = Node & {
  __typename?: 'WorkspaceIdentityProvider';
  connection: WorkspaceIdPConnection;
  createdAt: Scalars['DateTime']['output'];
  enforcementEnabledAt?: Maybe<Scalars['DateTime']['output']>;
  externalId: Scalars['String']['output'];
  externalLink: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  updatedAt: Scalars['DateTime']['output'];
  workspace: Workspace;
  workspaceId: Scalars['String']['output'];
};

export type WorkspaceIdentityProviderConfigureResponse = {
  __typename?: 'WorkspaceIdentityProviderConfigureResponse';
  link: Scalars['String']['output'];
};

export type WorkspaceIdentityProviderCreateInput = {
  externalId?: InputMaybe<Scalars['String']['input']>;
  organizationName?: InputMaybe<Scalars['String']['input']>;
  workspaceId: Scalars['String']['input'];
};

export type WorkspaceIdentityProvidersConnection = {
  __typename?: 'WorkspaceIdentityProvidersConnection';
  edges: Array<WorkspaceIdentityProvidersConnectionEdge>;
  pageInfo: PageInfo;
};

export type WorkspaceIdentityProvidersConnectionEdge = {
  __typename?: 'WorkspaceIdentityProvidersConnectionEdge';
  cursor: Scalars['String']['output'];
  node: WorkspaceIdentityProvider;
};

export type WorkspaceInviteCodeCreateInput = {
  role: Scalars['String']['input'];
};

export type WorkspaceMember = {
  __typename?: 'WorkspaceMember';
  avatar?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  /** Only retrieved if requested by an admin */
  featureFlags?: Maybe<Array<ActiveFeatureFlag>>;
  id: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
  role: TeamRole;
  /** Only retrieved if requested by an admin */
  twoFactorAuthEnabled?: Maybe<Scalars['Boolean']['output']>;
};

export type WorkspaceMoverInfo = {
  __typename?: 'WorkspaceMoverInfo';
  bottomWorkspaces: Array<AdoptionInfo>;
  negativeMovement?: Maybe<Scalars['Float']['output']>;
  positiveMovement?: Maybe<Scalars['Float']['output']>;
  sumDelta?: Maybe<Scalars['Float']['output']>;
  topWorkspaces: Array<AdoptionInfo>;
};

export type WorkspacePermissionChangeInput = {
  role: TeamRole;
  userId: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};

export type WorkspacePolicy = Node & {
  __typename?: 'WorkspacePolicy';
  deploySourceAllowlist: WorkspacePolicyDeploySourceAllowlistConnection;
  id: Scalars['ID']['output'];
  restrictDeploysToAllowedSources: Scalars['Boolean']['output'];
  restrictPublicTcpProxies: Scalars['Boolean']['output'];
  restrictRailwayDomainGeneration: Scalars['Boolean']['output'];
};


export type WorkspacePolicyDeploySourceAllowlistArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type WorkspacePolicyDeploySourceAllowlist = Node & {
  __typename?: 'WorkspacePolicyDeploySourceAllowlist';
  addedBy?: Maybe<User>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  sourceIcon?: Maybe<Scalars['String']['output']>;
  sourceId: Scalars['String']['output'];
  sourceName: Scalars['String']['output'];
  sourceType: WorkspacePolicyDeploySourceType;
};

export type WorkspacePolicyDeploySourceAllowlistConnection = {
  __typename?: 'WorkspacePolicyDeploySourceAllowlistConnection';
  edges: Array<WorkspacePolicyDeploySourceAllowlistConnectionEdge>;
  pageInfo: PageInfo;
};

export type WorkspacePolicyDeploySourceAllowlistConnectionEdge = {
  __typename?: 'WorkspacePolicyDeploySourceAllowlistConnectionEdge';
  cursor: Scalars['String']['output'];
  node: WorkspacePolicyDeploySourceAllowlist;
};

export type WorkspacePolicyDeploySourceType =
  | 'GITHUB_ORG';

export type WorkspacePolicyItemUpdateInput = {
  enabled: Scalars['Boolean']['input'];
  policy: WorkspacePolicyName;
};

export type WorkspacePolicyName =
  | 'RESTRICT_DEPLOYS_TO_ALLOWED_SOURCES'
  | 'RESTRICT_PUBLIC_TCP_PROXIES'
  | 'RESTRICT_RAILWAY_DOMAIN_GENERATION';

export type WorkspacePolicySelectableDeploySource = {
  __typename?: 'WorkspacePolicySelectableDeploySource';
  sourceIcon?: Maybe<Scalars['String']['output']>;
  sourceId: Scalars['String']['output'];
  sourceName: Scalars['String']['output'];
  sourceType: WorkspacePolicyDeploySourceType;
};

export type WorkspaceProjectsConnection = {
  __typename?: 'WorkspaceProjectsConnection';
  edges: Array<WorkspaceProjectsConnectionEdge>;
  pageInfo: PageInfo;
};

export type WorkspaceProjectsConnectionEdge = {
  __typename?: 'WorkspaceProjectsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: Project;
};

export type WorkspaceResourcesStopInput = {
  reason: Scalars['String']['input'];
};

export type WorkspaceRestrictInput = {
  reason: Scalars['String']['input'];
  stopDeploys: Scalars['Boolean']['input'];
  threadId?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<RestrictionType>;
};

export type WorkspaceRestriction = Node & {
  __typename?: 'WorkspaceRestriction';
  /** Currently SUBMITTED or REVIEWING appeal on this restriction, if any. */
  activeAppeal?: Maybe<WorkspaceRestrictionAppeal>;
  actor?: Maybe<User>;
  actorId?: Maybe<Scalars['String']['output']>;
  /** Whether the current viewer can submit a USER-type appeal on this restriction. False when the viewer is the sole member or the sole admin of the restricted workspace — approving such an appeal would orphan the workspace. */
  allowsUserAppeal: Scalars['Boolean']['output'];
  appeals: Array<WorkspaceRestrictionAppeal>;
  createdAt: Scalars['DateTime']['output'];
  deploysStopped: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  liftedBy?: Maybe<User>;
  reason: Scalars['String']['output'];
  status: RestrictionStatus;
  terminatedAt?: Maybe<Scalars['DateTime']['output']>;
  terminationReason?: Maybe<Scalars['String']['output']>;
  threadId?: Maybe<Scalars['String']['output']>;
  type: RestrictionType;
  /** The viewer's own appeal on this restriction (any type), if any. A user can only submit one appeal per restriction across all types — this field is the form's authoritative gate. */
  viewerAppeal?: Maybe<WorkspaceRestrictionAppeal>;
  /** The single WORKSPACE-type appeal on this restriction, if any. Visible to all workspace admins so a co-admin can see when another admin has already filed. */
  workspaceAppeal?: Maybe<WorkspaceRestrictionAppeal>;
};

export type WorkspaceRestrictionAppeal = Node & {
  __typename?: 'WorkspaceRestrictionAppeal';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  message: Scalars['String']['output'];
  resolutionNote?: Maybe<Scalars['String']['output']>;
  resolvedAt?: Maybe<Scalars['DateTime']['output']>;
  resolvedBy?: Maybe<User>;
  reviewStartedAt?: Maybe<Scalars['DateTime']['output']>;
  status: WorkspaceRestrictionAppealStatus;
  submittedBy?: Maybe<User>;
  threadId?: Maybe<Scalars['String']['output']>;
  type: WorkspaceRestrictionAppealType;
};

export type WorkspaceRestrictionAppealStatus =
  | 'APPROVED'
  | 'DENIED'
  | 'REVIEWING'
  | 'SUBMITTED';

export type WorkspaceRestrictionAppealType =
  | 'USER'
  | 'WORKSPACE';

export type WorkspaceRestrictionsConnection = {
  __typename?: 'WorkspaceRestrictionsConnection';
  edges: Array<WorkspaceRestrictionsConnectionEdge>;
  pageInfo: PageInfo;
};

export type WorkspaceRestrictionsConnectionEdge = {
  __typename?: 'WorkspaceRestrictionsConnectionEdge';
  cursor: Scalars['String']['output'];
  node: WorkspaceRestriction;
};

export type WorkspaceStanding = {
  __typename?: 'WorkspaceStanding';
  /** Whether this workspace is Enterprise or Enterprise POC */
  isEnterprise: Scalars['Boolean']['output'];
  joinDate: Scalars['String']['output'];
  /** Most recent high-value paid invoice */
  recentHighValueInvoice: InvoiceStandingDetails;
};

export type WorkspaceTopMoversInput = {
  parameter: ParamMeasurement;
  /** The start of the period to get metrics for. */
  startDate: Scalars['DateTime']['input'];
};

export type WorkspaceTrustedDomainCreateInput = {
  domainName: Scalars['String']['input'];
  role: Scalars['String']['input'];
  workspaceId: Scalars['String']['input'];
};

export type WorkspaceUnbanInput = {
  reason?: InputMaybe<Scalars['String']['input']>;
  /** @deprecated We don't accept a thread on resolution yet. */
  threadId?: InputMaybe<Scalars['String']['input']>;
};

export type WorkspaceUnrestrictInput = {
  reason?: InputMaybe<Scalars['String']['input']>;
  /** @deprecated We don't accept a thread on resolution yet. */
  threadId?: InputMaybe<Scalars['String']['input']>;
};

export type WorkspaceUpdateInput = {
  avatar?: InputMaybe<Scalars['String']['input']>;
  /** @deprecated Deprecated in favour of the SpendCommitment schema. */
  hasBAA?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  preferredRegion?: InputMaybe<Scalars['String']['input']>;
};

export type WorkspaceUpdatePlanResponse = {
  __typename?: 'WorkspaceUpdatePlanResponse';
  paymentIntentClientSecret?: Maybe<Scalars['String']['output']>;
  subscriptionId?: Maybe<Scalars['String']['output']>;
  subscriptionStatus?: Maybe<StripeSubscriptionStatus>;
  success: Scalars['Boolean']['output'];
};

export type WorkspaceUserInviteInput = {
  code: Scalars['String']['input'];
  email: Scalars['String']['input'];
};

export type WorkspaceUserRemoveInput = {
  userId: Scalars['String']['input'];
};

export type CustomerTogglePayoutsToCreditsInput = {
  isWithdrawingToCredits: Scalars['Boolean']['input'];
};

export type RailwaySandboxFieldsFragment = { __typename?: 'Sandbox', id: string, status: SandboxStatus, environmentId: string, region: string, idleTimeoutMinutes?: number | null, createdAt: string };

export type RailwaySandboxQueryVariables = Exact<{
  environmentId: Scalars['String']['input'];
  id: Scalars['String']['input'];
}>;


export type RailwaySandboxQuery = { __typename?: 'Query', sandbox?: { __typename?: 'Sandbox', id: string, status: SandboxStatus, environmentId: string, region: string, idleTimeoutMinutes?: number | null, createdAt: string } | null };

export type RailwaySandboxesQueryVariables = Exact<{
  environmentId: Scalars['String']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
}>;


export type RailwaySandboxesQuery = { __typename?: 'Query', sandboxes: { __typename?: 'QuerySandboxesConnection', edges: Array<{ __typename?: 'QuerySandboxesConnectionEdge', node: { __typename?: 'Sandbox', id: string, status: SandboxStatus, environmentId: string, region: string, idleTimeoutMinutes?: number | null, createdAt: string } }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null } } };

export type RailwaySandboxCreateMutationVariables = Exact<{
  input: SandboxCreateInput;
}>;


export type RailwaySandboxCreateMutation = { __typename?: 'Mutation', sandboxCreate: { __typename?: 'Sandbox', id: string, status: SandboxStatus, environmentId: string, region: string, idleTimeoutMinutes?: number | null, createdAt: string } };

export type RailwaySandboxExecMutationVariables = Exact<{
  id: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  command: Scalars['String']['input'];
  timeoutSec?: InputMaybe<Scalars['Int']['input']>;
}>;


export type RailwaySandboxExecMutation = { __typename?: 'Mutation', sandboxExec: { __typename?: 'SandboxExecResult', execId: string, state: SandboxExecState, exitCode?: number | null, stdout: string, stderr: string, cursor: string, truncated: boolean, timedOut: boolean } };

export type RailwaySandboxExecOutputSubscriptionVariables = Exact<{
  id: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  execId: Scalars['String']['input'];
  cursor?: InputMaybe<Scalars['String']['input']>;
}>;


export type RailwaySandboxExecOutputSubscription = { __typename?: 'Subscription', sandboxExecOutput: Array<{ __typename?: 'SandboxExecOutput', data?: string | null, isStderr: boolean, seq: string, exitCode?: number | null }> };

export type RailwaySandboxExecKillMutationVariables = Exact<{
  id: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  execId: Scalars['String']['input'];
  signal?: InputMaybe<Scalars['Int']['input']>;
}>;


export type RailwaySandboxExecKillMutation = { __typename?: 'Mutation', sandboxExecKill: boolean };

export type RailwaySandboxDestroyMutationVariables = Exact<{
  id: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
}>;


export type RailwaySandboxDestroyMutation = { __typename?: 'Mutation', sandboxDestroy?: { __typename?: 'Sandbox', id: string, status: SandboxStatus, environmentId: string, region: string, idleTimeoutMinutes?: number | null, createdAt: string } | null };

export type RailwaySandboxTemplateFieldsFragment = { __typename?: 'SandboxTemplate', id: string, status: SandboxTemplateStatus, environmentId: string };

export type RailwaySandboxTemplateBuildMutationVariables = Exact<{
  environmentId: Scalars['String']['input'];
  input: SandboxTemplateInput;
}>;


export type RailwaySandboxTemplateBuildMutation = { __typename?: 'Mutation', sandboxTemplateBuild: { __typename?: 'SandboxTemplate', id: string, status: SandboxTemplateStatus, environmentId: string } };

export type RailwaySandboxTemplateQueryVariables = Exact<{
  environmentId: Scalars['String']['input'];
  id: Scalars['ID']['input'];
}>;


export type RailwaySandboxTemplateQuery = { __typename?: 'Query', sandboxTemplate: { __typename?: 'SandboxTemplate', id: string, status: SandboxTemplateStatus, environmentId: string } };

export const RailwaySandboxFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RailwaySandboxFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Sandbox"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"environmentId"}},{"kind":"Field","name":{"kind":"Name","value":"region"}},{"kind":"Field","name":{"kind":"Name","value":"idleTimeoutMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]} as unknown as DocumentNode<RailwaySandboxFieldsFragment, unknown>;
export const RailwaySandboxTemplateFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RailwaySandboxTemplateFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SandboxTemplate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"environmentId"}}]}}]} as unknown as DocumentNode<RailwaySandboxTemplateFieldsFragment, unknown>;
export const RailwaySandboxDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RailwaySandbox"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"environmentId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sandbox"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"environmentId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"environmentId"}}},{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RailwaySandboxFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RailwaySandboxFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Sandbox"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"environmentId"}},{"kind":"Field","name":{"kind":"Name","value":"region"}},{"kind":"Field","name":{"kind":"Name","value":"idleTimeoutMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]} as unknown as DocumentNode<RailwaySandboxQuery, RailwaySandboxQueryVariables>;
export const RailwaySandboxesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RailwaySandboxes"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"environmentId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"before"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"last"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sandboxes"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"environmentId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"environmentId"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}},{"kind":"Argument","name":{"kind":"Name","value":"before"},"value":{"kind":"Variable","name":{"kind":"Name","value":"before"}}},{"kind":"Argument","name":{"kind":"Name","value":"last"},"value":{"kind":"Variable","name":{"kind":"Name","value":"last"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RailwaySandboxFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}},{"kind":"Field","name":{"kind":"Name","value":"endCursor"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RailwaySandboxFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Sandbox"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"environmentId"}},{"kind":"Field","name":{"kind":"Name","value":"region"}},{"kind":"Field","name":{"kind":"Name","value":"idleTimeoutMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]} as unknown as DocumentNode<RailwaySandboxesQuery, RailwaySandboxesQueryVariables>;
export const RailwaySandboxCreateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RailwaySandboxCreate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SandboxCreateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sandboxCreate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RailwaySandboxFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RailwaySandboxFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Sandbox"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"environmentId"}},{"kind":"Field","name":{"kind":"Name","value":"region"}},{"kind":"Field","name":{"kind":"Name","value":"idleTimeoutMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]} as unknown as DocumentNode<RailwaySandboxCreateMutation, RailwaySandboxCreateMutationVariables>;
export const RailwaySandboxExecDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RailwaySandboxExec"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"environmentId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"command"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"timeoutSec"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sandboxExec"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"environmentId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"environmentId"}}},{"kind":"Argument","name":{"kind":"Name","value":"command"},"value":{"kind":"Variable","name":{"kind":"Name","value":"command"}}},{"kind":"Argument","name":{"kind":"Name","value":"timeoutSec"},"value":{"kind":"Variable","name":{"kind":"Name","value":"timeoutSec"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"execId"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"exitCode"}},{"kind":"Field","name":{"kind":"Name","value":"stdout"}},{"kind":"Field","name":{"kind":"Name","value":"stderr"}},{"kind":"Field","name":{"kind":"Name","value":"cursor"}},{"kind":"Field","name":{"kind":"Name","value":"truncated"}},{"kind":"Field","name":{"kind":"Name","value":"timedOut"}}]}}]}}]} as unknown as DocumentNode<RailwaySandboxExecMutation, RailwaySandboxExecMutationVariables>;
export const RailwaySandboxExecOutputDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"RailwaySandboxExecOutput"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"environmentId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"execId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sandboxExecOutput"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"environmentId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"environmentId"}}},{"kind":"Argument","name":{"kind":"Name","value":"execId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"execId"}}},{"kind":"Argument","name":{"kind":"Name","value":"cursor"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"data"}},{"kind":"Field","name":{"kind":"Name","value":"isStderr"}},{"kind":"Field","name":{"kind":"Name","value":"seq"}},{"kind":"Field","name":{"kind":"Name","value":"exitCode"}}]}}]}}]} as unknown as DocumentNode<RailwaySandboxExecOutputSubscription, RailwaySandboxExecOutputSubscriptionVariables>;
export const RailwaySandboxExecKillDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RailwaySandboxExecKill"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"environmentId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"execId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"signal"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sandboxExecKill"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"environmentId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"environmentId"}}},{"kind":"Argument","name":{"kind":"Name","value":"execId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"execId"}}},{"kind":"Argument","name":{"kind":"Name","value":"signal"},"value":{"kind":"Variable","name":{"kind":"Name","value":"signal"}}}]}]}}]} as unknown as DocumentNode<RailwaySandboxExecKillMutation, RailwaySandboxExecKillMutationVariables>;
export const RailwaySandboxDestroyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RailwaySandboxDestroy"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"environmentId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sandboxDestroy"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"environmentId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"environmentId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RailwaySandboxFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RailwaySandboxFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Sandbox"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"environmentId"}},{"kind":"Field","name":{"kind":"Name","value":"region"}},{"kind":"Field","name":{"kind":"Name","value":"idleTimeoutMinutes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]} as unknown as DocumentNode<RailwaySandboxDestroyMutation, RailwaySandboxDestroyMutationVariables>;
export const RailwaySandboxTemplateBuildDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RailwaySandboxTemplateBuild"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"environmentId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SandboxTemplateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sandboxTemplateBuild"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"environmentId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"environmentId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RailwaySandboxTemplateFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RailwaySandboxTemplateFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SandboxTemplate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"environmentId"}}]}}]} as unknown as DocumentNode<RailwaySandboxTemplateBuildMutation, RailwaySandboxTemplateBuildMutationVariables>;
export const RailwaySandboxTemplateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RailwaySandboxTemplate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"environmentId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sandboxTemplate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"environmentId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"environmentId"}}},{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RailwaySandboxTemplateFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RailwaySandboxTemplateFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SandboxTemplate"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"environmentId"}}]}}]} as unknown as DocumentNode<RailwaySandboxTemplateQuery, RailwaySandboxTemplateQueryVariables>;