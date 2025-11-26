// @flow
import React, { useState, useEffect } from 'react';
import { Button, Card, CircularLoader, IconSave24, InputField, SingleSelectField, SingleSelectOption } from '@dhis2/ui';
import { FiBox, FiCpu } from 'react-icons/fi';
import { useDataQuery } from '@dhis2/app-runtime';
import i18n from '@dhis2/d2-i18n';
import { useSnackbar } from 'commons/Snackbar/SnackbarContext';
import PluginsRestorer from 'sympheos-core/settings-page/PluginsRestorer';
import MenuUpdater from 'sympheos-core/settings-page/MenuUpdater';

import 'sympheos-core/settings-page/settings-page.css';

import {
    INSTANCE_TYPE_ID,
} from 'capture-core/components/WorkingLists/TeiWorkingLists/TrackedEntityBulkActions/Actions/shared/constants';

import baseDeviceSettings from './devicePluginSettings';
import baseStockSettings from './stockPluginSettings';

import { useDataStore } from '../../../hooks/useDataStore';
import { WorkingListsManager } from './WorkingListsManager';
import { EventCreationBlacklist } from './EventCreationBlacklist';
import { CheckBox } from '@material-ui/icons';
import { ProgramStagesSettings } from './ProgramStagesSettings';

const optionSetsQuery = {
    results: {
        resource: 'optionSets',
        params: ({ idList }) => ({
            fields: 'id,name,code,options[id,name,code]',
            filter: `id:in:[${idList.join(',')}]`,
        }),
    },
};

type IdentifiableObject = {
    id: string,
    name: string,
    code?: string,
};

type MappedOSType = {
    [key: string]: IdentifiableObject[],
};

const initialOSMap: ?MappedOSType = null;

const getOptions = (
    mappedOS: MappedOSType,
    key: string,
) => mappedOS[key]?.map((option: IdentifiableObject) => (
    <SingleSelectOption
        key={option.id}
        value={option.id}
        label={option.name}
    />
));

export const Settings = () => {
    const {
        storeMutation: settingsStoreMutation,
        storeQuery: settingsStoreQuery,
    } = useDataStore({ key: 'settings', lazyGet: false });

    const {
        loading: loadingOS,
        data: dataOS,
        refetch: refetchOS,
    } = useDataQuery(optionSetsQuery, { lazy: true });
    const { showSnackbar } = useSnackbar();

    const [settingsReady, setSettingsReady] = useState(false);
    const [mappedOS, setMappedOS] = useState(initialOSMap);
    const [sympheosSettings, setSympheosSettings] = useState({
        gatewayConnectivity: {
            authKey: '',
            instanceType: '',
            defaultProfile: '',
        },
        smsSatelliteOURegex: '',
    });
    const [saveDisabled, setSaveDisabled] = useState(true);

    const handleSubmit = () => {
        settingsStoreMutation.mutate({
            key: 'settings',
            data: {
                ...settingsStoreQuery.data.results,
                ...sympheosSettings,
            },
        }).then((value) => {
            if (value.httpStatus === 'OK') {
                showSnackbar({
                    key: 'settings-update-success',
                    message: i18n.t('Gateway Connectivity settings updated successfully.'),
                    duration: 3000,
                    severity: 'success',
                });
                setSaveDisabled(true);
            } else {
                showSnackbar({
                    key: 'ds-update-error',
                    message: value.message || i18n.t('Error updating Data Store.'),
                    severity: 'critical',
                });
            }
        });
    };

    useEffect(() => {
        if (!dataOS || !settingsStoreQuery.data || settingsStoreQuery.loading) { return; }

        if (settingsStoreQuery.data.results.gatewayConnectivity) {
            setSympheosSettings(prev => ({ ...prev, ...settingsStoreQuery.data.results }));
            setSettingsReady(true);
        }

        setMappedOS(dataOS.results.optionSets.reduce((
            acc: MappedOSType,
            cur: {
                id: string,
                options: IdentifiableObject[]
            }
        ) => {
            acc[cur.id] = cur.options;
            return acc;
        }, {}));
    }, [dataOS, setMappedOS, settingsStoreQuery.data]);

    useEffect(() => {
        if (settingsStoreQuery.loading || dataOS || loadingOS) return;

        if (settingsStoreQuery?.data?.results) {
            refetchOS({ idList: Object.values(settingsStoreQuery.data.results.optionSets || {}) });
        }
    }, [settingsStoreQuery, refetchOS, dataOS, loadingOS]);

    useEffect(() => {
        if (sympheosSettings.gatewayConnectivity?.instanceType !== 'fv7AZKEjynM') {
            const gatewayConnectivity = {
                ...sympheosSettings.gatewayConnectivity,
                defaultProfile: '',
            };
            setSympheosSettings(prev => ({ ...prev, gatewayConnectivity }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sympheosSettings.gatewayConnectivity?.instanceType]);

    const displaySympheosSettings = () => {
        if (!settingsReady) {
            return <CircularLoader small />;
        }

        return (<>
            <h3>{i18n.t('Gateway Connectivity Settings')}</h3>
            <SingleSelectField
                inputWidth="100%"
                label={i18n.t('Instance Type')}
                selected={sympheosSettings.gatewayConnectivity?.instanceType}
                onChange={(event) => {
                    const gatewayConnectivity = {
                        ...sympheosSettings.gatewayConnectivity,
                        instanceType: event.selected,
                    };
                    setSympheosSettings({ ...sympheosSettings, gatewayConnectivity });
                    setSaveDisabled(false);
                }}
            >
                {mappedOS && settingsStoreQuery.data &&
                    getOptions(mappedOS, settingsStoreQuery.data.results.optionSets.instanceType)
                }
            </SingleSelectField>
            <InputField
                value={sympheosSettings.gatewayConnectivity?.authKey}
                onChange={(event) => {
                    const gatewayConnectivity = {
                        ...sympheosSettings.gatewayConnectivity,
                        authKey: event.value,
                    };
                    setSympheosSettings({ ...sympheosSettings, gatewayConnectivity });
                    setSaveDisabled(false);
                }}
                placeholder={i18n.t('Auth Key')}
                label={i18n.t('Auth Key')}
                inputWidth="100%"
            />
            {sympheosSettings.gatewayConnectivity?.instanceType === INSTANCE_TYPE_ID.ACCOUNT &&
                <SingleSelectField
                    inputWidth="100%"
                    label={i18n.t('Default Profile')}
                    selected={sympheosSettings.gatewayConnectivity?.defaultProfile}
                    onChange={(event) => {
                        const gatewayConnectivity = {
                            ...sympheosSettings.gatewayConnectivity,
                            defaultProfile: event.selected,
                        };
                        setSympheosSettings({ ...sympheosSettings, gatewayConnectivity });
                        setSaveDisabled(false);
                    }}
                >
                    {mappedOS && settingsStoreQuery.data &&
                        getOptions(mappedOS, settingsStoreQuery.data.results.optionSets.defaultProfile)
                    }
                </SingleSelectField>
            }
            <h3>{i18n.t('Other Settings')}</h3>
            <InputField
                value={sympheosSettings.smsSatelliteOURegex}
                onChange={(event) => {
                    setSympheosSettings({ ...sympheosSettings, smsSatelliteOURegex: event.value });
                    setSaveDisabled(false);
                }}
                placeholder={i18n.t('SampleID Satellite Org Unit Regex for SMS Printing')}
                label={i18n.t('SampleID Satellite Org Unit Regex for SMS Printing')}
                inputWidth="100%"
            />
            <Button
                primary
                onClick={handleSubmit}
                icon={<IconSave24 />}
                disabled={saveDisabled || loadingOS}
                loading={settingsStoreMutation.loading}
            >{i18n.t('Save changes')}</Button>
        </>);
    };

    return (
        <div className="main-container">
            <div className="settings-container">
                <Card>
                    <div className="settings-card-content">
                        <h2>{i18n.t('App Settings')}</h2>
                        {displaySympheosSettings()}

                        <h2>{i18n.t('Capture Settings')}</h2>
                        <EventCreationBlacklist />
                        <h3>{i18n.t('Program Stage Settings')}</h3>
                        <ProgramStagesSettings />

                        <h2>{i18n.t('Working Lists Settings')}</h2>
                        <WorkingListsManager />

                        <h2>{i18n.t('Danger Zone')}</h2>
                        <MenuUpdater />
                        <PluginsRestorer
                            basePluginSettings={baseDeviceSettings}
                            buttonIcon={<FiCpu />}
                            buttonText={i18n.t('Device Programs Overwrite plugins configuration')}
                            warningText={
                                i18n.t('Are you sure that you want to overwrite plugins configuration for all Device Programs? This action cannot be undone and the current configuration will be lost.')
                            }
                            prefixFilter="DV"
                        />
                        <PluginsRestorer
                            basePluginSettings={baseStockSettings}
                            buttonIcon={<FiBox />}
                            buttonText={i18n.t('Stock Programs Overwrite plugins configuration')}
                            warningText={
                                i18n.t('Are you sure that you want to overwrite plugins configuration for all Stock Programs? This action cannot be undone and the current configuration will be lost.')
                            }
                            prefixFilter="STK"
                        />
                    </div>
                </Card>
            </div>
        </div >
    );
};
