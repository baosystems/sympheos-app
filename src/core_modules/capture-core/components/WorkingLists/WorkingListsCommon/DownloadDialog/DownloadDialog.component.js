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
        refetch: refetchAnalyticsEvents,
    } = useDataQuery(analyticsEventsQuery, { lazy: true });

    const { storeQuery: workingListsDataStore } = useDataStore({ key: 'workingLists', lazyGet: false });
    const [lineList, setLineList] = useState(undefined);
    const [period, setPeriod] = useState(mainOptionKeys.TODAY);
    const [processing, setProcessing] = useState(false);

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
        setProcessing(true);
        if (!eventVisualizationData) {
            refetchEventVisualization({ id: workingList });
        } else {
            buildAndRefetchAnalyticsEvents();
        }
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
                            loading={processing}
                        >{i18n.t('Download custom CSV')}</Button>
                    </div>
                }
            </div>
        );
    };

    const buildAndRefetchAnalyticsEvents = () => {
        const eventVisualization = eventVisualizationData?.results;
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

        refetchAnalyticsEvents({ id: request.queryParams?.program, params }).then((data) => {
            downloadCSV(data);
        });
    };

    const downloadCSV = (data) => {
        const csvContent = [];
        if (data?.results?.headers) {
            csvContent.push(data.results.headers.map(h => `"${h.column.replace(/"/g, '""')}"`).join(','));
        }
        if (data?.results?.rows) {
            data.results.rows.forEach((row) => {
                csvContent.push(row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','));
            });
        }
        const csvBlob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(csvBlob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Working List - ${request.queryParams?.program || 'Events'} - ${period}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setProcessing(false);
    };

    useEffect(() => {
        const eventVisualization = eventVisualizationData?.results;
        if (!lineList || !eventVisualization || eventVisualizationLoading) {
            return;
        }
        buildAndRefetchAnalyticsEvents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventVisualizationData, eventVisualizationLoading]);

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
            wl => wl.targetProgram === request.queryParams?.program)?.workingList);
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
