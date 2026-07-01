import { useState } from 'react';
import { roomsList, subEnvs } from '../data/roomHierarchy.mock.js';

export function useRoomHierarchy() {
    const [level, setLevel] = useState('sub_envs');
    const [showCreateModal, setShowCreateModal] = useState(null);

    return {
        level,
        setLevel,
        showCreateModal,
        setShowCreateModal,
        subEnvs,
        roomsList
    };
}
