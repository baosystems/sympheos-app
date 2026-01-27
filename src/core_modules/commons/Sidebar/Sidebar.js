import React, { useEffect, useState } from 'react';
import { CircularLoader } from '@dhis2/ui';
import i18n from '@dhis2/d2-i18n';
import { Link, useLocation } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useUserLocale } from 'capture-core/utils/localeData/useUserLocale';
import { useDataStore, useUserUserGroups } from '../../../hooks';
import menu from './menuOptions';
import { getIcon } from '../../../utils';
import { userHasAccess, optionIsActive, isMenuReady, menuHasErrors } from './utils';

const buildMenuItemContent = (item, isCollapsed, locale) => {
    const Icon = getIcon(item.icon);

    return (<>
        {Icon && <Icon size={18} />}
        {!isCollapsed && <span>{item.title[locale] || item.title.default || item.id}</span>}
    </>);
};

const buildItemComponent = (
    {
        location,
        isCollapsed,
        item,
        isHeader = true,
        locale = 'default',
    },
) => {
    const padding = isHeader ? '0.5rem' : '0.25rem';

    if (item.link) {
        return (<Link
            to={item.link}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding,
                color: 'white',
                textDecoration: 'none',
                backgroundColor: optionIsActive(location, item) ? '#374151' : 'transparent',
                borderRadius: '6px',
            }}
        >
            {buildMenuItemContent(item, isCollapsed, locale)}
        </Link>);
    }

    return (<div
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding,
            fontWeight: isHeader ? 'bold' : 'normal',
            color: 'white',
        }}
    >
        {buildMenuItemContent(item, isCollapsed, locale)}
    </div>);
};

const buildChildren = ({
    item,
    userGroups,
    locale,
    location,
}) => (<ul className={'list_sidebar'}>
    {item.children.reduce((childItems, child) => {
        if (
            child.userGroups &&
            !userHasAccess(child.userGroups, userGroups)
        ) {
            return childItems;
        }
        childItems.push(<li
            key={child.id || child.title}
            style={{
                cursor: 'pointer',
            }}
        >
            {buildItemComponent({
                location,
                isCollapsed: false,
                item: child,
                isHeader: false,
                locale,
            })}
        </li>);
        return childItems;
    }, [])}
</ul>);

export const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [displayMenu, setDisplayMenu] = useState();
    const location = useLocation();
    const {
        locale,
        isLoading: localeLoading,
        isError: localeError,
    } = useUserLocale();
    const {
        userGroups,
        isLoading: userGroupsLoading,
        isError: userGroupsError,
    } = useUserUserGroups();

    const { storeQuery, storeMutation } = useDataStore({ key: 'sympheosMenu', lazyGet: false });

    const toggleCollapse = () => setIsCollapsed(!isCollapsed);

    useEffect(() => {
        if (storeQuery.loading || storeMutation.loading) {
            return;
        }

        if (storeQuery.data && storeQuery.data.results) {
            setDisplayMenu(storeQuery.data.results);
        } else {
            storeMutation.mutate({
                key: 'sympheosMenu',
                data: menu,
            });
            storeQuery.refetch({ key: 'sympheosMenu' });
        }
    }, [storeQuery, storeMutation]);

    const buildMenu = () => {
        if (!isMenuReady({
            menuHasContent: !!displayMenu?.menu,
            storeQueryLoading: storeQuery.loading,
            localeLoading,
            userGroupsLoading,
        }) || menuHasErrors(localeError, userGroupsError)) {
            return (<></>);
        }

        return (<ul style={{ listStyle: 'none', padding: 0 }}>
            {displayMenu.menu.reduce((items, item) => {
                if (
                    item.userGroups &&
                    !userHasAccess(item.userGroups, userGroups)
                ) {
                    return items;
                }

                items.push(<li
                    key={item.id || item.title}
                    style={{
                        marginBottom: '0.5rem',
                        cursor: 'pointer',
                    }}
                >
                    {buildItemComponent({
                        location,
                        isCollapsed,
                        item,
                        locale,
                    })}

                    {!isCollapsed && item.children && buildChildren({
                        item,
                        userGroups,
                        locale,
                        location,
                    })}
                </li>);
                return items;
            }, [])}
            {buildItemComponent({
                location,
                isCollapsed,
                item: {
                    id: 'about',
                    title: { default: i18n.t('About') },
                    icon: 'FiInfo',
                    link: '/about',
                },
                locale,
            })}
        </ul>);
    };

    return (
        <aside
            style={{
                width: isCollapsed ? '50px' : '240px',
                minWidth: isCollapsed ? '50px' : '240px',
                background: '#1f2937',
                color: 'white',
                maxHeight: '100%',
                padding: '0.5rem',
                transition: 'width 0.2s ease',
                marginRight: '1px',
                overflowY: 'auto',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: isCollapsed ? 'center' : 'space-between',
                    marginBottom: '1rem',
                }}
            >
                {!isCollapsed && <p>
                    Sympheos™ App
                </p>}
                <button
                    onClick={toggleCollapse}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    {isCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
                </button>
            </div>

            {!isMenuReady({
                menuHasContent: !!displayMenu?.menu,
                storeQueryLoading: storeQuery.loading,
                localeLoading,
                userGroupsLoading,
            }) && !menuHasErrors(localeError, userGroupsError) &&
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100px',
                        width: '100%',
                    }}
                >
                    <CircularLoader
                        size={24}
                        invert
                    />
                </div>
            }
            {buildMenu()}
        </aside>
    );
};
