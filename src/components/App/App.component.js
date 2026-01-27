// @flow
/* eslint-disable import/first */
import './app.css';
import React from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AppContents } from './AppContents.component';
import {
    RulesEngineVerboseInitializer,
} from '../../core_modules/capture-core/components/RulesEngineVerboseInitializer';
import {
    MetadataAutoSelectInitializer,
} from '../../core_modules/capture-core/components/MetadataAutoSelectInitializer';

import { AppProvider } from '../../context';

type Props = {
    store: ReduxStore,
};

const queryClient = new QueryClient();

export const App = ({ store }: Props) => (
    <React.Fragment>
        <QueryClientProvider client={queryClient}>
            <Provider
                store={store}
            >
                <AppProvider>
                    <MetadataAutoSelectInitializer>
                        <RulesEngineVerboseInitializer>
                            <AppContents />
                        </RulesEngineVerboseInitializer>
                    </MetadataAutoSelectInitializer>
                </AppProvider>
            </Provider>
        </QueryClientProvider>
    </React.Fragment>
);
