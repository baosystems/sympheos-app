// @flow
import React, { useState, useRef, useCallback } from 'react';
import { HashRouter as Router } from 'react-router-dom';
import CssBaseline from '@material-ui/core/CssBaseline';
import { MuiThemeProvider } from '@material-ui/core/styles';
import { SnackbarProvider } from 'commons/Snackbar/SnackbarProvider';
// eslint-disable-next-line import/extensions
import 'typeface-roboto';
import { AppLoader } from '../AppLoader';
import { App } from '../App';
import { loadApp } from './appStart.actions';
import { addBeforeUnloadEventListener } from './unload';
import { CacheExpired } from './CacheExpired.component';
import { JSSProviderShell } from './JSSProviderShell.component';
import { theme } from '../../styles/uiTheme';
import { useDataStore } from '../../hooks/useDataStore';

export const AppStart = () => {
    const [ready, setReadyStatus] = useState(false);
    const [cacheExpired, setCacheExpired] = useState(false);
    const { storeMutation, storeQuery } = useDataStore({ key: 'settings' });

    const store: { current: Object } = useRef();

    const handleRunApp = useCallback((storeArg: PlainReduxStore) => {
        storeQuery.refetch({ key: 'settings' }).then((data) => {
            if (!data) {
                storeMutation.mutate({
                    key: 'settings',
                    data: {
                        optionSets: {
                            defaultProfile: 'WT3MuPwNwwh',
                            instanceType: 'gVUs8MP8PBG',
                        },
                        supersetDashboards: {
                            deviceOverview: {
                                id: '',
                            },
                            mPimaOverview: {
                                id: '',
                            },
                            overview: {
                                id: '',
                            },
                            pimaOverview: {
                                id: '',
                            },
                            resultsOverview: {
                                id: '',
                            },
                        },
                    },
                });
            }
        });
        store.current = storeArg;
        setReadyStatus(true);
        storeArg.dispatch(loadApp());
        addBeforeUnloadEventListener(storeArg);
    }, [
        setReadyStatus,
        store,
        storeQuery,
        storeMutation,
    ]);

    const handleCacheExpired = useCallback(() => {
        setCacheExpired(true);
    }, [setCacheExpired]);

    if (cacheExpired) {
        return (
            <CacheExpired />
        );
    }

    return (
        <React.Fragment>
            <SnackbarProvider>
                <CssBaseline />
                <JSSProviderShell>
                    <MuiThemeProvider
                        theme={theme}
                    >
                        <Router>
                            {
                                ready ?
                                    <App
                                        store={store.current}
                                    /> :
                                    <AppLoader
                                        onRunApp={handleRunApp}
                                        onCacheExpired={handleCacheExpired}
                                    />
                            }
                        </Router>
                    </MuiThemeProvider>
                </JSSProviderShell>
            </SnackbarProvider>
        </React.Fragment>
    );
};
