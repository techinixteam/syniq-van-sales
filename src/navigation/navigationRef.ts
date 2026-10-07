import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';

/**
 * Navigate from outside React — used by the forced-logout path, which is driven by an apiClient
 * event rather than by a component.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
