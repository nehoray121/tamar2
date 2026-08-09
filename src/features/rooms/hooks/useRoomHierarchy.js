import { useEffect, useMemo, useRef, useState } from 'react';
import { useSessionStore } from '../../../store/session.store.js';
import { organizationHierarchyApi } from '../services/organizationHierarchyApi.js';
import {
    canCreateRoomFor as canCreateRoomForContext,
    canCreateSubEnvironmentFor
} from '../services/hierarchyCreationCapabilities.js';

const staleMutationError = () => Object.assign(
    new Error('ההקשר הארגוני השתנה בזמן השמירה. הרשימה לא שונתה בהקשר החדש.'),
    { code: 'STALE_HIERARCHY_CONTEXT' }
);

const hierarchyErrorMessage = (error) => {
    const messages = {
        ORGANIZATION_HIERARCHY_MANAGEMENT_FORBIDDEN: 'אין הרשאה ליצור פריט בהקשר הארגוני שנבחר.',
        ORGANIZATION_SCOPE_INACTIVE: 'לא ניתן ליצור פריט תחת הורה שאינו פעיל.',
        INACTIVE_PARENT: 'לא ניתן ליצור פריט פעיל תחת הורה שאינו פעיל.',
        ARCHIVED_PARENT: 'לא ניתן ליצור פריט תחת הורה שהועבר לארכיון.',
        DUPLICATE_SUB_ENVIRONMENT_KEY: 'כבר קיימת תת-סביבה בשם זה בסביבה שנבחרה.',
        DUPLICATE_ROOM_KEY: 'כבר קיים חדר בשם זה בתת-הסביבה שנבחרה.',
        ORGANIZATION_VALIDATION_ERROR: 'השם או התיאור אינם תקינים.',
        VALIDATION_ERROR: 'השם או התיאור אינם תקינים.',
        STALE_HIERARCHY_CONTEXT: error?.message
    };
    return messages[error?.code] || error?.message || 'שמירת הפריט נכשלה. יש לנסות שוב.';
};

const contextStillMatches = ({ userId, environmentId, subEnvironmentId }) => {
    const current = useSessionStore.getState();
    if (String(current.currentUser?.id || '') !== String(userId || '')) return false;
    if (String(current.selectedEnvironment?.id || '') !== String(environmentId || '')) return false;
    if (subEnvironmentId) {
        const canonicalSubEnvironment = current.organizationHierarchy.subEnvironments.find(
            (item) => item.id === subEnvironmentId
        );
        if (!canonicalSubEnvironment || canonicalSubEnvironment.environmentId !== environmentId) return false;
    }
    return true;
};

export function useRoomHierarchy({ selectedSubEnvironmentId = null } = {}) {
    const [level, setLevel] = useState('sub_envs');
    const [showCreateModal, setShowCreateModal] = useState(null);
    const operationSequence = useRef(0);
    const activeController = useRef(null);
    const activeSubEnvironmentId = useRef(selectedSubEnvironmentId);
    const selectedEnvironment = useSessionStore((state) => state.selectedEnvironment);
    const hierarchy = useSessionStore((state) => state.organizationHierarchy);
    const hierarchyStatus = useSessionStore((state) => state.hierarchyStatus);
    const hierarchyError = useSessionStore((state) => state.hierarchyError);
    const initializeRuntimeContext = useSessionStore((state) => state.initializeRuntimeContext);
    const currentUserId = useSessionStore((state) => state.currentUser?.id);
    const hierarchyCapabilities = useSessionStore(
        (state) => state.capabilities?.organizationHierarchy
    );

    useEffect(() => {
        operationSequence.current += 1;
        activeController.current?.abort();
        activeController.current = null;
        setShowCreateModal(null);
        setLevel('sub_envs');
    }, [currentUserId, selectedEnvironment?.id]);

    useEffect(() => {
        activeSubEnvironmentId.current = selectedSubEnvironmentId;
        operationSequence.current += 1;
        activeController.current?.abort();
        activeController.current = null;
        setShowCreateModal(null);
    }, [selectedSubEnvironmentId]);

    useEffect(() => () => activeController.current?.abort(), []);

    const subEnvs = useMemo(() => hierarchy.subEnvironments.filter(
        (item) => item.environmentId === selectedEnvironment?.id
    ), [hierarchy.subEnvironments, selectedEnvironment?.id]);

    const subEnvironmentIds = useMemo(() => new Set(subEnvs.map((item) => item.id)), [subEnvs]);
    const roomsList = useMemo(() => hierarchy.rooms.filter(
        (item) => subEnvironmentIds.has(item.subEnvironmentId)
    ), [hierarchy.rooms, subEnvironmentIds]);

    const canCreateSubEnvironment = canCreateSubEnvironmentFor({
        selectedEnvironment,
        capabilities: hierarchyCapabilities
    });
    const canCreateRoomFor = (subEnvironment) => canCreateRoomForContext({
        selectedEnvironment,
        subEnvironment,
        capabilities: hierarchyCapabilities
    });

    const runMutation = async ({ subEnvironmentId, request }) => {
        const context = {
            userId: currentUserId,
            environmentId: selectedEnvironment?.id,
            subEnvironmentId
        };
        if (!context.userId || !context.environmentId) throw staleMutationError();

        const operation = ++operationSequence.current;
        activeController.current?.abort();
        const controller = new AbortController();
        activeController.current = controller;

        try {
            const response = await request(controller.signal);
            if (operation !== operationSequence.current
                || (subEnvironmentId && activeSubEnvironmentId.current !== subEnvironmentId)
                || !contextStillMatches(context)) {
                throw staleMutationError();
            }
            await initializeRuntimeContext({ force: true, preserveAuthenticatedView: true });
            if (operation !== operationSequence.current
                || (subEnvironmentId && activeSubEnvironmentId.current !== subEnvironmentId)
                || !contextStillMatches(context)) {
                throw staleMutationError();
            }
            return response.data;
        } catch (error) {
            if (error?.name === 'AbortError') throw staleMutationError();
            throw Object.assign(new Error(hierarchyErrorMessage(error)), {
                code: error?.code,
                cause: error
            });
        } finally {
            if (operation === operationSequence.current) activeController.current = null;
        }
    };

    const createSubEnvironment = (input) => {
        if (!canCreateSubEnvironment) {
            return Promise.reject(Object.assign(
                new Error('אין הרשאה ליצור תת-סביבה בסביבה שנבחרה.'),
                { code: 'ORGANIZATION_HIERARCHY_MANAGEMENT_FORBIDDEN' }
            ));
        }
        const environmentId = selectedEnvironment.id;
        return runMutation({
            request: (signal) => organizationHierarchyApi.createSubEnvironment({
                environmentId,
                input: { name: input.name, description: input.description },
                signal
            })
        });
    };

    const createRoom = async (subEnvironment, input) => {
        if (!canCreateRoomFor(subEnvironment)) {
            return Promise.reject(Object.assign(
                new Error('אין הרשאה ליצור חדר בתת-הסביבה שנבחרה.'),
                { code: 'ORGANIZATION_HIERARCHY_MANAGEMENT_FORBIDDEN' }
            ));
        }
        const created = await runMutation({
            subEnvironmentId: subEnvironment.id,
            request: (signal) => organizationHierarchyApi.createRoom({
                subEnvironmentId: subEnvironment.id,
                input: { name: input.name, description: input.description },
                signal
            })
        });
        setLevel('rooms');
        return created;
    };

    return {
        level,
        setLevel,
        showCreateModal,
        setShowCreateModal,
        selectedEnvironment,
        subEnvs,
        roomsList,
        hierarchyStatus,
        hierarchyError,
        retryHierarchy: () => initializeRuntimeContext({ force: true }),
        canCreateSubEnvironment,
        canCreateRoomFor,
        createSubEnvironment,
        createRoom
    };
}
