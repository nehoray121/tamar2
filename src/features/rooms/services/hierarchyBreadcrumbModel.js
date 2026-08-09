export const buildHierarchyBreadcrumb = ({
    selectedEnvironment,
    selectedSubEnvironment,
    selectedRoom
}) => {
    const selectedPath = [
        selectedEnvironment
            ? { key: selectedEnvironment.id, level: 'environment', name: selectedEnvironment.name, entity: selectedEnvironment }
            : null,
        selectedSubEnvironment
            ? { key: selectedSubEnvironment.id, level: 'subEnvironment', name: selectedSubEnvironment.name, entity: selectedSubEnvironment }
            : null,
        selectedRoom
            ? { key: selectedRoom.id, level: 'room', name: selectedRoom.name, entity: selectedRoom }
            : null
    ].filter(Boolean);

    return selectedPath.length
        ? selectedPath
        : [{ key: 'root', level: 'root', name: 'כל הסביבות', entity: null }];
};
