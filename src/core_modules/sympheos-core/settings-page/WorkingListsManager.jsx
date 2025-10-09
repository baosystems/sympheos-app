import React, { useState, useEffect, useRef } from 'react';
import i18n from '@dhis2/d2-i18n';
import { useDataQuery } from '@dhis2/app-runtime';
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
    SingleSelectField,
    SingleSelectOption,
} from '@dhis2/ui';
import { useSnackbar } from 'commons/Snackbar/SnackbarContext';

import 'sympheos-core/settings-page/settings-page.css';

import { useDataStore } from '../../../hooks/useDataStore';

const programsQuery = {
    results: {
        resource: 'programs',
        params: {
            fields: 'id,displayName',
            paging: 'false',
        },
    },
};

const lineListsQuery = {
    results: {
        resource: 'eventVisualizations',
        params: {
            fields: 'id,displayName,sharing',
            paging: 'false',
            filter: 'type:eq:LINE_LIST',
        },
    },
};

const validationsList = [
    ({ wl }) => {
        if (!wl.targetProgram) {
            return {
                targetProgram: i18n.t('A Program is required'),
            };
        }
        return null;
    },
    ({ wl }) => {
        if (!wl.targetProgram.match(/^[A-Za-z][A-Za-z0-9]{10}$/)) {
            return {
                targetProgram: i18n.t('Invalid Program UID'),
            };
        }
        return null;
    },
    ({ wl, workingLists }) => {
        if (workingLists.filter(item => item.targetProgram === wl.targetProgram).length > 1) {
            return {
                targetProgram: i18n.t('Program UID can only be configured once'),
            };
        }
        return null;
    },
    ({ wl }) => {
        if (!wl.workingList) {
            return {
                workingList: i18n.t('A Line List is required'),
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
    ({ wl }) => {
        if (wl.timeField && wl.timeField.trim() !== '' && !wl.timeField.match(/^[A-Za-z][A-Za-z0-9]{10}$/)) {
            return {
                timeField: i18n.t('Invalid Time Field UID'),
            };
        }
        return null;
    },
];

const SingleSelectFieldMemo = React.memo(({ value, onChange, optionElems, error, warning, validationText }) => (
    <SingleSelectField
        clearable
        selected={value}
        onChange={onChange}
        error={error}
        warning={warning}
        validationText={validationText}
    >
        {optionElems}
    </SingleSelectField>
));

const getTableBody = ({
    workingLists,
    dataLineLists,
    loadingLineLists,
    dataPrograms,
    loadingPrograms,
    validations,
    handleTargetProgramChange,
    handleTargetWorkingListChange,
    handleTargetTimeFieldChange,
    handleRemoveWorkingList,
}) => {
    if (loadingLineLists || loadingPrograms) {
        return (<DataTableRow>
            <DataTableCell large colSpan="4">
                <CircularLoader />
            </DataTableCell>
        </DataTableRow>);
    }

    const programs = dataPrograms?.results?.programs;

    const programElems = programs?.map(({ id, displayName }) => (
        <SingleSelectOption
            key={id}
            value={id}
            label={displayName}
        />
    )) || [];

    const eventVisualizations = dataLineLists?.results?.eventVisualizations;

    const getLineListValidationText = ({ notFoundError, notPubliclyAvailable }) => {
        let validationText = '';
        if (notPubliclyAvailable) {
            validationText = i18n.t('This Line List is not publicly available. Users may not be able to access it.');
        } else if (notFoundError) {
            validationText = i18n.t('You have no access to this Line List or it does not exist');
        }
        return validationText;
    };

    const LineListSelector = React.memo(({ wlItem, lineListElems, index }) => {
        const selectedWl = eventVisualizations.find(ev => ev.id === wlItem.workingList);
        const publicSharing = selectedWl?.sharing?.publicAccess || '--------';
        const notPubliclyAvailable = wlItem.workingList && publicSharing[0] === '-';
        const notFoundError = !selectedWl && wlItem.workingList;

        return (<SingleSelectFieldMemo
            optionElems={lineListElems}
            value={selectedWl?.id || ''}
            error={!!validations.validations[index]?.workingList || notFoundError}
            warning={notPubliclyAvailable}
            validationText={
                validations.validations[index]?.workingList ||
                getLineListValidationText({ notFoundError, notPubliclyAvailable })
            }
            onChange={event => handleTargetWorkingListChange(event, index)}
        />);
    });

    const lineListElems = eventVisualizations?.map(({ id, displayName }) => (
        <SingleSelectOption
            key={id}
            value={id}
            label={displayName}
        />
    )) || [];

    return (workingLists.map((wlItem, index) => (<DataTableRow key={wlItem.id}>
        <DataTableCell large>
            <SingleSelectFieldMemo
                optionElems={programElems}
                value={wlItem.targetProgram}
                onChange={event => handleTargetProgramChange(event, index)}
                error={!!validations.validations[index]?.targetProgram}
                validationText={validations.validations[index]?.targetProgram || ''}
            />
        </DataTableCell>
        <DataTableCell large>
            <LineListSelector
                wlItem={wlItem}
                lineListElems={lineListElems}
                index={index}
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
    )));
};

export const WorkingListsManager = () => {
    const {
        storeMutation: workingListsStoreMutation,
        storeQuery: workingListsStoreQuery,
    } = useDataStore({ key: 'workingLists', lazyGet: false });

    const {
        loading: loadingPrograms,
        data: dataPrograms,
    } = useDataQuery(programsQuery, { lazy: false });

    const {
        loading: loadingLineLists,
        data: dataLineLists,
    } = useDataQuery(lineListsQuery, { lazy: false });

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
        newWorkingLists[index].targetProgram = event.selected;
        setWorkingLists(newWorkingLists);
        setEnableSave(true);
    };

    const handleTargetWorkingListChange = (event, index) => {
        const newWorkingLists = [...workingLists];
        newWorkingLists[index].workingList = event.selected;
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
                        <DataTableColumnHeader width="30%">{i18n.t('Program')}</DataTableColumnHeader>
                        <DataTableColumnHeader width="30%">{i18n.t('Line List')}</DataTableColumnHeader>
                        <DataTableColumnHeader width="30%">
                            {i18n.t('Time field for Date filters')}
                        </DataTableColumnHeader>
                        <DataTableColumnHeader width="10%" />
                    </DataTableRow>
                </TableHead>
                <TableBody>
                    {getTableBody({
                        workingLists,
                        dataLineLists,
                        loadingLineLists,
                        dataPrograms,
                        loadingPrograms,
                        validations,
                        handleTargetProgramChange,
                        handleTargetWorkingListChange,
                        handleTargetTimeFieldChange,
                        handleRemoveWorkingList,
                    })}
                </TableBody>
            </DataTable>
        }
    </div>);
};
