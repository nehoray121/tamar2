import { useEffect, useState } from 'react';
import { personalAssignmentService } from '../services/personalAssignmentService.js';

export const usePersonalAssignment = ({ inquiryId, roomId }) => {
    const [users, setUsers] = useState([]);
    const [assignment, setAssignment] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let alive = true;
        setLoading(true);
        Promise.all([
            personalAssignmentService.getEligibleRoomUsers(roomId),
            personalAssignmentService.getAssignment(inquiryId)
        ]).then(([eligibleUsers, currentAssignment]) => {
            if (!alive) return;
            setUsers(eligibleUsers);
            setAssignment(currentAssignment && eligibleUsers.some((user) => user.id === currentAssignment.id) ? currentAssignment : null);
        }).finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, [inquiryId, roomId]);

    const assign = async (userId) => {
        setLoading(true);
        const nextAssignment = await personalAssignmentService.assignInquiryToUser(inquiryId, userId);
        setAssignment(nextAssignment);
        setLoading(false);
    };

    const clear = async () => {
        setLoading(true);
        await personalAssignmentService.clearAssignment(inquiryId);
        setAssignment(null);
        setLoading(false);
    };

    return { users, assignment, loading, assign, clear };
};
