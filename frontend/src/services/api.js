// Compatibility entry point. Several modals and pages import either the default
// export or a named `api` export; both resolve to the shared axios client.
import apiClient from './client';

export const api = apiClient;
export default apiClient;
