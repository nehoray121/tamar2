const AccessTokenVerifier = require('../auth/AccessTokenVerifier.js');
const AuthenticatedIdentityService = require('../auth/AuthenticatedIdentityService.js');
const IdentityClaimsMapper = require('../auth/IdentityClaimsMapper.js');
const PersonalNumberService = require('../auth/PersonalNumberService.js');
const AccessRequestRepository = require('../repositories/AccessRequestRepository.js');
const OrganizationMembershipRepository = require('../repositories/OrganizationMembershipRepository.js');
const UserRepository = require('../repositories/UserRepository.js');
const OrganizationSetting = require('../models/OrganizationSetting.js');
const AccessRequestApprovalPolicy = require('./accessRequests/AccessRequestApprovalPolicy.js');
const AccessRequestOptionsService = require('./accessRequests/AccessRequestOptionsService.js');
const AccessRequestService = require('./accessRequests/AccessRequestService.js');
const IdentityRequestThrottle = require('./accessRequests/IdentityRequestThrottle.js');
const AuthorizationService = require('./authorization/AuthorizationService.js');
const HierarchyIntegrityService = require('./authorization/HierarchyIntegrityService.js');
const OrganizationHierarchyAuthorizationService = require('./authorization/OrganizationHierarchyAuthorizationService.js');
const ScopeResolver = require('./authorization/ScopeResolver.js');
const MembershipService = require('./memberships/MembershipService.js');
const ProtectedRoleAssignmentService = require('./memberships/ProtectedRoleAssignmentService.js');
const createOrganizationServices = require('./organization/createOrganizationServices.js');
const OrganizationHierarchyMutationService = require('./organization/OrganizationHierarchyMutationService.js');
const OrganizationRealtimePublisher = require('./organization/OrganizationRealtimePublisher.js');
const AccessFlowRealtimePublisher = require('./realtime/AccessFlowRealtimePublisher.js');

const TicketAssignmentController = require('../modules/tickets/controllers/TicketAssignmentController.js');
const TicketController = require('../modules/tickets/controllers/TicketController.js');
const TicketAssignmentRepository = require('../modules/tickets/repositories/TicketAssignmentRepository.js');
const TicketHistoryRepository = require('../modules/tickets/repositories/TicketHistoryRepository.js');
const TicketRepository = require('../modules/tickets/repositories/TicketRepository.js');
const TicketSequenceRepository = require('../modules/tickets/repositories/TicketSequenceRepository.js');
const TicketNumberReservationRepository = require('../modules/tickets/repositories/TicketNumberReservationRepository.js');
const MongoTransactionRunner = require('../modules/tickets/services/MongoTransactionRunner.js');
const TicketAssigneeSummaryService = require('../modules/tickets/services/TicketAssigneeSummaryService.js');
const TicketAssignmentRealtimePublisher = require('../modules/tickets/services/TicketAssignmentRealtimePublisher.js');
const TicketAssignmentService = require('../modules/tickets/services/TicketAssignmentService.js');
const TicketAuthorizationService = require('../modules/tickets/services/TicketAuthorizationService.js');
const TicketCapabilityService = require('../modules/tickets/services/TicketCapabilityService.js');
const TicketRealtimePublisher = require('../modules/tickets/services/TicketRealtimePublisher.js');
const TicketService = require('../modules/tickets/services/TicketService.js');

const TicketTransferController = require('../modules/tickets/transfers/controllers/TicketTransferController.js');
const TicketTransferRepository = require('../modules/tickets/transfers/repositories/TicketTransferRepository.js');
const TicketTransferTargetRepository = require('../modules/tickets/transfers/repositories/TicketTransferTargetRepository.js');
const TicketTransferAuthorizationService = require('../modules/tickets/transfers/services/TicketTransferAuthorizationService.js');
const TicketTransferQueryService = require('../modules/tickets/transfers/services/TicketTransferQueryService.js');
const TicketTransferRealtimePublisher = require('../modules/tickets/transfers/services/TicketTransferRealtimePublisher.js');
const TicketTransferService = require('../modules/tickets/transfers/services/TicketTransferService.js');
const TicketTransferTargetService = require('../modules/tickets/transfers/services/TicketTransferTargetService.js');

const TicketMessageController = require('../modules/tickets/messages/controllers/TicketMessageController.js');
const TicketMessageRepository = require('../modules/tickets/messages/repositories/TicketMessageRepository.js');
const TicketMessageAuthorizationService = require('../modules/tickets/messages/services/TicketMessageAuthorizationService.js');
const TicketMessageCapabilityService = require('../modules/tickets/messages/services/TicketMessageCapabilityService.js');
const TicketMessageQueryService = require('../modules/tickets/messages/services/TicketMessageQueryService.js');
const TicketMessageRealtimePublisher = require('../modules/tickets/messages/services/TicketMessageRealtimePublisher.js');
const TicketMessageService = require('../modules/tickets/messages/services/TicketMessageService.js');

const TicketBoardController = require('../modules/tickets/boards/controllers/TicketBoardController.js');
const TicketBoardCategoryRepository = require('../modules/tickets/boards/repositories/TicketBoardCategoryRepository.js');
const TicketBoardItemStateRepository = require('../modules/tickets/boards/repositories/TicketBoardItemStateRepository.js');
const TicketBoardQueryRepository = require('../modules/tickets/boards/repositories/TicketBoardQueryRepository.js');
const TicketBoardAuthorizationService = require('../modules/tickets/boards/services/TicketBoardAuthorizationService.js');
const TicketBoardCapabilityService = require('../modules/tickets/boards/services/TicketBoardCapabilityService.js');
const TicketBoardCategoryService = require('../modules/tickets/boards/services/TicketBoardCategoryService.js');
const TicketBoardEligibilityService = require('../modules/tickets/boards/services/TicketBoardEligibilityService.js');
const TicketBoardItemStateService = require('../modules/tickets/boards/services/TicketBoardItemStateService.js');
const TicketBoardQueryService = require('../modules/tickets/boards/services/TicketBoardQueryService.js');
const TicketBoardRealtimePublisher = require('../modules/tickets/boards/services/TicketBoardRealtimePublisher.js');

const SettingsService = require('./settings/SettingsService.js');
const UserManagementService = require('./users/UserManagementService.js');
const AnalyticsService = require('./analytics/AnalyticsService.js');

const createServiceContainer = ({ config, logger } = {}) => {
    const organization = createOrganizationServices();
    const userRepository = new UserRepository();
    const membershipRepository = new OrganizationMembershipRepository();
    const accessRequestRepository = new AccessRequestRepository();

    const hierarchyIntegrityService = new HierarchyIntegrityService({
        hierarchyRepository: organization.hierarchyAdapter
    });
    const scopeResolver = new ScopeResolver({
        userRepository,
        membershipRepository,
        hierarchyIntegrityService
    });
    const authorizationService = new AuthorizationService({ scopeResolver });

    const organizationHierarchyAuthorizationService =
        new OrganizationHierarchyAuthorizationService({
            scopeResolver,
            integrityService: organization.integrityService
        });
    const organizationRealtimePublisher = new OrganizationRealtimePublisher({
        logger
    });
    const organizationHierarchyMutationService =
        new OrganizationHierarchyMutationService({
            managementService: organization.managementService,
            authorizationService: organizationHierarchyAuthorizationService,
            transactionRunner: new MongoTransactionRunner(),
            organizationSettingModel: OrganizationSetting,
            realtimePublisher: organizationRealtimePublisher
        });
    organization.authorizationService =
        organizationHierarchyAuthorizationService;
    organization.mutationService =
        organizationHierarchyMutationService;

    const approvalPolicy = new AccessRequestApprovalPolicy({
        scopeResolver,
        hierarchyIntegrityService
    });

    let auth = null;
    let realtimePublisher = null;
    if (config?.auth) {
        const personalNumberService = new PersonalNumberService({
            hmacKey: config.auth.identityLookupHmacKey,
            pattern: config.auth.personalNumberPattern
        });
        const accessTokenVerifier = new AccessTokenVerifier({
            authConfig: config.auth
        });
        const claimsMapper = new IdentityClaimsMapper({
            authConfig: config.auth,
            personalNumberService
        });
        const authenticatedIdentityService =
            new AuthenticatedIdentityService({
                userRepository,
                accessRequestRepository,
                scopeResolver,
                personalNumberService
            });
        const accessRequestOptionsService =
            new AccessRequestOptionsService({ organization });
        const requestThrottle = new IdentityRequestThrottle();
        realtimePublisher = new AccessFlowRealtimePublisher({
            personalNumberService
        });
        auth = {
            personalNumberService,
            accessTokenVerifier,
            claimsMapper,
            authenticatedIdentityService,
            accessRequestOptionsService,
            requestThrottle,
            logger
        };
    }

    const accessRequestService = new AccessRequestService({
        userRepository,
        membershipRepository,
        accessRequestRepository,
        hierarchyIntegrityService,
        approvalPolicy,
        scopeResolver,
        realtimePublisher
    });
    const membershipService = new MembershipService({
        userRepository,
        membershipRepository,
        hierarchyIntegrityService,
        authorizationService
    });
    const protectedRoleAssignmentService =
        new ProtectedRoleAssignmentService({
            userRepository,
            membershipRepository,
            scopeResolver,
            hierarchyIntegrityService
        });

    const settingsService = new SettingsService({
        organization,
        scopeResolver,
        realtimePublisher: organizationRealtimePublisher
    });

    const userManagementService = auth
        ? new UserManagementService({
            userRepository,
            membershipRepository,
            scopeResolver,
            membershipService,
            protectedRoleAssignmentService,
            personalNumberService: auth.personalNumberService,
            realtimePublisher
        })
        : null;
    const analyticsService = userManagementService
        ? new AnalyticsService({
            organization,
            scopeResolver,
            userManagementService
        })
        : null;

    const ticketRepository = new TicketRepository();
    const ticketHistoryRepository = new TicketHistoryRepository();
    const ticketSequenceRepository = new TicketSequenceRepository();
    const ticketNumberReservationRepository = new TicketNumberReservationRepository();
    const ticketAssignmentRepository =
        new TicketAssignmentRepository();
    const ticketTransferRepository = new TicketTransferRepository();
    const ticketTransferTargetRepository =
        new TicketTransferTargetRepository();
    const ticketMessageRepository = new TicketMessageRepository();
    const boardCategoryRepository = new TicketBoardCategoryRepository();
    const boardStateRepository = new TicketBoardItemStateRepository();
    const boardQueryRepository = new TicketBoardQueryRepository();

    const ticketAuthorizationService =
        new TicketAuthorizationService({ scopeResolver });
    const ticketCapabilityService = new TicketCapabilityService({
        authorizationService: ticketAuthorizationService
    });

    const ticketRealtimePublisher = new TicketRealtimePublisher({ logger });
    const assignmentRealtimePublisher =
        new TicketAssignmentRealtimePublisher({ logger });
    const transferRealtimePublisher =
        new TicketTransferRealtimePublisher({ logger });
    const messageRealtimePublisher =
        new TicketMessageRealtimePublisher({ organization, logger });
    const boardRealtimePublisher =
        new TicketBoardRealtimePublisher({ logger });

    const transferAuthorizationService =
        new TicketTransferAuthorizationService({
            ticketAuthorizationService
        });
    const messageAuthorizationService =
        new TicketMessageAuthorizationService({
            ticketAuthorizationService
        });
    const messageCapabilityService =
        new TicketMessageCapabilityService();
    const assigneeSummaryService = new TicketAssigneeSummaryService({
        userRepository
    });
    const transactionRunner = new MongoTransactionRunner();

    const ticketService = new TicketService({
        organization,
        ticketRepository,
        historyRepository: ticketHistoryRepository,
        sequenceRepository: ticketSequenceRepository,
        reservationRepository: ticketNumberReservationRepository,
        authorizationService: ticketAuthorizationService,
        capabilityService: ticketCapabilityService,
        transactionRunner,
        realtimePublisher: ticketRealtimePublisher,
        assigneeSummaryService,
        transferRepository: ticketTransferRepository
    });

    const ticketAssignmentService = new TicketAssignmentService({
        organization,
        userRepository,
        membershipRepository,
        ticketRepository,
        assignmentRepository: ticketAssignmentRepository,
        historyRepository: ticketHistoryRepository,
        authorizationService: ticketAuthorizationService,
        capabilityService: ticketCapabilityService,
        transactionRunner,
        assigneeSummaryService,
        assignmentRealtimePublisher,
        ticketRealtimePublisher
    });

    const ticketTransferService = new TicketTransferService({
        organization,
        ticketRepository,
        assignmentRepository: ticketAssignmentRepository,
        historyRepository: ticketHistoryRepository,
        transferRepository: ticketTransferRepository,
        authorizationService: ticketAuthorizationService,
        capabilityService: ticketCapabilityService,
        transferAuthorizationService,
        transactionRunner,
        assigneeSummaryService,
        realtimePublisher: transferRealtimePublisher
    });
    const ticketTransferQueryService = new TicketTransferQueryService({
        organization,
        ticketRepository,
        transferRepository: ticketTransferRepository,
        authorizationService: ticketAuthorizationService,
        transferAuthorizationService,
        capabilityService: ticketCapabilityService,
        userSummaryService: assigneeSummaryService
    });
    const ticketTransferTargetService = new TicketTransferTargetService({
        ticketRepository,
        targetRepository: ticketTransferTargetRepository,
        authorizationService: ticketAuthorizationService
    });

    const ticketMessageService = new TicketMessageService({
        ticketRepository,
        messageRepository: ticketMessageRepository,
        authorizationService: messageAuthorizationService,
        capabilityService: messageCapabilityService,
        userSummaryService: assigneeSummaryService,
        realtimePublisher: messageRealtimePublisher
    });
    const ticketMessageQueryService = new TicketMessageQueryService({
        ticketRepository,
        messageRepository: ticketMessageRepository,
        authorizationService: messageAuthorizationService,
        capabilityService: messageCapabilityService,
        userSummaryService: assigneeSummaryService
    });

    const boardAuthorizationService =
        new TicketBoardAuthorizationService({
            organization,
            scopeResolver
        });
    const boardCapabilityService = new TicketBoardCapabilityService();
    const boardEligibilityService = new TicketBoardEligibilityService({
        ticketRepository,
        transferRepository: ticketTransferRepository
    });
    const boardCategoryService = new TicketBoardCategoryService({
        authorizationService: boardAuthorizationService,
        categoryRepository: boardCategoryRepository,
        realtimePublisher: boardRealtimePublisher
    });
    const boardItemStateService = new TicketBoardItemStateService({
        authorizationService: boardAuthorizationService,
        eligibilityService: boardEligibilityService,
        capabilityService: boardCapabilityService,
        categoryRepository: boardCategoryRepository,
        stateRepository: boardStateRepository,
        realtimePublisher: boardRealtimePublisher
    });
    const boardQueryService = new TicketBoardQueryService({
        authorizationService: boardAuthorizationService,
        capabilityService: boardCapabilityService,
        categoryRepository: boardCategoryRepository,
        queryRepository: boardQueryRepository
    });

    const ticketController = new TicketController({ ticketService });
    const assignmentController = new TicketAssignmentController({
        assignmentService: ticketAssignmentService
    });
    const transferController = new TicketTransferController({
        transferService: ticketTransferService,
        queryService: ticketTransferQueryService,
        targetService: ticketTransferTargetService
    });
    const messageController = new TicketMessageController({
        messageService: ticketMessageService,
        queryService: ticketMessageQueryService
    });
    const boardController = new TicketBoardController({
        categoryService: boardCategoryService,
        itemStateService: boardItemStateService,
        queryService: boardQueryService
    });

    return {
        organization,
        userRepository,
        membershipRepository,
        accessRequestRepository,
        hierarchyIntegrityService,
        scopeResolver,
        authorizationService,
        approvalPolicy,
        accessRequestService,
        membershipService,
        protectedRoleAssignmentService,
        settingsService,
        userManagementService,
        analyticsService,
        realtimePublisher,
        organizationRealtimePublisher,
        auth,
        tickets: {
            ticketRepository,
            ticketHistoryRepository,
            ticketSequenceRepository,
            ticketAssignmentRepository,
            ticketTransferRepository,
            ticketTransferTargetRepository,
            ticketMessageRepository,
            boardCategoryRepository,
            boardStateRepository,
            boardQueryRepository,
            authorizationService: ticketAuthorizationService,
            capabilityService: ticketCapabilityService,
            transferAuthorizationService,
            messageAuthorizationService,
            messageCapabilityService,
            realtimePublisher: ticketRealtimePublisher,
            assignmentRealtimePublisher,
            transferRealtimePublisher,
            messageRealtimePublisher,
            boardRealtimePublisher,
            assigneeSummaryService,
            ticketService,
            assignmentService: ticketAssignmentService,
            transferService: ticketTransferService,
            transferQueryService: ticketTransferQueryService,
            transferTargetService: ticketTransferTargetService,
            messageService: ticketMessageService,
            messageQueryService: ticketMessageQueryService,
            boardAuthorizationService,
            boardCapabilityService,
            boardEligibilityService,
            boardCategoryService,
            boardItemStateService,
            boardQueryService,
            controller: ticketController,
            assignmentController,
            transferController,
            messageController,
            boardController
        }
    };
};

module.exports = createServiceContainer;
