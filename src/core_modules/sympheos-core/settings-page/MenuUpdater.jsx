// @flow
import {
    Button,
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    ButtonStrip,
    Box,
} from '@dhis2/ui';
import React, { useState } from 'react';
import i18n from '@dhis2/d2-i18n';
import { FiAlertTriangle, FiEdit } from 'react-icons/fi';
import { useSnackbar, SnackbarSeverity } from 'commons/Snackbar/SnackbarContext';
import menu from 'commons/Sidebar/menuOptions';

import { useDataStore } from '../../../hooks/useDataStore';

const mapTitlesById = (menuObject) => {
    const result = {};

    const visit = (node) => {
        if (!node || typeof node !== 'object') return;

        if (node.title && typeof node.title === 'object') {
            const key = node.id ?? node.title?.default;
            if (key) result[key] = node.title;
        }

        if (Array.isArray(node.children)) {
            node.children.forEach(visit);
        }
    };

    if (Array.isArray(menuObject)) menuObject.forEach(visit);

    return result;
};

const updateTitle = (node, titlesMap) => {
    if (!node || typeof node !== 'object') return;

    const newTitle = titlesMap[node.id];
    if (newTitle) {
        node.title = newTitle;
    }

    if (Array.isArray(node.children)) {
        node.children.forEach(child => updateTitle(child, titlesMap));
    }
};

const MenuUpdater = () => {
    const {
        storeMutation,
        storeQuery,
    } = useDataStore({ key: 'sympheosMenu', lazyGet: true });

    const { showSnackbar } = useSnackbar();
    const [isLoading, setIsLoading] = useState(false);
    const [hide, setHide] = useState(true);

    const handleUpdateMenu = async () => {
        setIsLoading(true);
        const currentMenuResults = await storeQuery.refetch();
        const currentMenu = currentMenuResults?.results?.menu || menu.menu;
        const titlesMap = mapTitlesById(menu.menu);
        currentMenu.forEach(node => updateTitle(node, titlesMap));
        storeMutation.mutate({
            key: 'sympheosMenu',
            data: { menu: currentMenu },
        }).then(() => {
            window.location.reload(false);
        }).catch(() => {
            setIsLoading(false);
            showSnackbar({
                key: `update-error-${new Date().getTime()}`,
                message: i18n.t('An error occurred while updating the App Menu labels.'),
                severity: SnackbarSeverity.CRITICAL,
            });
        });
    };

    return (<>
        <Modal hide={hide} onClose={() => setHide(true)}>
            <ModalTitle>{i18n.t('Confirmation')}</ModalTitle>
            <ModalContent>
                <Box>
                    {i18n.t('Are you sure you want to update the labels of the App Menu to the latest version?')}
                </Box>
            </ModalContent>
            <ModalActions>
                <ButtonStrip end>
                    <Button
                        onClick={() => setHide(true)}
                        secondary
                        disabled={isLoading}
                    >
                        {i18n.t('Cancel')}
                    </Button>
                    <Button
                        onClick={handleUpdateMenu}
                        destructive
                        loading={isLoading}
                        icon={<FiAlertTriangle />}
                    >
                        {i18n.t('Continue')}
                    </Button>
                </ButtonStrip>
            </ModalActions>
        </Modal>
        <Button
            destructive
            secondary
            onClick={() => setHide(false)}
            loading={isLoading}
            disabled={false}
            icon={<FiEdit />}
        >
            {i18n.t('Update App Menu labels')}
        </Button>
    </>);
};

export default MenuUpdater;
