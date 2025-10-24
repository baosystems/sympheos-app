// @flow
import React, { useEffect } from 'react';
import i18n from '@dhis2/d2-i18n';
import { useDataQuery } from '@dhis2/app-runtime';
import {
    DataTable, TableHead, TableBody, DataTableRow, DataTableColumnHeader, DataTableCell, CenteredContent,
    Card,
    CircularLoader,
} from '@dhis2/ui';
import { useDeviceGatewayInfo } from '../../../hooks/useDeviceGatewayInfo';

const appsQuery = { results: { resource: 'apps' } };

const d2VersionQuery = {
    results: {
        resource: 'system/info',
        params: {
            fields: 'version',
        },
    },
};

export const About = () => {
    const { data: appsData, loading: appsLoading } = useDataQuery(appsQuery);
    const { data: d2Version, loading: d2VersionLoading } = useDataQuery(d2VersionQuery);
    const { gatewayInfo, isLoading: gatewayInfoLoading } = useDeviceGatewayInfo();

    const [tableData, setTableData] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    useEffect(() => {
        if (appsLoading || d2VersionLoading || gatewayInfoLoading) {
            return;
        }

        const tempTable = [
            {
                id: 'd2',
                name: i18n.t('DHIS2 Core'),
                version: d2Version.results.version,
                details: i18n.t('The DHIS2 version running in this instance.'),
            },
            {
                id: 'sympheos-app',
                name: i18n.t('Sympheos App'),
                version: process.env.REACT_APP_VERSION,
                details: i18n.t('The Sympheos application running in this DHIS2 instance.'),
            },
        ];

        if (gatewayInfo) {
            tempTable.push({
                id: 'device-gateway',
                name: i18n.t('Device Gateway API'),
                version: gatewayInfo.version,
                details: '',
            });
        }

        const plugins = appsData.results
            .filter(app => app.plugin_launch_path && !app.launch_path)
            .map(app => ({
                id: app.key,
                name: app.name,
                version: app.version,
                details: app.description || '',
            })).sort((a, b) => {
                if (a.name > b.name) {
                    return 1;
                } else if (a.name < b.name) {
                    return -1;
                }
                return 0;
            });

        tempTable.push(...plugins);

        setTableData(tempTable);
        setLoading(false);
    }, [appsData, d2Version, appsLoading, d2VersionLoading, gatewayInfoLoading, gatewayInfo]);

    return (<CenteredContent>
        <Card>
            <div style={{ margin: '4em', height: '70svh' }}>
                <h2
                    style={{
                        marginBottom: '1em',
                    }}
                >{i18n.t('Sympheos System')}</h2>
                <DataTable width="65svw">
                    <TableHead>
                        <DataTableRow>
                            <DataTableColumnHeader>
                                {i18n.t('Component')}
                            </DataTableColumnHeader>
                            <DataTableColumnHeader>
                                {i18n.t('Version')}
                            </DataTableColumnHeader>
                            <DataTableColumnHeader>
                                {i18n.t('Details')}
                            </DataTableColumnHeader>
                        </DataTableRow>
                    </TableHead>
                    <TableBody>
                        {!loading && tableData.map(item => (
                            <DataTableRow key={item.id}>
                                <DataTableCell bordered>{item.name}</DataTableCell>
                                <DataTableCell bordered>{item.version}</DataTableCell>
                                <DataTableCell bordered>{item.details}</DataTableCell>
                            </DataTableRow>
                        ))}
                        {loading && (
                            <DataTableRow>
                                <DataTableCell colSpan={3} align="center" >
                                    <CenteredContent>
                                        <CircularLoader />
                                    </CenteredContent>
                                </DataTableCell>
                            </DataTableRow>
                        )}
                    </TableBody>
                </DataTable>
            </div>
        </Card>
    </CenteredContent>);
};

