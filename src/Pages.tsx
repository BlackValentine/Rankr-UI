import React, { useEffect } from 'react';
import Welcome from './pages/Welcome';
import { AppPage, actions, state } from './state';
import Create from './pages/Create';
import Join from './pages/Join';
import { CSSTransition } from 'react-transition-group';
import { useSnapshot } from 'valtio'
import WaitingRoom from './pages/WaitingRoom';
import { Voting } from './pages/Voting';
import { Results } from './pages/Result';

const routeConfig = {
    [AppPage.Welcome]: Welcome,
    [AppPage.Create]: Create,
    [AppPage.Join]: Join,
    [AppPage.WaitingRoom]: WaitingRoom,
    [AppPage.Voting]: Voting,
    [AppPage.Results]: Results,
};

const Pages: React.FC = () => {
    // import the state and hook
    const currentState = useSnapshot(state);

    useEffect(() => {
        if (currentState.me?.id && !currentState.poll?.hasStarted) {
            actions.setPage(AppPage.WaitingRoom);
        }

        // add this if block
        if (currentState.me?.id && currentState.poll?.hasStarted) {
            actions.setPage(AppPage.Voting);
        }

        if (currentState.me?.id && currentState.hasVoted) {
            actions.setPage(AppPage.Results);
        }
        // add sequential check here
    }, [currentState.me?.id, currentState.poll?.hasStarted, currentState.hasVoted]);

    return (
        <>
            {Object.entries(routeConfig).map(([page, Component]) => (
                <CSSTransition
                    key={page}
                    in={page === currentState.currentPage}
                    timeout={300}
                    classNames="page"
                    unmountOnExit
                >
                    <div className="page mobile-height max-w-screen-sm mx-auto py-8 px-4 overflow-y-auto">
                        <Component />
                    </div>
                </CSSTransition>
            ))}
        </>
    );
};

export default Pages;