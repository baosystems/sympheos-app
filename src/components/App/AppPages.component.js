// @flow
import React from 'react';
import { Route, Switch, Redirect, useLocation } from 'react-router-dom';
import { ViewEventPage } from 'capture-core/components/Pages/ViewEvent';
import { MainPage } from 'capture-core/components/Pages/MainPage';
import { SearchPage } from 'capture-core/components/Pages/Search';
import { NewPage } from 'capture-core/components/Pages/New';
import { EnrollmentPage } from 'capture-core/components/Pages/Enrollment';
import { StageEventListPage } from 'capture-core/components/Pages/StageEvent';
import { EnrollmentEditEventPage } from 'capture-core/components/Pages/EnrollmentEditEvent';
import { EnrollmentAddEventPage } from 'capture-core/components/Pages/EnrollmentAddEvent';
import { ReactQueryDevtools } from 'react-query/devtools';
import { Settings } from 'sympheos-core/settings-page/Settings';
import { About } from 'sympheos-core/about-page/About';
import DashboardContainer from 'sympheos-core/dashboard/Dashboard';
import { useParams } from 'react-router-dom/cjs/react-router-dom.min';

const ParamRoute = (props) => {
    const { search } = useLocation();
    const urlQuery = new URLSearchParams(search);
    const paramsSize = [...urlQuery.keys()].length;

    return paramsSize > 0 ? <Route {...props} /> : <Redirect to="/dashboard/overview" />;
};

const DashboardWrapper = () => {
    const { dashboardKey } = useParams();
    return (<DashboardContainer
        dashboardKey={dashboardKey}
    />);
};

export const AppPages = () => (
    <>
        <ReactQueryDevtools />
        <Switch>
            <Route
                path="/dashboard/:dashboardKey"
                component={DashboardWrapper}
            />
            <Route path="/settings" component={Settings} />
            <Route path="/about" component={About} />
            <Route path="/viewEvent" component={ViewEventPage} />
            <Route path="/search" component={SearchPage} />
            <Route path="/new" component={NewPage} />
            <Route path="/enrollment/stageEvents" component={StageEventListPage} />
            <Route path="/enrollmentEventEdit" component={EnrollmentEditEventPage} />
            <Route path="/enrollmentEventNew" component={EnrollmentAddEventPage} />
            <Route path="/enrollment" component={EnrollmentPage} />
            <Route path="/:keys" component={MainPage} />
            <ParamRoute path="/" component={MainPage} />
        </Switch>
    </>
);
