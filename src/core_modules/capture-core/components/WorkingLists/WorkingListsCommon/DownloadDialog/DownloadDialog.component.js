// @flow
import React, { useEffect, useState } from 'react';
import i18n from '@dhis2/d2-i18n';
import { withStyles } from '@material-ui/core/styles';
import { featureAvailable, FEATURES } from 'capture-core-utils';
import { Button, Modal, ModalTitle, ModalContent, ModalActions, Radio } from '@dhis2/ui';
import { useDataQuery } from '@dhis2/app-runtime';
import { mainOptionKeys } from 'capture-core/components/FiltersForTypes/Date/options';
import type { PlainProps } from './DownloadDialog.types';

import { useDataStore } from '../../../../../../hooks/useDataStore';

const periodOptions = {
    [mainOptionKeys.TODAY]: i18n.t('Today'),
    [mainOptionKeys.THIS_WEEK]: i18n.t('This week'),
    [mainOptionKeys.THIS_MONTH]: i18n.t('This month'),
    [mainOptionKeys.THIS_YEAR]: i18n.t('This Year'),
    [mainOptionKeys.LAST_WEEK]: i18n.t('Last week'),
    [mainOptionKeys.LAST_MONTH]: i18n.t('Last month'),
    [mainOptionKeys.LAST_3_MONTHS]: i18n.t('Last 3 months'),
};

const getStyles = () => ({
    downloadLink: {
        textDecoration: 'none',
        outline: 'none',
    },
    downloadLinkContainer: {
        paddingRight: 5,
        paddingBottom: 5,
    },
    downloadContainer: {
        display: 'flex',
        flexWrap: 'wrap',
    },
});

const eventVisualizationsQuery = {
    results: {
        resource: 'eventVisualizations',
        id: ({ id }) => id,
    },
};

const analyticsEventsQuery = {
    results: {
        resource: 'analytics/events/query',
        id: ({ id }) => id,
        params: ({ params }) => params,
    },
};
const DownloadDialogPlain = ({ open, onClose, request = {}, absoluteApiPath, classes, hasCSVSupport }: PlainProps) => {
    const {
        data: eventVisualizationData,
        refetch: refetchEventVisualization,
        loading: eventVisualizationLoading,
    } = useDataQuery(eventVisualizationsQuery, { lazy: true });

    const {
        data: analyticsEventsData,
        refetch: refetchAnalyticsEvents,
        loading: analyticsEventsLoading,
    } = useDataQuery(analyticsEventsQuery, { lazy: true });

    const { storeQuery: workingListsDataStore } = useDataStore({ key: 'workingLists', lazyGet: false });
    const [lineList, setLineList] = useState(undefined);
    const [period, setPeriod] = useState(mainOptionKeys.TODAY);

    const getUrlEncodedParamsString = (params: Object) => {
        const { filter, ...restParams } = params;
        const searchParams = new URLSearchParams(restParams);

        if (filter) {
            filter.forEach((filterItem) => {
                searchParams.append('filter', filterItem);
            });
        }

        return searchParams.toString();
    };

    const downloadCustomCSV = (workingList) => {
        refetchEventVisualization({ id: workingList });
    };

    const renderButtons = () => {
        const url = `${absoluteApiPath}/${request.url}`;
        const { pageSize, page, ...paramsFromRequest } = request.queryParams || {};
        const paramsObject = {
            ...paramsFromRequest,
            ...(featureAvailable(FEATURES.newPagingQueryParam)
                ? { paging: false }
                : { skipPaging: true }),
        };
        const searchParamsString = getUrlEncodedParamsString(paramsObject);

        return (
            <div className={classes.downloadContainer}>
                {!lineList &&
                    <div className={classes.downloadLinkContainer}>
                        <a
                            download={`${request.url}.json`}
                            href={`${url}.json?${searchParamsString}`}
                            className={classes.downloadLink}
                        >
                            <Button>{i18n.t('Download as JSON')}</Button>
                        </a>
                    </div>
                }
                {hasCSVSupport && !lineList &&
                    <div className={classes.downloadLinkContainer}>
                        <a
                            download={`${request.url}.csv`}
                            href={`${url}.csv?${searchParamsString}`}
                            className={classes.downloadLink}
                        >
                            <Button>{i18n.t('Download as CSV')}</Button>
                        </a>
                    </div>
                }
                {lineList &&
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {Object.keys(periodOptions).map(key => (
                            <Radio
                                key={key}
                                label={periodOptions[key]}
                                value={key}
                                checked={period === key}
                                onChange={() => setPeriod(key)}
                            />
                        ))}
                        <Button
                            onClick={() => downloadCustomCSV(lineList)}
                            disabled={!period}
                        >{i18n.t('Download custom CSV')}</Button>
                    </div>
                }
            </div>
        );
    };

    useEffect(() => {
        const eventVisualization = eventVisualizationData?.results;
        if (!lineList || !eventVisualization || eventVisualizationLoading) {
            return;
        }
        const columns = eventVisualization.columnDimensions
            .filter(d => d !== 'ou')
            .map(d => d.split('.')
                .filter(e => e !== request.queryParams?.program).join('.'))
            .join(',');

        const ouDimension = eventVisualization.simpleDimensions
            .find(dim => dim.dimension === 'ou');
        const orgUnit = ouDimension ? `ou:${ouDimension.values[0]},` : '';

        const params = {
            dimension: `${orgUnit}${columns},pe:${period}`,
            headers: `${ouDimension ? 'ouname,' : ''}${columns}`,
            displayProperty: 'NAME',
            pageSize: 1000000,
            includeMetadataDetails: true,
            outputType: 'EVENT',
            stage: request.queryParams?.programStage,
        };

        refetchAnalyticsEvents({ id: request.queryParams?.program, params });

        // /api/analytics/events/query/${programId}?
        // dimension=ou:${map->simpleDimension[ou].values[0]},${columns}
        // &headers=ouname,${columns}&displayProperty=NAME&pageSize=1000000
        // &includeMetadataDetails=true&outputType=EVENT&stage=${programStageId}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventVisualizationData, eventVisualizationLoading]);

    useEffect(() => {
        const dataToCSV = analyticsEventsData?.results;
        if (!lineList || !dataToCSV || analyticsEventsLoading) {
            return;
        }
        console.log('Downloading custom CSV with data:', dataToCSV);
    }, [analyticsEventsData, analyticsEventsLoading, lineList]);

    useEffect(() => {
        setLineList(undefined);
    }, [open]);

    useEffect(() => {
        if (workingListsDataStore.loading
            || !!lineList
            || !request.queryParams?.program
            || !request.queryParams?.programStage) {
            return;
        }
        setLineList(workingListsDataStore.data?.results?.find(
            wl => wl.targetProgram === request.queryParams.program)?.workingList);
    }, [workingListsDataStore, lineList, setLineList, request]);

    if (!open) {
        return null;
    }

    return (
        <Modal hide={!open} onClose={onClose} position={'center'} dataTest="working-lists-download-dialog">
            <ModalTitle>{i18n.t('Download with current filters')}</ModalTitle>
            <ModalContent>{renderButtons()}</ModalContent>
            <ModalActions>
                <Button onClick={onClose} color="primary">
                    {i18n.t('Close')}
                </Button>
            </ModalActions>
        </Modal>
    );
};

export const DownloadDialogComponent = withStyles(getStyles)(DownloadDialogPlain);
