import { useEffect, useRef, useState } from 'react';
import { createDefaultSettings } from '../constants/settingsDefaults.js';
import { settingsRepository } from '../services/settingsRepository.js';
import { createLatestSettingsSaveQueue } from '../services/settingsSaveQueue.js';
import { useSessionStore } from '../../../store/session.store.js';
import { subscribeRoomSettingsRealtime } from '../../tickets/boards/realtime/boardSocket.js';

const objectIdPattern = /^[0-9a-f]{24}$/iu;

export const useRoomSettings = ({ autosave = false, debounceMs = 450 } = {}) => {
    const selectedRoom = useSessionStore((state) => state.selectedRoom);
    const roomIdCandidate = String(selectedRoom?.backendId || selectedRoom?.id || '');
    const roomId = objectIdPattern.test(roomIdCandidate) ? roomIdCandidate : '';
    const [settings, setSettingsState] = useState(createDefaultSettings);
    const [loaded, setLoaded] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const [loadRevision, setLoadRevision] = useState(0);
    const [saveStatus, setSaveStatus] = useState('idle');
    const dirtyRef = useRef(false);
    const versionRef = useRef(0);
    const saveRevisionRef = useRef(0);
    const queueRef = useRef(null);
    const committedSettingsRef = useRef(createDefaultSettings());

    useEffect(() => {
        const controller = new AbortController();
        let active = true;
        queueRef.current?.stop();
        queueRef.current = null;
        dirtyRef.current = false;
        saveRevisionRef.current = 0;
        setLoaded(false);
        setLoadError(null);
        settingsRepository.load(roomId, { signal: controller.signal }).then((result) => {
            if (!active) return;
            setSettingsState(result.settings);
            committedSettingsRef.current = result.settings;
            versionRef.current = result.version;
            queueRef.current = createLatestSettingsSaveQueue({
                initialVersion: result.version,
                save: (nextSettings, version) => settingsRepository.save(roomId, nextSettings, version),
                reload: () => settingsRepository.load(roomId),
                onSaved: (saved) => {
                    if (!active) return;
                    dirtyRef.current = false;
                    versionRef.current = saved.version;
                    committedSettingsRef.current = saved.settings;
                    setSettingsState(saved.settings);
                    setSaveStatus('saved');
                },
                onRollback: (serverTruth) => {
                    if (!active) return;
                    dirtyRef.current = false;
                    versionRef.current = serverTruth.version;
                    committedSettingsRef.current = serverTruth.settings;
                    setSettingsState(serverTruth.settings);
                },
                onError: () => {
                    if (active) setSaveStatus('error');
                }
            });
            setLoaded(true);
            setSaveStatus('saved');
        }).catch((error) => {
            if (error?.name === 'AbortError') return;
            setLoadError(error);
            setSaveStatus('error');
        });
        return () => {
            active = false;
            controller.abort();
            queueRef.current?.stop();
            queueRef.current = null;
        };
    }, [roomId, loadRevision]);

    useEffect(() => {
    if (!roomId) return undefined;
    return subscribeRoomSettingsRealtime({
        roomId,
        onInvalidate: () => {
            if (!dirtyRef.current) {
                setLoadRevision((revision) => revision + 1);
            }
        }
    });
}, [roomId]);

useEffect(() => {
    if (!autosave || !loaded || !dirtyRef.current || !roomId) return undefined;

        const revision = saveRevisionRef.current;
        const snapshot = settings;
        const timer = window.setTimeout(() => {
            queueRef.current?.enqueue(snapshot, revision);
        }, debounceMs);
        return () => window.clearTimeout(timer);
    }, [autosave, debounceMs, loaded, roomId, settings]);

    const setSettings = (updater) => {
        dirtyRef.current = true;
        saveRevisionRef.current += 1;
        queueRef.current?.markRevision(saveRevisionRef.current);
        setSaveStatus('saving');
        setSettingsState((current) => (typeof updater === 'function' ? updater(current) : updater));
    };
    const reload = () => setLoadRevision((revision) => revision + 1);
    return { settings, setSettings, loaded, loadError, reload, saveStatus };
};