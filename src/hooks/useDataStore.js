import { useDataMutation, useDataQuery } from '@dhis2/app-runtime';

export const updateQuery = {
    resource: 'dataStore/sympheos_config',
    type: 'update',
    id: ({ key }) => key,
    data: ({ data }) => data,
};

export const dsQuery = {
    results: {
        resource: 'dataStore/sympheos_config',
        id: ({ key }) => key,
    },
};

export function useDataStore({ key, lazyUpdate = true, lazyGet = true }) {
    const [
        mutate,
        {
            called,
            loading: loadingUpdate,
            error: errorUpdate,
            data: dataUpdate,
        },
    ] = useDataMutation(updateQuery, {
        variables: { key },
        // eslint-disable-next-line no-console
        onError: err => console.error(err),
        lazy: lazyUpdate,
    });

    const {
        loading,
        error: errorQuery,
        data: dataQuery,
        refetch,
    } = useDataQuery(dsQuery, {
        variables: { key },
        // eslint-disable-next-line no-console
        onError: err => console.error(err),
        lazy: lazyGet,
    });

    return {
        storeMutation: {
            mutate,
            called,
            loading: loadingUpdate,
            error: errorUpdate,
            data: dataUpdate,
        },
        storeQuery: {
            loading,
            error: errorQuery,
            data: dataQuery,
            refetch,
        },
    };
}
