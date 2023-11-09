import { proxy, ref } from 'valtio';
import { Poll } from './types';
import { subscribeKey } from 'valtio/utils';
import { getTokenPayload } from './util';
import { Socket } from 'socket.io-client';
import { createSocketWithHandlers, socketIOUrl } from './socket-io';
import { nanoid } from 'nanoid';

export enum AppPage {
    Welcome = 'welcome',
    Create = 'create',
    Join = 'join',
    WaitingRoom = 'waitingRoom',
    Voting = 'voting',
    Results = 'results',
}

export type AppState = {
    isLoading: boolean;
    currentPage: AppPage;
    poll?: Poll;
    accessToken?: string;
    socket?: Socket;
    wsErrors: WsErrorUnique[];
    me?: Me;
    isAdmin: boolean;
    nominationCount: number;
    participantCount: number;
    canStartVote: boolean;
    hasVoted: boolean;
    rankingsCount: number;
};

type Me = {
    id: string;
    name: string;
}

export type WsError = {
    type: string;
    message: string;
};

export type WsErrorUnique = WsError & {
    id: string;
};

const state = proxy<AppState>({
    isLoading: false,
    currentPage: AppPage.Welcome,
    wsErrors: [],
    get me() {
        const accessToken = this.accessToken;

        if (!accessToken) {
            return;
        }

        const token = getTokenPayload(accessToken);

        return {
            id: token.sub,
            name: token.name,
        };
    },
    get isAdmin() {
        if (!this.me) {
            return false;
        }
        return this.me?.id === this.poll?.adminID;
    },
    get participantCount() {
        return Object.keys(this.poll?.participants || {}).length;
    },
    get nominationCount() {
        return Object.keys(this.poll?.nominations || {}).length;
    },
    get canStartVote() {
        const votesPerVoter = this.poll?.votesPerVoter ?? 100;

        return this.nominationCount >= votesPerVoter;
    },
    get hasVoted() {
        const rankings = this.poll?.rankings || {};
        const userID = this.me?.id || '';

        return !!rankings[userID];
    },
    get rankingsCount() {
        return Object.keys(this.poll?.rankings || {}).length;
    },
});

const actions = {
    setPage: (page: AppPage): void => {
        state.currentPage = page;
    },

    startOver: (): void => {
        actions.reset();
        localStorage.removeItem('accessToken');
        actions.setPage(AppPage.Welcome);
    },

    reset: (): void => {
        state.socket?.disconnect();
        state.poll = undefined;
        state.accessToken = undefined;
        state.isLoading = false;
        state.socket = undefined;
        state.wsErrors = [];
    },

    startLoading: (): void => {
        state.isLoading = true;
    },
    stopLoading: (): void => {
        state.isLoading = false;
    },
    initializePoll: (poll?: Poll): void => {
        state.poll = poll;
    },
    setPollAccessToken: (token?: string): void => {
        state.accessToken = token;
    },
    initializeSocket: (): void => {
        if (!state.socket) {
            state.socket = ref(
                createSocketWithHandlers({
                    socketIOUrl,
                    state,
                    actions,
                })
            );
            return;
        }
        if (!state.socket.connected) {
            state.socket.connect();
            return;
        }
        actions.stopLoading();
    },
    updatePoll: (poll: Poll): void => {
        state.poll = poll;
    },
    nominate: (text: string): void => {
        state.socket?.emit('nominate', { text });
    },
    removeNomination: (id: string): void => {
        state.socket?.emit('remove_nomination', { id });
    },
    removeParticipant: (id: string): void => {
        state.socket?.emit('remove_participant', { id });
    },
    startVote: (): void => {
        state.socket?.emit('start_vote');
    },
    submitRankings: (rankings: string[]): void => {
        state.socket?.emit('submit_rankings', { rankings });
    },
    cancelPoll: (): void => {
        state.socket?.emit('cancel_poll');
    },
    closePoll: (): void => {
        state.socket?.emit('close_poll');
    },

    addWsError: (error: WsError): void => {
        state.wsErrors = [
            ...state.wsErrors,
            {
                ...error,
                id: nanoid(6),
            },
        ];
    },
    removeWsError: (id: string): void => {
        state.wsErrors = state.wsErrors.filter((error) => error.id !== id);
    },
};

subscribeKey(state, 'accessToken', () => {
    if (state.accessToken) {
        localStorage.setItem('accessToken', state.accessToken);
    }
});

export type AppActions = typeof actions;

export { state, actions };