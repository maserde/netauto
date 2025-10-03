// OpenStack Nova API Types
export type ServerStatus =
  | 'ACTIVE'
  | 'BUILD'
  | 'DELETED'
  | 'ERROR'
  | 'HARD_REBOOT'
  | 'PASSWORD'
  | 'PAUSED'
  | 'REBOOT'
  | 'REBUILD'
  | 'RESCUE'
  | 'RESIZE'
  | 'REVERT_RESIZE'
  | 'SHELVED'
  | 'SHELVED_OFFLOADED'
  | 'SHUTOFF'
  | 'SOFT_DELETED'
  | 'SUSPENDED'
  | 'UNKNOWN'
  | 'VERIFY_RESIZE';

export type VMState =
  | 'active'
  | 'building'
  | 'deleted'
  | 'error'
  | 'paused'
  | 'rescued'
  | 'resized'
  | 'shelved'
  | 'shelved_offloaded'
  | 'soft_deleted'
  | 'stopped'
  | 'suspended';

export type PowerState = 0 | 1 | 3 | 4 | 6 | 7; // NOSTATE | RUNNING | PAUSED | SHUTDOWN | CRASHED | SUSPENDED

export type TaskState = string | null; // Can be null or various task states

export type DiskConfig = 'AUTO' | 'MANUAL';

export interface Link {
  rel: 'self' | 'bookmark' | string;
  href: string;
}

export interface ImageReference {
  id: string;
  links: Link[];
}

export interface FlavorReference {
  id: string;
  links: Link[];
}

export interface NetworkAddress {
  version: 4 | 6;
  addr: string;
  'OS-EXT-IPS:type': 'fixed' | 'floating';
  'OS-EXT-IPS-MAC:mac_addr': string;
}

export interface AddressMap {
  [networkName: string]: NetworkAddress[];
}

export interface SecurityGroup {
  name: string;
}

export interface VolumeAttachment {
  id: string;
  delete_on_termination?: boolean;
  device?: string;
  serverId?: string;
  volumeId?: string;
}

export interface ServerMetadata {
  id: string;
  name: string;
  status: ServerStatus;
  tenant_id: string;
  user_id: string;
  metadata: Record<string, string>;
  hostId: string;
  image: ImageReference;
  flavor: FlavorReference;
  created: string; // ISO 8601 datetime
  updated: string; // ISO 8601 datetime
  addresses: AddressMap;
  accessIPv4: string;
  accessIPv6: string;
  links: Link[];
  'OS-DCF:diskConfig': DiskConfig;
  progress: number;
  'OS-EXT-AZ:availability_zone': string;
  config_drive: string;
  key_name: string | null;
  'OS-SRV-USG:launched_at': string | null; // ISO 8601 datetime
  'OS-SRV-USG:terminated_at': string | null; // ISO 8601 datetime
  'OS-EXT-STS:task_state': TaskState;
  'OS-EXT-STS:vm_state': VMState;
  'OS-EXT-STS:power_state': PowerState;
  'os-extended-volumes:volumes_attached': VolumeAttachment[];
  security_groups: SecurityGroup[];
}

export interface ServersDetailResponse {
  servers: ServerMetadata[];
  servers_links?: Link[];
}