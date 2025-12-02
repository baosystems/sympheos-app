// @flow
import React from 'react';
import i18n from '@dhis2/d2-i18n';
import { Button } from '@dhis2/ui';
import { ConditionalTooltip } from 'capture-core/components/Tooltips/ConditionalTooltip';

type Props = {
    disabled: boolean,
}

export const SMSPrinterManager = ({ disabled }: Props) => {
    const a = 1;
    return (<>
        {!disabled && <Button
            secondary
            small
            disabled={disabled}
        >
            {i18n.t('Send to SMS Printer')}
        </Button>}
    </>);
};
