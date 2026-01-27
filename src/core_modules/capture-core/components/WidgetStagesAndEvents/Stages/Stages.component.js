// @flow
import React, { type ComponentType, useMemo } from 'react';
import { compose } from 'redux';
import { withStyles } from '@material-ui/core';
import { Stage } from './Stage';
import type { PlainProps, InputProps } from './stages.types';
import { withLoadingIndicator } from '../../../HOC';
import { useDataStore } from '../../../../../hooks/useDataStore';

const styles = {};
export const StagesPlain = ({ stages, events, classes, ...passOnProps }: PlainProps) => {
    const {
        storeQuery: psSettingsStoreQuery,
    } = useDataStore({ key: 'programStagesSettings', lazyGet: false });

    const eventsByStage = useMemo(
        () => stages.reduce(
            (acc, stage) => {
                acc[stage.id] = acc[stage.id] || [];
                return acc;
            },
            events.reduce(
                (acc, event) => {
                    const stageId = event.programStage;
                    if (acc[stageId]) {
                        acc[stageId].push(event);
                    } else {
                        acc[stageId] = [event];
                    }
                    return acc;
                },
                {},
            ),
        ),
        [stages, events],
    );

    return (<>
        {!psSettingsStoreQuery.loading &&
            stages
                .filter(stage => stage.dataAccess.read)
                .map(stage => (
                    <Stage
                        events={eventsByStage[stage.id]}
                        key={stage.id}
                        stage={stage}
                        className={classes.stage}
                        enableCreate={psSettingsStoreQuery.data?.results?.[stage.id]?.enableCreate}
                        {...passOnProps}
                    />
                ))
        }
    </>);
};

export const Stages: ComponentType<InputProps> = compose(withLoadingIndicator(), withStyles(styles))(StagesPlain);
