const managedSystemIds = (capabilities) => new Set(capabilities?.systemIds || []);

export const canCreateSubEnvironmentFor = ({ selectedEnvironment, capabilities }) => Boolean(
    capabilities?.canCreateSubEnvironment
    && selectedEnvironment?.systemId
    && managedSystemIds(capabilities).has(selectedEnvironment.systemId)
);

export const canCreateRoomFor = ({ selectedEnvironment, subEnvironment, capabilities }) => Boolean(
    capabilities?.canCreateRoom
    && selectedEnvironment?.systemId
    && managedSystemIds(capabilities).has(selectedEnvironment.systemId)
    && subEnvironment?.environmentId === selectedEnvironment.id
    && subEnvironment?.systemId === selectedEnvironment.systemId
);
