import { useCallback, useEffect, useRef, useState } from 'react';
import { useSessionStore } from '../../../store/session.store.js';
import { ticketBoardsApi } from '../boards/api/ticketBoardsApi.js';
import { BOARD_TYPES } from '../boards/domain/boardTypes.js';
import {
    subscribeBoardRealtime
} from '../boards/realtime/boardSocket.js';

const objectIdPattern = /^[0-9a-f]{24}$/iu;

export const useExternalReceivedBadge = () => {
    const selectedRoom = useSessionStore((state) => state.selectedRoom);
    const authStatus = useSessionStore((state) => state.authStatus);
    const candidate = String(
        selectedRoom?.backendId || selectedRoom?.id || ''
    );
    const roomId = objectIdPattern.test(candidate) ? candidate : '';
    const [count, setCount] = useState(0);
    const sequenceRef = useRef(0);

    const load = useCallback(async ({ signal } = {}) => {
        if (authStatus !== 'authenticated' || !roomId) {
            setCount(0);
            return;
        }

        const sequence = ++sequenceRef.current;
        try {
            const [pending, processing] = await Promise.all([
                ticketBoardsApi.getBoardItems({
                    roomId,
                    boardType: BOARD_TYPES.EXTERNAL_RECEIVED,
                    query: {
                        page: 1,
                        limit: 1,
                        externalState: 'PENDING'
                    },
                    signal
                }),
                ticketBoardsApi.getBoardItems({
                    roomId,
                    boardType: BOARD_TYPES.EXTERNAL_RECEIVED,
                    query: {
                        page: 1,
                        limit: 1,
                        externalState: 'PROCESSING'
                    },
                    signal
                })
            ]);

            if (sequence !== sequenceRef.current) return;
            setCount(
                (Number(pending.data?.pagination?.totalItems) || 0)
                + (Number(processing.data?.pagination?.totalItems) || 0)
            );
        } catch (error) {
            if (error?.name !== 'AbortError'
                && sequence === sequenceRef.current) {
                setCount(0);
            }
        }
    }, [authStatus, roomId]);

    useEffect(() => {
        const controller = new AbortController();
        load({ signal: controller.signal });
        return () => controller.abort();
    }, [load]);

    useEffect(() => {
        if (authStatus !== 'authenticated' || !roomId) return undefined;
        return subscribeBoardRealtime({
            roomId,
            boardType: BOARD_TYPES.EXTERNAL_RECEIVED,
            onInvalidate: () => load()
        });
    }, [authStatus, load, roomId]);

    return count;
};
