// @flow
import React, { useState, useEffect, useMemo } from 'react';
import i18n from '@dhis2/d2-i18n';
import {
    DataTable,
    DataTableRow,
    DataTableCell,
    DataTableColumnHeader,
    TableHead,
    TableBody,
    Input,
    Pagination,
    Checkbox,
    CircularLoader,
    InputField,
} from '@dhis2/ui';

import { useDataQuery } from '@dhis2/app-runtime';
import 'sympheos-core/settings-page/settings-page.css';

import { useDataStore } from '../../../hooks/useDataStore';

export const ProgramStagesSettings = () => {
    const {
        storeMutation: psSettingsStoreMutation,
        storeQuery: psSettingsStoreQuery,
    } = useDataStore({ key: 'programStagesSettings', lazyGet: false });

    const {
        data: programStagesData,
        refetch: programStagesRefetch,
        loading: programStagesLoading,
    } = useDataQuery(useMemo(() => ({
        results: {
            resource: 'programStages',
            params: ({ token, page, pageSize }) => {
                const paramsObject = {
                    fields: 'id,displayName,program[id,displayName]',
                    page,
                    pageSize,
                };
                if (token) {
                    paramsObject.filter = [
                        `name:ilike:${token}`,
                        `program.name:ilike:${token}`,
                        `identifiable:token:${token}`,
                    ];
                    paramsObject.rootJunction = 'OR';
                }
                return paramsObject;
            },
        },
    }), []), { lazy: true });

    const [paging, setPaging] = useState({ token: undefined, page: 1, pageSize: 10 });
    const [showFilter, setShowFilter] = useState(false);

    const handleSettingChange = (programStageId, settingKey, value) => {
        const currentSettings = psSettingsStoreQuery.data?.results || {};
        if (!currentSettings[programStageId]) {
            currentSettings[programStageId] = {};
        }
        currentSettings[programStageId][settingKey] = value;
        psSettingsStoreMutation.mutate({
            key: 'programStagesSettings',
            data: { ...currentSettings },
        }).finally(() => {
            psSettingsStoreQuery.refetch();
        });
    };

    useEffect(() => {
        programStagesRefetch({
            token: paging.token,
            page: paging.page,
            pageSize: paging.pageSize,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paging]);


    return (<>
        <DataTable layout="fixed" scrollHeight="350px">
            <TableHead>
                <DataTableRow>
                    <DataTableColumnHeader
                        showFilter={showFilter}
                        onFilterIconClick={() => setShowFilter(prev => !prev)}
                        name="programStages"
                        top="0"
                        colSpan="4"
                        filter={<InputField
                            dense
                            clearable
                            name="programStages"
                            onChange={event => setPaging(prev => ({ ...prev, token: event.value, page: 1 }))}
                            value={paging.token || ''}
                            placeholder={i18n.t('Filter by Program, Program Stage UID, name, ...')}
                        />}
                        fixed
                    >
                        {i18n.t('Program | Program Stages')}
                    </DataTableColumnHeader>
                    <DataTableColumnHeader
                        name="createData"
                        top="0"
                        colSpan="1"
                        fixed
                    >
                        {i18n.t('Enable Create')}
                    </DataTableColumnHeader>
                    <DataTableColumnHeader
                        name="editData"
                        top="0"
                        colSpan="1"
                        fixed
                    >
                        {i18n.t('Enable Edit')}
                    </DataTableColumnHeader>
                    <DataTableColumnHeader
                        name="printData"
                        top="0"
                        colSpan="1"
                        fixed
                    >
                        {i18n.t('Enable Print')}
                    </DataTableColumnHeader>
                </DataTableRow>
            </TableHead>
            <TableBody>
                {programStagesLoading && (<DataTableRow>
                    <DataTableCell colSpan="7">
                        <div className="centered-cell" >
                            <CircularLoader />
                        </div>
                    </DataTableCell>
                </DataTableRow>)}
                {!programStagesLoading && programStagesData?.results.programStages.map((programStage) => {
                    const programStageId = programStage.id;
                    const programName = programStage.program?.displayName || programStage.displayName;
                    return (<DataTableRow key={programStageId}>
                        <DataTableCell colSpan="4">
                            <b>{programName}</b> | {programStage.displayName}
                        </DataTableCell>
                        <DataTableCell colSpan="1">
                            <Checkbox
                                disabled={psSettingsStoreQuery.loading || psSettingsStoreMutation.loading}
                                checked={psSettingsStoreQuery.data?.results?.[programStageId]?.enableCreate}
                                onChange={event => handleSettingChange(programStageId, 'enableCreate', event.checked)}
                            />
                        </DataTableCell>
                        <DataTableCell colSpan="1">
                            <Checkbox
                                disabled={psSettingsStoreQuery.loading || psSettingsStoreMutation.loading}
                                checked={psSettingsStoreQuery.data?.results?.[programStageId]?.enableEdit}
                                onChange={event => handleSettingChange(programStageId, 'enableEdit', event.checked)}
                            />
                        </DataTableCell>
                        <DataTableCell colSpan="1">
                            <Checkbox
                                disabled={psSettingsStoreQuery.loading || psSettingsStoreMutation.loading}
                                checked={psSettingsStoreQuery.data?.results?.[programStageId]?.enablePrint}
                                onChange={event => handleSettingChange(programStageId, 'enablePrint', event.checked)}
                            />
                        </DataTableCell>
                    </DataTableRow>);
                })}
            </TableBody>
        </DataTable>
        <Pagination
            onPageChange={page => setPaging(prev => ({ ...prev, page }))}
            onPageSizeChange={pageSize => setPaging(prev => ({ ...prev, page: 1, pageSize }))}
            pageSizes={['5', '10', '15', '20']}
            page={paging.page}
            pageSize={paging.pageSize}
            pageCount={programStagesData?.results.pager?.pageCount || 1}
            total={programStagesData?.results.pager?.total || 0}
        />
    </>);
};
