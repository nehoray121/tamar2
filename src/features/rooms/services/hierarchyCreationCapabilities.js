const setOf = (values) => new Set((values || []).map(String));

export const canCreateEnvironmentFor = ({ systemId, capabilities }) => Boolean(
    capabilities?.canCreateEnvironment
    && systemId
    && setOf(capabilities.superAdminSystemIds).has(String(systemId))
);

export const canCreateSubEnvironmentFor = ({
    selectedEnvironment,
    capabilities
}) => {
    if (!capabilities?.canCreateSubEnvironment || !selectedEnvironment?.id) {
        return false;
    }

    return (
        setOf(capabilities.superAdminSystemIds).has(
            String(selectedEnvironment.systemId)
        )
        || setOf(capabilities.environmentAdminEnvironmentIds).has(
            String(selectedEnvironment.id)
        )
    );
};

export const canCreateRoomFor = ({
    selectedEnvironment,
    subEnvironment,
    capabilities
}) => {
    if (!capabilities?.canCreateRoom
        || !selectedEnvironment?.id
        || !subEnvironment?.id
        || subEnvironment.environmentId !== selectedEnvironment.id) {
        return false;
    }

    return (
        setOf(capabilities.superAdminSystemIds).has(
            String(selectedEnvironment.systemId)
        )
        || setOf(capabilities.environmentAdminEnvironmentIds).has(
            String(selectedEnvironment.id)
        )
        || setOf(capabilities.systemAdminSubEnvironmentIds).has(
            String(subEnvironment.id)
        )
        || setOf(capabilities.roomManagerSubEnvironmentIds).has(
            String(subEnvironment.id)
        )
    );
};
