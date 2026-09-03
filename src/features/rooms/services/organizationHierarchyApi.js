import {
    authenticatedHttpClient
} from '../../tickets/boards/api/authenticatedHttpClient.js';

const encode = (value) => encodeURIComponent(String(value));

export const createOrganizationHierarchyApi = (
    request = authenticatedHttpClient
) => ({
    createEnvironment({ systemId, input, signal }) {
        return request(
            `/api/systems/${encode(systemId)}/environments`,
            {
                method: 'POST',
                body: input,
                signal
            }
        );
    },

    createSubEnvironment({ environmentId, input, signal }) {
        return request(
            `/api/environments/${encode(environmentId)}/sub-environments`,
            {
                method: 'POST',
                body: input,
                signal
            }
        );
    },

    createRoom({ subEnvironmentId, input, signal }) {
        return request(
            `/api/sub-environments/${encode(subEnvironmentId)}/rooms`,
            {
                method: 'POST',
                body: input,
                signal
            }
        );
    }
});

export const organizationHierarchyApi = createOrganizationHierarchyApi();
