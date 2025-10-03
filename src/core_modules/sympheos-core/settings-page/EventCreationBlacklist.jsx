import React, { useState, useEffect } from 'react';
import i18n from '@dhis2/d2-i18n';
import {
    Transfer,
} from '@dhis2/ui';

import { useDataQuery } from '@dhis2/app-runtime';
import 'sympheos-core/settings-page/settings-page.css';

import { useDataStore } from '../../../hooks/useDataStore';

const programsQuery = {
    results: {
        resource: 'programs',
        params: {
            fields: 'id,displayName',
            paging: 'false',
        },
    },
};

export const EventCreationBlacklist = () => {
    const {
        storeMutation: eventCreationBlacklistStoreMutation,
        storeQuery: eventCreationBlacklistStoreQuery,
    } = useDataStore({ key: 'eventCreationBlacklist', lazyGet: false });

    const {
        data: programsData,
        loading: programsLoading,
    } = useDataQuery(programsQuery, { lazy: false });

    const [selected, setSelected] = useState([]);
    const [changed, setChanged] = useState(false);

    const onChange = (payload) => {
        setSelected(payload.selected);
        setChanged(true);
    };

    useEffect(() => {
        setSelected(Object.keys(eventCreationBlacklistStoreQuery.data?.results || {}));
    }, [eventCreationBlacklistStoreQuery.data]);

    useEffect(() => {
        if (eventCreationBlacklistStoreQuery.loading || programsLoading || !changed) {
            return;
        }

        const selectedConf = selected
            .filter(element => element)
            .reduce((acc, cur) => ({
                ...acc,
                [cur]: true,
            }), {});

        eventCreationBlacklistStoreMutation.mutate({ data: selectedConf });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected]);

    return (<div>
        <Transfer
            filterable
            loading={eventCreationBlacklistStoreQuery.loading || programsLoading}
            filterPlaceholder={i18n.t('Filter Programs')}
            leftHeader={<h4>{i18n.t('Allow create records')}</h4>}
            rightHeader={<h4>{i18n.t('Disable create records')}</h4>}
            options={
                programsData?.results?.programs?.map(({ id, displayName }) => ({ value: id, label: displayName })) || []
            }
            selected={selected}
            onChange={onChange}
        />
    </div>);
};
