// @flow
import moment from 'moment';
import {
    convertFromIso8601,
} from '@dhis2/multi-calendar-dates';
import { systemSettingsStore } from '../../../../capture-core/metaDataMemoryStores';
import { padWithZeros } from '../../../../capture-core-utils/date';

/**
 * Converts a date from ISO calendar to local calendar
 * @export
 * @param {string} isoDate - date in ISO format
 * @returns {string}
 */

export function convertIsoToLocalCalendar(isoDate: ?string, withTime: boolean = false): string {
    if (!isoDate) {
        return '';
    }

    isoDate = isoDate.replace('Z', ''); // Remove the trailing 'Z' to avoid timezone issues
    const time = isoDate.split('T')[1]?.split('.')[0] || '00:00:00'; // Default to midnight if no time is provided

    const momentDate = moment(isoDate);
    if (!momentDate.isValid()) {
        return '';
    }

    const formattedIsoDate = momentDate.format('YYYY-MM-DD');

    const calendar = systemSettingsStore.get().calendar;
    const dateFormat = systemSettingsStore.get().dateFormat;

    const { year, eraYear, month, day } = convertFromIso8601(formattedIsoDate, calendar);
    const localYear = calendar === 'ethiopian' ? eraYear : year;

    const resultDate = dateFormat === 'DD-MM-YYYY'
        ? `${padWithZeros(day, 2)}-${padWithZeros(month, 2)}-${padWithZeros(localYear, 4)}`
        : `${padWithZeros(localYear, 4)}-${padWithZeros(month, 2)}-${padWithZeros(day, 2)}`;

    if (!withTime) {
        return resultDate;
    }
    return `${resultDate}T${time}`;
}
