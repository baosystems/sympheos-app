// @flow
import React, { useState } from 'react';
import { AlertBar, AlertStack } from '@dhis2/ui';
import { SnackbarContext, SnackbarSeverity } from 'commons/Snackbar/SnackbarContext';
import type { Node, ComponentType } from 'react';
import type { Snackbar } from 'commons/Snackbar/SnackbarContext';

type SnackbarProviderProps = {
    children: Node;
};

export const SnackbarProvider: ComponentType<SnackbarProviderProps> = ({ children }) => {
    const [snackbars, setSnackbars] = useState<Array<Snackbar | null>>([]);

    const showSnackbar = (snackbar) => {
        setSnackbars([...snackbars, snackbar]);
    };

    const handleClose = (index) => {
        const newSnackbars = [...snackbars];
        newSnackbars[index] = null;
        setSnackbars(newSnackbars);
    };

    return (
        <SnackbarContext.Provider value={{ showSnackbar }}>
            {children}
            <AlertStack className="flex-horizontal justify-start">
                {snackbars.map((snackbar: (Snackbar | null), index) => {
                    if (snackbar) {
                        return (<AlertBar
                            // eslint-disable-next-line react/no-array-index-key
                            key={`${snackbar.key}${index}`}
                            onHidden={() => handleClose(index)}
                            duration={snackbar.duration}
                            permanent={!snackbar.duration}
                            critical={snackbar.severity === SnackbarSeverity.CRITICAL}
                            warning={snackbar.severity === SnackbarSeverity.WARNING}
                            success={snackbar.severity === SnackbarSeverity.SUCCESS}
                        >
                            {snackbar.message}
                        </AlertBar>);
                    }
                    return null;
                })}
            </AlertStack>
        </SnackbarContext.Provider>
    );
};
