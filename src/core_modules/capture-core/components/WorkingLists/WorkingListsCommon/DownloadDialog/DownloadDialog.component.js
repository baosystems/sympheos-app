// @flow
import React, { useEffect, useState } from 'react';
import i18n from '@dhis2/d2-i18n';
import { withStyles } from '@material-ui/core/styles';
import { featureAvailable, FEATURES } from 'capture-core-utils';
import { Button, Modal, ModalTitle, ModalContent, ModalActions, Radio, CalendarInput, NoticeBox } from '@dhis2/ui';
import { useDataQuery } from '@dhis2/app-runtime';
import type { PlainProps } from './DownloadDialog.types';

import { useDataStore } from '../../../../../../hooks/useDataStore';

const checkDateError = (startDate, endDate) => {
    if (!startDate || !endDate) {
        return i18n.t('Please select both start and end dates');
    } else if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
        return i18n.t('Start date must be before end date');
    }
    return undefined;
};

const periodOptions = {
    LAST_30_DAYS: i18n.t('Last 30 days'),
    LAST_60_DAYS: i18n.t('Last 60 days'),
    LAST_90_DAYS: i18n.t('Last 90 days'),
    YTD: i18n.t('Year to date'),
    RANGE: i18n.t('Absolute range'),
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
        error: eventVisualizationError,
    } = useDataQuery(eventVisualizationsQuery, { lazy: true });

    const {
        refetch: refetchAnalyticsEvents,
    } = useDataQuery(analyticsEventsQuery, { lazy: true });

    const { storeQuery: workingListsDataStore } = useDataStore({ key: 'workingLists', lazyGet: false });
    const [lineList, setLineList] = useState(undefined);
    const [period, setPeriod] = useState('LAST_30_DAYS');
    const [startDateForm, setStartDateForm] = useState(null);
    const [endDateForm, setEndDateForm] = useState(null);
    const [dateValidationError, setDateValidationError] = useState(undefined);

    const [processing, setProcessing] = useState(false);
    const [errorBoxContent, setErrorBoxContent] = useState(undefined);

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
        setDateValidationError(undefined);
        if (period === 'RANGE') {
            const dateError = checkDateError(startDateForm?.calendarDateString, endDateForm?.calendarDateString);
            if (dateError) {
                setDateValidationError(dateError);
                setProcessing(false);
                return;
            }
        }
        if (!eventVisualizationData) {
            refetchEventVisualization({ id: workingList.workingList });
        } else {
            buildAndRefetchAnalyticsEvents();
        }
    };

    const renderDateRange = () => (<div
        style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1em',
            margin: '0.5em 1em 1em 2em',
        }}
    >
        <CalendarInput
            label={i18n.t('From')}
            placeholder={i18n.t('From')}
            calendar="gregory"
            disabled={period !== 'RANGE'}
            date={period !== 'RANGE' ? '' : startDateForm?.calendarDateString}
            validationText={dateValidationError || ''}
            error={!!dateValidationError}
            onDateSelect={setStartDateForm}
        />
        <CalendarInput
            label={i18n.t('To')}
            placeholder={i18n.t('To')}
            calendar="gregory"
            disabled={period !== 'RANGE'}
            date={period !== 'RANGE' ? '' : endDateForm?.calendarDateString}
            error={!!dateValidationError}
            onDateSelect={setEndDateForm}
        />
    </div>);

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
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        {Object.keys(periodOptions).map(key => (
                            <Radio
                                key={key}
                                label={periodOptions[key]}
                                value={key}
                                checked={period === key}
                                onChange={() => setPeriod(key)}
                            />
                        ))}
                        {renderDateRange()}
                        {errorBoxContent}
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

        let periodDim = '';
        let startDate;
        let endDate;

        if (period === 'RANGE') {
            startDate = startDateForm?.calendarDateString;
            endDate = endDateForm?.calendarDateString;
        } else if (period === 'YTD') {
            const today = new Date();
            const currentYear = today.getFullYear();
            startDate = `${currentYear}-01-01`;
            endDate = today.toISOString().split('T')[0];
        } else {
            periodDim = `,pe:${period}`;
        }

        const params = {
            dimension: `${orgUnit}${columns}${periodDim}`,
            headers: `${ouDimension ? 'ouname,' : ''}${columns}`,
            displayProperty: 'NAME',
            pageSize: 1000000,
            includeMetadataDetails: true,
            outputType: 'EVENT',
            stage: request.queryParams?.programStage,
            timeField: lineList?.timeField,
            startDate,
            endDate,
        };

        refetchAnalyticsEvents({ id: request.queryParams?.program, params }).then((data) => {
            downloadCSV(data);
        });
    };

    const downloadCSV = (data) => {
        let fileName = period;
        if (period === 'RANGE') {
            fileName = `${startDateForm?.calendarDateString || '-'} to ${endDateForm?.calendarDateString || '-'}`;
        } else if (period === 'YTD') {
            const today = new Date();
            fileName = `${today.getFullYear()} up to (${today.toISOString().split('T')[0]})`;
        }

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
        link.setAttribute('download', `Working List - ${request.queryParams?.program || 'Events'} - ${fileName}.csv`);
        document.body?.appendChild(link);
        link.click();
        document.body?.removeChild(link);

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
        if (eventVisualizationError) {
            setProcessing(false);
            setErrorBoxContent(<NoticeBox error title={i18n.t('Error loading Working List')}>
                {i18n.t('You don\'t have access to this Working List or it does not exist.')}
                <br />
                {i18n.t('Please contact your system administrator.')}
            </NoticeBox>);
        }
    }, [eventVisualizationError]);

    useEffect(() => {
        setLineList(undefined);
        setErrorBoxContent(undefined);
    }, [open]);

    useEffect(() => {
        if (workingListsDataStore.loading
            || !!lineList
            || !request.queryParams?.program
            || !request.queryParams?.programStage) {
            return;
        }
        const workingList = workingListsDataStore.data?.results?.find(
            wl => wl.targetProgram === request.queryParams?.program,
        );
        setLineList(workingList);
    }, [workingListsDataStore, lineList, setLineList, request]);

    if (!open) {
        return null;
    }

    return (
        <Modal hide={!open} onClose={onClose} position={'center'} dataTest="working-lists-download-dialog">
            <ModalTitle>{i18n.t('Download with current filters')}</ModalTitle>
            <ModalContent>{renderButtons()}</ModalContent>
            <ModalActions>
                {lineList &&
                    <div className={classes.downloadLinkContainer}>
                        <Button
                            onClick={() => downloadCustomCSV(lineList)}
                            disabled={!period || (period === 'RANGE' && !(startDateForm && endDateForm))}
                            loading={processing}
                        >{i18n.t('Download custom CSV')}</Button>
                    </div>
                }
                <Button onClick={onClose} color="primary">
                    {i18n.t('Close')}
                </Button>
            </ModalActions>
        </Modal>
    );
};

export const DownloadDialogComponent = withStyles(getStyles)(DownloadDialogPlain);
