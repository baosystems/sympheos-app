import useSWR from 'swr';

import { useConfig } from '@dhis2/app-runtime';
import { fetcher } from '../api';
import { getAbsoluteUrl } from '../utils';

export const useDeviceGatewayInfo = () => {
    const { baseUrl } = useConfig();
    const systemInfoUrl = getAbsoluteUrl(baseUrl, '/device-gateway/api/v1/info');
    const { data, error, isLoading } = useSWR(systemInfoUrl, fetcher, { shouldRetryOnError: false });

    return {
        gatewayInfo: data,
        isLoading,
        isError: error,
    };
};
