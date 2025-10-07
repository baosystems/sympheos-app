import React, { useState, useEffect, useRef } from 'react';
import i18n from '@dhis2/d2-i18n';
import {
    IconAdd24,
    Button,
    DataTable,
    DataTableRow,
    DataTableColumnHeader,
    DataTableCell,
    InputField,
    TableHead,
    TableBody,
    IconDelete24,
    IconSave24,
    CircularLoader,
} from '@dhis2/ui';
import { useSnackbar } from 'commons/Snackbar/SnackbarContext';

import 'sympheos-core/settings-page/settings-page.css';

import { useDataStore } from '../../../hooks/useDataStore';

const validationsList = [
    ({ wl }) => {
        if (wl.targetProgram.trim() === '' || wl.workingList.trim() === '') {
            return {
                targetProgram: i18n.t('Both fields are required'),
                workingList: i18n.t('Both fields are required'),
            };
        }
        return null;
    },
    ({ wl }) => {
        if (!wl.targetProgram.match(/^[A-Za-z][A-Za-z0-9]{10}$/)) {
            return {
                targetProgram: i18n.t('Invalid Tracker Program UID'),
            };
        }
        return null;
    },
    ({ wl }) => {
        if (!wl.workingList.match(/^[A-Za-z][A-Za-z0-9]{10}$/)) {
            return {
                workingList: i18n.t('Invalid Line List UID'),
            };
        }
        return null;
    },
    ({ wl, workingLists }) => {
        if (workingLists.filter(item => item.targetProgram === wl.targetProgram).length > 1) {
            return {
                targetProgram: i18n.t('Tracker Program UID can only be configured once'),
            };
        }
        return null;
    },
    ({ wl }) => {
        if (wl.timeField && wl.timeField.trim() !== '' && !wl.timeField.match(/^[A-Za-z][A-Za-z0-9]{10}$/)) {
            return {
                timeField: i18n.t('Invalid Time Field UID'),
            };
        }
        return null;
    },
];

export const WorkingListsManager = () => {
    const {
        storeMutation: workingListsStoreMutation,
        storeQuery: workingListsStoreQuery,
    } = useDataStore({ key: 'workingLists', lazyGet: false });

    const [enableSave, setEnableSave] = useState(false);
    const { showSnackbar } = useSnackbar();

    const [workingLists, setWorkingLists] = useState([]);
    const [validations, setValidations] = useState({ saveReady: false, validations: {} });
    const idCounter = useRef(0);

    const handleAddWorkingList = () => {
        setWorkingLists([
            ...workingLists,
            { id: idCounter.current, isNew: true, targetProgram: '', workingList: '' },
        ]);
        idCounter.current += 1;
    };

    const handleTargetProgramChange = (event, index) => {
        const newWorkingLists = [...workingLists];
        newWorkingLists[index].targetProgram = event.value;
        setWorkingLists(newWorkingLists);
        setEnableSave(true);
    };

    const handleTargetWorkingListChange = (event, index) => {
        const newWorkingLists = [...workingLists];
        newWorkingLists[index].workingList = event.value;
        setWorkingLists(newWorkingLists);
        setEnableSave(true);
    };

    const handleTargetTimeFieldChange = (event, index) => {
        const newWorkingLists = [...workingLists];
        newWorkingLists[index].timeField = event.value;
        setWorkingLists(newWorkingLists);
        setEnableSave(true);
    };

    const handleRemoveWorkingList = (index) => {
        // remove item from workingLists and return the new array and the element
        const removedElement = workingLists[index];
        const newWorkingLists = workingLists.filter((_, i) => i !== index);
        delete validations.validations[index];
        setValidations({ saveReady: false, validations: validations.validations });
        setWorkingLists(newWorkingLists);
        if (!removedElement.isNew) {
            setEnableSave(true);
        }
    };

    const validateWorkingList = (wl) => {
        for (const validation of validationsList) {
            const error = validation({ wl, workingLists });
            if (error) {
                return error;
            }
        }
        return null;
    };

    const handleSaveWorkingLists = () => {
        for (let i = 0; i < workingLists.length; i++) {
            const wl = workingLists[i];
            const validationError = validateWorkingList(wl);
            if (validationError) {
                validations.validations[i] = validationError;
            } else {
                delete validations.validations[i];
            }
        }
        setValidations({ saveReady: true, validations: validations.validations });
    };

    useEffect(() => {
        if (Object.keys(validations.validations).length > 0 || !validations.saveReady) {
            return;
        }

        workingListsStoreMutation.mutate({
            key: 'workingLists',
            data: workingLists.map((wl) => {
                delete wl.id;
                delete wl.isNew;
                return wl;
            }),
        }).then(() => {
            workingListsStoreQuery.refetch();
            showSnackbar({
                key: 'wl-update-success',
                message: i18n.t('Working Lists settings updated.'),
                duration: 3000,
                severity: 'success',
            });
            setEnableSave(false);
            setValidations({ saveReady: false, validations: {} });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [validations]);

    useEffect(() => {
        if (
            workingListsStoreMutation.loading ||
            workingListsStoreQuery.loading ||
            workingListsStoreMutation.called
        ) {
            return;
        }
        if (!workingListsStoreQuery.data) {
            workingListsStoreMutation.mutate({
                key: 'workingLists',
                data: [],
            }).then(() => {
                workingListsStoreQuery.refetch();
            });
        } else {
            const results = (workingListsStoreQuery.data.results || []).map((wl, index) => {
                wl.id = index;
                wl.isNew = false;
                return wl;
            });
            idCounter.current = results.length;
            setWorkingLists(results);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        workingListsStoreQuery.loading,
        workingListsStoreMutation.loading,
    ]);

    return (<div className="working-lists-container">
        <div className="working-lists-buttons">
            {(workingListsStoreQuery.loading || workingListsStoreMutation.loading) &&
                <CircularLoader small />
            }
            {enableSave &&
                <Button
                    primary
                    onClick={handleSaveWorkingLists}
                    icon={<IconSave24 />}
                >{i18n.t('Save changes')}</Button>
            }
            <Button
                onClick={handleAddWorkingList}
                icon={<IconAdd24 />}
            >{i18n.t('Add Working List')}</Button>
        </div>

        {!workingListsStoreQuery.loading && workingLists.length === 0 &&
            <div>{i18n.t('No Working Lists Configured')}</div>
        }
        {workingLists.length > 0 &&
            <DataTable>
                <TableHead>
                    <DataTableRow>
                        <DataTableColumnHeader width="30%">{i18n.t('Tracker Program UID')}</DataTableColumnHeader>
                        <DataTableColumnHeader width="30%">{i18n.t('Line List UID')}</DataTableColumnHeader>
                        <DataTableColumnHeader width="30%">
                            {i18n.t('Time field for Date filters')}
                        </DataTableColumnHeader>
                        <DataTableColumnHeader width="10%" />
                    </DataTableRow>
                </TableHead>
                <TableBody>
                    {workingLists.map((wlItem, index) => (
                        <DataTableRow key={wlItem.id}>
                            <DataTableCell large>
                                <InputField
                                    value={wlItem.targetProgram}
                                    onChange={event => handleTargetProgramChange(event, index)}
                                    error={!!validations.validations[index]?.targetProgram}
                                    validationText={validations.validations[index]?.targetProgram || ''}
                                />
                            </DataTableCell>
                            <DataTableCell large>
                                <InputField
                                    value={wlItem.workingList}
                                    error={!!validations.validations[index]?.workingList}
                                    validationText={validations.validations[index]?.workingList || ''}
                                    onChange={event => handleTargetWorkingListChange(event, index)}
                                />
                            </DataTableCell>
                            <DataTableCell large><InputField
                                value={wlItem.timeField}
                                error={!!validations.validations[index]?.timeField}
                                validationText={validations.validations[index]?.timeField || ''}
                                helpText={i18n.t(
                                    '(Optional) Data Element or Tracked Entity Attribute UID. Default is Event Date.',
                                )}
                                onChange={event => handleTargetTimeFieldChange(event, index)}
                            /></DataTableCell>
                            <DataTableCell large align="center">
                                <Button
                                    onClick={() => handleRemoveWorkingList(index)}
                                    icon={<IconDelete24 />}
                                    destructive
                                />
                            </DataTableCell>
                        </DataTableRow>
                    ))}
                </TableBody>
            </DataTable>
        }
    </div>);
};
