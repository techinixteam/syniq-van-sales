import { ACTIVITIES, AUTH_OBJECTS, PERMISSION_CODES } from '@/authz/permissions.generated';

export type AuthObject = (typeof AUTH_OBJECTS)[number];
export type Activity = (typeof ACTIVITIES)[number];
export type PermissionCode = (typeof PERMISSION_CODES)[number];
