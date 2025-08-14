import React, { useEffect, useRef, useState } from 'react';
import i18n from '@dhis2/d2-i18n';
import { ErrorBoundary } from 'react-error-boundary';
import { embedDashboard } from '@superset-ui/embedded-sdk';
import { Center, CircularLoader } from '@dhis2/ui';
import Notice from 'sympheos-core/dashboard/Notice';

import 'sympheos-core/dashboard/dashboard.css';

import { apiFetchGuestToken, apiFetchDashboards } from './../../../api';
import { useAppContext } from './../../../hooks/useAppContext';
import { useDataStore } from '../../../hooks/useDataStore';

const DashboardContainer = ({
    dashboardKey,
    options = {
        hideChartControls: false,
        expandFilters: false,
        showFilters: true,
    },
}) => {
    const dashboardFrame = useRef(null);
    const {
        baseUrl,
        systemInfo,
    } = useAppContext();

    const { storeQuery } = useDataStore({ key: 'settings', lazyGet: false });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const unmount = () => {
        dashboardFrame?.current?.replaceChildren();
    };

    const handleError = (errorMsg) => {
        setError(i18n.t(errorMsg));
        setLoading(false);
        unmount();
    };

    useEffect(() => {
        if (!dashboardKey) {
            handleError(i18n.t('No active dashboard to display'));
            return;
        }

        if (!storeQuery?.data || !systemInfo) {
            return;
        }

        const dashboardId = storeQuery?.data?.results?.dashboardKeys?.[dashboardKey];

        if (!dashboardId) {
            handleError(i18n.t('Dashboard not found'));
            return;
        }

        const renderDashboard = async () => {
            setLoading(true);
            setError(null);
            unmount();

            const data = await apiFetchGuestToken(dashboardId, { baseUrl });
            const dashboards = await apiFetchDashboards({ baseUrl });

            const currentDashboard = dashboards?.dashboards?.find(d => d.id === dashboardId);

            if (data && currentDashboard && dashboardFrame?.current) {
                if (data?.token === undefined) {
                    handleError(data?.message);
                    return;
                }

                embedDashboard({
                    id: currentDashboard?.supersetEmbedId,
                    supersetDomain: systemInfo?.supersetBaseUrl,
                    mountPoint: dashboardFrame.current,
                    fetchGuestToken: () => data?.token,
                    dashboardUiConfig: {
                        hideTitle: true,
                        hideTab: true,
                        hideChartControls: options.hideChartControls,
                        filters: {
                            expanded: options.expandFilters,
                            visible: options.showFilters,
                        },
                    },
                    debug: true,
                });

                setLoading(false);
            } else if (data?.status !== 200 || dashboards?.status !== 200) {
                handleError(i18n.t('Failed to fetch dashboard data'));
            } else {
                handleError(i18n.t('Dashboard not found'));
            }
        };

        renderDashboard();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dashboardFrame, dashboardKey, systemInfo, storeQuery.data]);

    return (
        <div className="dashboard-container">
            <ErrorBoundary
                fallbackRender={({ error: fallbackError }) => (
                    <Notice
                        title={i18n.t('Load dashboard failed')}
                        message={
                            `${i18n.t('This dashboard could not be loaded. Please try again later.')} ${fallbackError}`
                        }
                    />
                )}
            >

                {loading ? (
                    <Center>
                        <CircularLoader />
                    </Center>
                ) : null}

                {error ? (
                    <Notice
                        title={i18n.t('Load dashboard failed')}
                        message={error}
                    />
                ) : null}

                <div
                    className={!loading ? 'dashboard-frame' : 'hide'}
                    ref={dashboardFrame}
                />

            </ErrorBoundary>
        </div>
    );
};

export default DashboardContainer;
