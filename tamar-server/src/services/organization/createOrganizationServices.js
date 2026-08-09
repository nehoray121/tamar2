const EnvironmentRepository = require('../../repositories/EnvironmentRepository.js');
const RoomRepository = require('../../repositories/RoomRepository.js');
const SubEnvironmentRepository = require('../../repositories/SubEnvironmentRepository.js');
const SystemRepository = require('../../repositories/SystemRepository.js');
const MongoHierarchyAdapter = require('./MongoHierarchyAdapter.js');
const OrganizationHierarchyService = require('./OrganizationHierarchyService.js');
const OrganizationIntegrityService = require('./OrganizationIntegrityService.js');
const OrganizationLifecycleService = require('./OrganizationLifecycleService.js');
const OrganizationManagementService = require('./OrganizationManagementService.js');

const createOrganizationServices = () => {
    const systemRepository = new SystemRepository();
    const environmentRepository = new EnvironmentRepository();
    const subEnvironmentRepository = new SubEnvironmentRepository();
    const roomRepository = new RoomRepository();
    const repositories = { systemRepository, environmentRepository, subEnvironmentRepository, roomRepository };
    const integrityService = new OrganizationIntegrityService(repositories);
    const hierarchyService = new OrganizationHierarchyService({
        integrityService,
        environmentRepository,
        subEnvironmentRepository,
        roomRepository
    });
    const hierarchyAdapter = new MongoHierarchyAdapter({ hierarchyService, ...repositories });
    const managementService = new OrganizationManagementService({ ...repositories, integrityService });
    const lifecycleService = new OrganizationLifecycleService({ ...repositories, integrityService });

    return {
        ...repositories,
        integrityService,
        hierarchyService,
        hierarchyAdapter,
        managementService,
        lifecycleService
    };
};

module.exports = createOrganizationServices;
