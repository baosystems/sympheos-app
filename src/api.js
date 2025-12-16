import {
    API_PATH_DASHBOARDS,
    API_PATH_GUEST_TOKEN,
    API_PATH_SYSTEM_INFO,
    SMS_PRINTERS_API_PATH,
} from './constants/paths';
import { getAbsoluteUrl } from './utils';

export const get = async (endpoint) => {
    const response = await fetch(endpoint);
    return response.json();
};

export const post = async (endpoint, data = null) => {
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(endpoint, options);
    return response.json();
};

export const put = async (endpoint, data) => {
    const options = {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    };

    const response = await fetch(endpoint, options);
    return response.json();
};

/**
 * Retrieves the list of dashboards.
 *
 * @param baseUrl DHIS2 base URL.
 * @returns a list of dashboards.
 */
export const apiFetchDashboards = async ({ baseUrl } = {}) => {
    const response = await get(getAbsoluteUrl(baseUrl, API_PATH_DASHBOARDS));
    return response;
};

/**
 * Retrieves the specified dashboard.
 *
 * @param baseUrl DHIS2 base URL.
 * @returns the dashboard object if found.
 */
export const apiFetchDashboard = async (id, { baseUrl } = {}) => {
    const response = await get(getAbsoluteUrl(baseUrl, `${API_PATH_DASHBOARDS}/${id}`));
    return response;
};

/**
 * Retrieves the dashboard metadata.
 *
 * @param baseUrl DHIS2 base URL.
 * @returns the dashboard metadata object if found.
 */
export const apiFetchDashboardMetadata = async (id, { baseUrl } = {}) => {
    const response = await get(getAbsoluteUrl(baseUrl, `${API_PATH_DASHBOARDS}/${id}/metadata`));
    return response;
};

/**
 * Retrieves an API guest token.
 *
 * @param id the dashboard identifier.
 * @param baseUrl DHIS2 base URL.
 * @returns an API guest token.
 */
export const apiFetchGuestToken = async (id, { baseUrl } = {}) => {
    const response = await post(getAbsoluteUrl(baseUrl, `${API_PATH_GUEST_TOKEN}/${id}`));
    return response;
};

/**
 * Retrieves system information about the superset instance.
 *
 * @returns the superset system info.
 */
export const apiGetSystemInfo = async () => {
    const response = await get(API_PATH_SYSTEM_INFO);
    return response;
};

/**
 * Adds a new dashboard.
 *
 * @param title the dashboard title.
 * @param supersetEmbedId the superset embed id.
 * @param baseUrl DHIS2 base URL.
 * @returns {Promise<any>}
 */
export const apiAddDashboard = async (
    title,
    supersetEmbedId,
    { baseUrl } = {},
) => {
    const response = await post(getAbsoluteUrl(baseUrl, API_PATH_DASHBOARDS), {
        name: title,
        supersetEmbedId,
    });
    return response;
};

/**
 * Update a dashboard.
 *
 * @param id The identifier of the dashboard to be updated.
 * @param data The dashboard payload.
 * @param baseUrl DHIS2 base URL.
 * @returns {Promise<any>}
 */
export const apiUpdateDashboard = async (id, data, { baseUrl } = {}) => {
    const response = await put(getAbsoluteUrl(baseUrl, `${API_PATH_DASHBOARDS}/${id}`), data);
    return response;
};

/**
 * Deletes a dashboard.
 *
 * @param id the dashboard identifier.
 * @param baseUrl DHIS2 base URL.
 */
export const apiDeleteDashboard = async (id, { baseUrl } = {}) => {
    const options = {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
    };

    const response = await fetch(
        getAbsoluteUrl(baseUrl, `${API_PATH_DASHBOARDS}/${id}`),
        options,
    );

    return response.json();
};

export const apiDeviceGatewayReprintSMS = async (
    smsPrinterTrackedEntity,
    eventId,
    { baseUrl } = {},
) => {
    const response = await post(
        getAbsoluteUrl(
            baseUrl, `${SMS_PRINTERS_API_PATH}/${smsPrinterTrackedEntity}/reprint?eventId=${eventId}`,
        ));
    return response;
};

/**
 * A Promise-returning function to fetch data from the provided url.
 *
 * @param args
 * @returns {Promise<any>}
 */
export const fetcher = (...args) => fetch(...args).then(res => res.json());
