// @flow
import React, { useEffect, useState, useMemo } from 'react';
import i18n from '@dhis2/d2-i18n';
import { useDataQuery } from '@dhis2/app-runtime';
import {
    Button,
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    ButtonStrip,
    CircularLoader,
    DataTable,
    TableHead,
    DataTableRow,
    DataTableColumnHeader,
    DataTableCell,
    Checkbox,
    TableBody,
} from '@dhis2/ui';
import { useDataStore } from '../../../hooks/useDataStore';
import { apiDeviceGatewayReprintSMS } from '../../../api';
import { useAppContext } from '../../../hooks';
import { useSnackbar } from 'commons/Snackbar/SnackbarContext';

type Props = {
    disabled: boolean,
    eventId: string,
    orgUnit: string,
}

const getAttributeValue = (
    attributeId: string,
    attributes: Array<{ attribute: string, value: any }>,
    defaultValue: any = null,
) => {
    const attribute = attributes.find(attr => attr.attribute === attributeId);
    return attribute ? attribute.value : defaultValue;
};

const rootOUsQuery = {
    orgUnits: {
        resource: 'organisationUnits',
        id: ({ orgUnitId }) => orgUnitId,
        params: {
            fields: 'id,displayName,attributeValues,parent[children[id,displayName,attributeValues]]',
            filter: ['level:eq:1'],
            paging: false,
        },
    },
};

export const SMSPrinterSelector = ({ disabled, eventId, orgUnit }: Props) => {
    const [showModal, setShowModal] = useState(false);
    const [processingOUs, setProcessingOUs] = useState(false);
    const [orgUnitsMap, setOrgUnitsMap] = useState({});
    const [selectedPrinter, setSelectedPrinter] = useState(null);
    const [sendingSms, setSendingSms] = useState(false);

    const { baseUrl } = useAppContext();
    const { showSnackbar } = useSnackbar();

    const { storeQuery: printerRefsQuery } = useDataStore({ key: 'smsPrinterRefs', lazyGet: false });

    const { loading: loadingTEIs, data: printerTEIs, refetch: refetchTEIs } = useDataQuery(
        useMemo(
            () => ({
                trackedEntities: {
                    resource: 'tracker/trackedEntities',
                    params: ({ programId }) => ({
                        program: programId,
                        fields: 'trackedEntity,orgUnit,attributes',
                        paging: false,
                    }),
                },
            }),
            [],
        ),
        { lazy: true },
    );
    const { loading: loadingOUs, refetch: refetchOUs } = useDataQuery(
        useMemo(
            () => ({
                orgUnit: {
                    resource: 'organisationUnits',
                    id: ({ orgUnitId }) => orgUnitId,
                    params: {
                        fields: 'id,displayName,attributeValues,parent[children[id,displayName,attributeValues]],level',
                        paging: false,
                    },
                },
            }),
            [],
        ),
        { lazy: true },
    );
    const { loading: loadingRootOUs, data: rootOUs } = useDataQuery(
        rootOUsQuery,
        { lazy: false },
    );

    const hideModal = () => {
        if (!sendingSms) {
            setShowModal(false);
        }
    };

    const handleSendToPrint = () => {
        setSendingSms(true);
        apiDeviceGatewayReprintSMS(
            selectedPrinter,
            eventId,
            { baseUrl },
        ).then((response) => {
            setSendingSms(false);
            if (response.httpStatus === 'OK') {
                showSnackbar({
                    key: 'sms-send-success',
                    message: i18n.t('Event sent to SMS Printer.'),
                    duration: 3000,
                    severity: 'success',
                });
            } else {
                showSnackbar({
                    key: 'sms-send-error',
                    message: response.message || i18n.t('Error sending to SMS Printer.'),
                    severity: 'critical',
                });
            }
        });
    };

    const renderPrinterList = () => {
        if (processingOUs || loadingOUs) {
            return <CircularLoader />;
        }
        const { trackedEntities: teis } = printerTEIs;
        const printersList = teis?.trackedEntities?.filter(tei => orgUnitsMap[tei.orgUnit]);
        if (!printersList || printersList.length === 0) {
            return <div>{i18n.t('No SMS Printers found')}</div>;
        }
        const smsPrinterRefs = printerRefsQuery.data.results;
        return (<DataTable layout="fixed" scrollHeight="70vh">
            <TableHead>
                <DataTableRow>
                    <DataTableColumnHeader>{i18n.t('Select')}</DataTableColumnHeader>
                    <DataTableColumnHeader>{i18n.t('Serial Number')}</DataTableColumnHeader>
                    <DataTableColumnHeader>{i18n.t('Location')}</DataTableColumnHeader>
                    <DataTableColumnHeader>{i18n.t('Default')}</DataTableColumnHeader>
                    <DataTableColumnHeader>{i18n.t('Last Seen')}</DataTableColumnHeader>
                </DataTableRow>
            </TableHead>
            <TableBody>
                {printersList.map((tei) => {
                    tei.serialNumber = getAttributeValue(
                        smsPrinterRefs.smsPrinterSerialNumber,
                        tei.attributes,
                        i18n.t('Unknown'));
                    tei.isDefaultPrinter = (orgUnitsMap[tei.orgUnit]?.attributeValues || [])
                        .find(attr =>
                            attr.attribute.id === smsPrinterRefs.defaultSmsPrinterAttributeId,
                        )?.value === tei.serialNumber;
                    if (tei.isDefaultPrinter && orgUnitsMap[tei.orgUnit]?.id === orgUnit && !selectedPrinter) {
                        setSelectedPrinter(tei.trackedEntity);
                    }
                    return tei;
                }).sort((a, b) => b.isDefaultPrinter - a.isDefaultPrinter)
                    .map((tei, index) => {
                        if (index === 0 && !selectedPrinter) {
                            setSelectedPrinter(tei.trackedEntity);
                        }
                        return (<DataTableRow key={tei.trackedEntity} selected={selectedPrinter === tei.trackedEntity}>
                            <DataTableCell>
                                <Checkbox
                                    checked={selectedPrinter === tei.trackedEntity}
                                    onChange={({ checked }) => {
                                        if (checked) {
                                            setSelectedPrinter(tei.trackedEntity);
                                        } else {
                                            setSelectedPrinter(null);
                                        }
                                    }}
                                />
                            </DataTableCell>
                            <DataTableCell>{tei.serialNumber}</DataTableCell>
                            <DataTableCell>{orgUnitsMap[tei.orgUnit]?.displayName || tei.orgUnit}</DataTableCell>
                            <DataTableCell>{tei.isDefaultPrinter ? i18n.t('Yes') : i18n.t('No')}</DataTableCell>
                            <DataTableCell>
                                {getAttributeValue(smsPrinterRefs.smsPrinterLastSeen, tei.attributes, '-')}
                            </DataTableCell>
                        </DataTableRow>);
                    })}
            </TableBody>
        </DataTable>);
    };

    useEffect(() => {
        if (!printerRefsQuery.data || printerRefsQuery.loading) {
            return;
        }
        const smsPrintersProgram = printerRefsQuery.data.results.smsPrinterRecordsProgramId;
        refetchTEIs({ programId: smsPrintersProgram });
    }, [printerRefsQuery.data, printerRefsQuery.loading, refetchTEIs]);

    useEffect(() => {
        if (!showModal) {
            return;
        }
        (async () => {
            const { orgUnit: orgUnitResult } = await refetchOUs({ orgUnitId: orgUnit });
            const children = (orgUnitResult?.level === 1
                ? rootOUs?.orgUnits?.organisationUnits
                : orgUnitResult?.parent?.children
            ) || [];
            const ouMap = children.reduce((acc, ou) => {
                acc[ou.id] = ou;
                return acc;
            }, {});
            setOrgUnitsMap(ouMap);
        })();
    }, [showModal, refetchOUs, orgUnit, rootOUs]);

    useEffect(() => {
        setProcessingOUs(false);
    }, [orgUnitsMap]);

    return (<>
        {!disabled && <Button
            secondary
            small
            disabled={!printerTEIs || loadingRootOUs}
            loading={loadingTEIs}
            onClick={() => {
                setProcessingOUs(true);
                setShowModal(true);
            }}
        >
            {i18n.t('Send to SMS Printer')}
        </Button>}
        {showModal && <Modal
            position="middle"
            onClose={hideModal}
            large
        >
            <ModalTitle>{i18n.t('Send selected Event to SMS Printer')}</ModalTitle>
            <ModalContent >
                {renderPrinterList()}
            </ModalContent>
            <ModalActions>
                <ButtonStrip end>
                    <Button onClick={hideModal} secondary disabled={sendingSms}>
                        {i18n.t('Close modal')}
                    </Button>
                    <Button
                        onClick={handleSendToPrint}
                        disabled={!selectedPrinter}
                        loading={sendingSms}
                        primary
                    >
                        {i18n.t('Print')}
                    </Button>
                </ButtonStrip>
            </ModalActions>
        </Modal >
        }
    </>);
};
