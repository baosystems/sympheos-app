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

const periodDayValues = {
    LAST_30_DAYS: 30,
    LAST_60_DAYS: 60,
    LAST_90_DAYS: 90,
};

const simpleDimensionHeaders = {
    ou: 'ouname',
    lastUpdated: 'lastupdated',
    createdBy: 'createdbydisplayname',
    lastUpdatedBy: 'lastupdatedbydisplayname',
    eventDate: 'eventdate',
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
        error: analyticsEventsError,
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

    const periodBuilder = () => {
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

            const endDateDate = new Date();
            const startDateDate = new Date();
            startDateDate.setDate(endDateDate.getDate() - periodDayValues[period] + 1);

            startDate = startDateDate.toISOString().split('T')[0];
            endDate = endDateDate.toISOString().split('T')[0];
        }

        return { periodDim, startDate, endDate };
    };

    const buildAndRefetchAnalyticsEvents = () => {
        const eventVisualization = eventVisualizationData?.results;

        const orderedColumns = eventVisualization.columns;

        const simpleDimensions = (eventVisualization.simpleDimensions || []).reduce((acc, dim) => {
            acc[dim.dimension] = dim;
            return acc;
        }, {});

        const columns = eventVisualization.columnDimensions
            .filter(d => !simpleDimensions[d])
            .map(d => d.split('.')
                .filter(e => e !== request.queryParams?.program).join('.'));

        const columnsMap = columns.reduce((acc, cur) => {
            const key = cur.split('.');
            if (key.length > 1) {
                acc[key[key.length - 1]] = cur;
            }
            return acc;
        }, {});

        const orgUnit = simpleDimensions.ou ? `ou:${simpleDimensions.ou.values.join(',')},` : '';

        const eventDate = simpleDimensions.eventDate?.simpleDimensions?.eventDate?.values?.join(',');
        const lastUpdated = simpleDimensions.lastUpdated?.simpleDimensions?.lastUpdated?.values?.join(',');

        let { periodDim, startDate, endDate } = periodBuilder();

        let filter;
        if (lineList?.timeField && startDate && endDate) {
            filter = `${lineList.timeField}:NE:NV,`;
            filter += `${lineList.timeField}:GE:${startDate},`;
            filter += `${lineList.timeField}:LE:${endDate}`;
            periodDim = '';
            startDate = undefined;
            endDate = undefined;
        }

        const headers = orderedColumns.reduce((acc, dim) => {
            const dimKey = dim.id?.split('.')?.pop() || '';
            const elem = columnsMap[dimKey] || simpleDimensionHeaders[dimKey];
            if (elem) {
                acc.push(elem);
            }
            return acc;
        }, []).join(',');

        let additionalDimsText = '';
        if (eventDate) {
            additionalDimsText += 'eventDate,';
        }
        if (lastUpdated) {
            additionalDimsText += 'lastUpdated,';
        }

        const params = {
            dimension: `${orgUnit}${additionalDimsText}${columns.join(',')}${periodDim}`,
            headers,
            displayProperty: 'NAME',
            pageSize: 1000000,
            includeMetadataDetails: true,
            outputType: 'EVENT',
            stage: request.queryParams?.programStage,
            filter,
            eventDate,
            lastUpdated,
            startDate,
            endDate,
        };

        refetchAnalyticsEvents({ id: request.queryParams?.program, params }).then((data) => {
            downloadCSV(data);
        });
        // TODO: catch error on request
    };

    const generateCSV = ({ fileName, csvContent }) => {
        if (!csvContent || csvContent.length === 0) {
            return;
        }
        const csvBlob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(csvBlob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Working List - ${request.queryParams?.program || 'Events'} - ${fileName}.csv`);
        document.body?.appendChild(link);
        link.click();
        document.body?.removeChild(link);
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

        generateCSV({ fileName, csvContent });

        setProcessing(false);
    };

    const handleClose = (e) => {
        setProcessing(false);
        onClose(e);
    };

    useEffect(() => {
        if (analyticsEventsError) {
            setProcessing(false);
            setErrorBoxContent(<NoticeBox error title={i18n.t('Error generating CSV')}>
                {analyticsEventsError.message}
            </NoticeBox>);
        } else if (eventVisualizationError) {
            setProcessing(false);
            setErrorBoxContent(<NoticeBox error title={i18n.t('Error generating CSV')}>
                {eventVisualizationError.message}
            </NoticeBox>);
        }
    }, [eventVisualizationError, analyticsEventsError]);

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
        <Modal hide={!open} onClose={handleClose} position={'center'} dataTest="working-lists-download-dialog">
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
                <Button onClick={handleClose} color="primary">
                    {i18n.t('Close')}
                </Button>
            </ModalActions>
        </Modal>
    );
};

export const DownloadDialogComponent = withStyles(getStyles)(DownloadDialogPlain);
