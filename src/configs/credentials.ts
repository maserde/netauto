export const CREDENTIALS = {
  OPENSTACK: {
    PROJECT_DOMAIN_ID: process.env.OPENSTACK_PROJECT_DOMAIN_ID || 'default-domain-id',
    USER_DOMAIN: process.env.OPENSTACK_USER_DOMAIN || 'default-user-domain',
    PROJECT_NAME: process.env.OPENSTACK_PROJECT_NAME || 'default-project',
    USERNAME: process.env.OPENSTACK_USERNAME || 'admin',
    PASSWORD: process.env.OPENSTACK_PASSWORD || '',
    AUTH_URL: process.env.OPENSTACK_AUTH_URL || 'http://localhost:5000/v3',
    COMPUTE_BASE_URL: process.env.OPENSTACK_COMPUTE_BASE_URL
  },
};

export type OpenStackCredentials = typeof CREDENTIALS.OPENSTACK;