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

export const SMSPrinterSelector = ({ disabled, eventId, orgUnit }: Props) => {
    const [showModal, setShowModal] = useState(false);
    const [processingOUs, setProcessingOUs] = useState(false);
    const [orgUnitsMap, setOrgUnitsMap] = useState({});
    const [selectedPrinter, setSelectedPrinter] = useState(null);
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
                orgUnits: {
                    resource: 'organisationUnits',
                    params: {
                        fields: 'id,displayName,attributeValues',
                        paging: false,
                    },
                },
            }),
            [],
        ),
        { lazy: true },
    );

    const handleSendToPrint = () => { };

    const renderPrinterList = () => {
        if (processingOUs || loadingOUs) {
            return <CircularLoader />;
        }
        const { trackedEntities: teis } = printerTEIs;
        if (!teis || teis.length === 0) {
            return <div>{i18n.t('No SMS Printers found')}</div>;
        }
        const smsPrinterRefs = printerRefsQuery.data.results;
        return (<DataTable>
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
                {teis.trackedEntities.map((tei) => {
                    const serialNumber = getAttributeValue(
                        smsPrinterRefs.smsPrinterSerialNumber,
                        tei.attributes,
                        i18n.t('Unknown'));
                    const isDefaultPrinter = (orgUnitsMap[tei.orgUnit]?.attributeValues || [])
                        .find(attr =>
                            attr.attribute.id === smsPrinterRefs.defaultSmsPrinterAttributeId,
                        ).value === serialNumber;
                    // TODO: Verify if this is the desired behavior
                    if (isDefaultPrinter && !selectedPrinter) {
                        setSelectedPrinter(tei.trackedEntity);
                    }
                    return (<DataTableRow key={tei.trackedEntity}>
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
                        <DataTableCell>{serialNumber}</DataTableCell>
                        <DataTableCell>{orgUnitsMap[tei.orgUnit]?.displayName || tei.orgUnit}</DataTableCell>
                        <DataTableCell>{isDefaultPrinter ? i18n.t('Yes') : i18n.t('No')}</DataTableCell>
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
            const { orgUnits: ouList } = await refetchOUs();
            const ouMap = ouList.organisationUnits.reduce((acc, ou) => {
                acc[ou.id] = ou;
                return acc;
            }, {});
            setOrgUnitsMap(ouMap);
        })();
    }, [showModal, refetchOUs]);

    useEffect(() => {
        setProcessingOUs(false);
    }, [orgUnitsMap]);

    return (<>
        {!disabled && <Button
            secondary
            small
            disabled={!printerTEIs}
            loading={loadingTEIs}
            onClick={() => {
                setProcessingOUs(true);
                setShowModal(true);
            }}
        >
            {i18n.t('Send to SMS Printer')}
        </Button>}
        {showModal && <Modal position="middle" onClose={() => setShowModal(false)}>
            <ModalTitle>{i18n.t('Send selected Event to SMS Printer')}</ModalTitle>
            <ModalContent>
                {renderPrinterList()}
            </ModalContent>
            <ModalActions>
                <ButtonStrip end>
                    <Button onClick={() => setShowModal(false)} secondary>
                        {i18n.t('Close modal')}
                    </Button>
                    <Button onClick={handleSendToPrint} primary>
                        {i18n.t('Print')}
                    </Button>
                </ButtonStrip>
            </ModalActions>
        </Modal >
        }
    </>);
};
