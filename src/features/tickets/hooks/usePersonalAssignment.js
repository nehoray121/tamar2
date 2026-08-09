import { useEffect, useMemo, useState } from 'react';
import { personalAssignmentService } from '../services/personalAssignmentService.js';

const byName = (query, user) => {
    const haystack = `${user.name} ${user.role} ${user.personalId}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
};

export const usePersonalAssignment = ({ inquiryId, roomId, open }) => {
    const [users, setUsers] = useState([]);
    const [savedAssignment, setSavedAssignment] = useState({ assignedUserIds: [], assignedUsers: [] });
    const [draftUserIds, setDraftUserIds] = useState([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return undefined;
        let alive = true;
        setLoading(true);
        setError('');

        Promise.all([
            personalAssignmentService.getEligibleRoomUsers(inquiryId),
            personalAssignmentService.getAssignment(inquiryId)
        ]).then(([eligibleUsers, currentAssignment]) => {
            if (!alive) return;
            const mergedUsers = [...eligibleUsers];
            (currentAssignment?.assignedUsers || []).forEach((user) => {
                if (!mergedUsers.some((candidate) => candidate.id === user.id)) {
                    mergedUsers.push(user);
                }
            });
            setUsers(mergedUsers);
            setSavedAssignment(currentAssignment);
            setDraftUserIds(currentAssignment?.assignedUserIds || []);
        }).catch(() => {
            if (!alive) return;
            setError('לא הצלחנו לטעון את אפשרויות השיוך.');
        }).finally(() => {
            if (alive) setLoading(false);
        });

        return () => {
            alive = false;
        };
    }, [inquiryId, open, roomId]);

    const filteredUsers = useMemo(() => {
        const normalizedQuery = query.trim();
        if (!normalizedQuery) return users;
        return users.filter((user) => byName(normalizedQuery, user));
    }, [query, users]);

    const selectedUsers = useMemo(() => draftUserIds.map((userId) => users.find((user) => user.id === userId)).filter(Boolean), [draftUserIds, users]);
    const hasChanges = useMemo(() => {
        const current = [...draftUserIds].sort().join('|');
        const saved = [...(savedAssignment?.assignedUserIds || [])].sort().join('|');
        return current !== saved;
    }, [draftUserIds, savedAssignment]);

    const toggleUser = (userId) => {
        setDraftUserIds((current) => current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]);
    };

    const removeUser = (userId) => setDraftUserIds((current) => current.filter((id) => id !== userId));
    const clearSelection = () => setDraftUserIds([]);
    const resetDraft = () => {
        setDraftUserIds(savedAssignment?.assignedUserIds || []);
        setQuery('');
        setError('');
    };

    const save = async () => {
        setSaving(true);
        setError('');
        try {
            const nextAssignment = await personalAssignmentService.saveAssignment(inquiryId, draftUserIds);
            setSavedAssignment(nextAssignment);
            setDraftUserIds(nextAssignment.assignedUserIds || []);
            return nextAssignment;
        } catch {
            setError('שמירת השיוך נכשלה. נסו שוב.');
            return null;
        } finally {
            setSaving(false);
        }
    };

    return {
        users,
        filteredUsers,
        selectedUsers,
        draftUserIds,
        loading,
        saving,
        error,
        query,
        setQuery,
        toggleUser,
        removeUser,
        clearSelection,
        resetDraft,
        save,
        hasChanges,
        isEmptyResult: !loading && !error && filteredUsers.length === 0,
        hasUsers: users.length > 0
    };
};
