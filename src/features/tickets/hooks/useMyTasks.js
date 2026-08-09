import { useEffect, useMemo, useRef, useState } from 'react';
import { ticketsApi } from '../api/ticketsApi.js';
import { adaptTicketListItem } from '../domain/ticketListAdapter.js';
import { BOARD_TYPES } from '../boards/domain/boardTypes.js';
import { subscribeBoardRealtime } from '../boards/realtime/boardSocket.js';

const emptyPagination = { page: 1, limit: 25, totalItems: 0, totalPages: 0, hasNext: false, hasPrevious: false };

export const useMyTasks = ({ roomId, query, enabled }) => {
    const [items, setItems] = useState([]);
    const [pagination, setPagination] = useState(emptyPagination);
    const [loaded, setLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [realtimeConnected, setRealtimeConnected] = useState(false);
    const controllerRef = useRef(null);
    const sequenceRef = useRef(0);
    const loadedRef = useRef(false);
    const queryKey = useMemo(() => JSON.stringify(query || {}), [query]);

    useEffect(() => { loadedRef.current = loaded; }, [loaded]);

    const load = ({ background = false } = {}) => {
        if (!enabled) return Promise.resolve();
        const sequence = ++sequenceRef.current;
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        if (background && loadedRef.current) setRefreshing(true);
        else { setLoading(true); setLoaded(false); setItems([]); }
        setError(null);
        return ticketsApi.list({ ...query, view: 'MY_TASKS', roomId }, { signal: controller.signal }).then((response) => {
            if (sequence !== sequenceRef.current) return;
            setItems((response.data?.items || []).map((ticket) => adaptTicketListItem(ticket)));
            setPagination(response.data?.pagination || emptyPagination);
            loadedRef.current = true;
            setLoaded(true);
        }).catch((loadError) => {
            if (loadError?.name === 'AbortError' || sequence !== sequenceRef.current) return;
            setError(loadError);
        }).finally(() => {
            if (sequence === sequenceRef.current) { setLoading(false); setRefreshing(false); }
        });
    };

    useEffect(() => {
        if (!enabled) {
            controllerRef.current?.abort();
            setItems([]); setPagination(emptyPagination); setLoaded(false); setError(null);
            return undefined;
        }
        load();
        return () => controllerRef.current?.abort();
    }, [enabled, queryKey, roomId]);

    useEffect(() => {
        if (!enabled || !roomId) return undefined;
        return subscribeBoardRealtime({
            roomId,
            boardType: BOARD_TYPES.OPEN,
            onInvalidate: () => load({ background: true }),
            onConnectionChange: setRealtimeConnected
        });
    }, [enabled, queryKey, roomId]);

    return { items, pagination, loaded, loading, refreshing, error, realtimeConnected, refresh: () => load({ background: loadedRef.current }) };
};
