const mongoose = require('mongoose');
const AccessRequest = require('../../src/models/AccessRequest.js');
const Environment = require('../../src/models/Environment.js');
const OrganizationMembership = require('../../src/models/OrganizationMembership.js');
const Room = require('../../src/models/Room.js');
const SubEnvironment = require('../../src/models/SubEnvironment.js');
const System = require('../../src/models/System.js');
const User = require('../../src/models/User.js');
const Ticket = require('../../src/modules/tickets/models/Ticket.js');
const TicketAssignment = require('../../src/modules/tickets/models/TicketAssignment.js');
const TicketHistory = require('../../src/modules/tickets/models/TicketHistory.js');
const TicketSequence = require('../../src/modules/tickets/models/TicketSequence.js');
const TicketTransfer = require('../../src/modules/tickets/transfers/models/TicketTransfer.js');
const TicketMessage = require('../../src/modules/tickets/messages/models/TicketMessage.js');
const TicketBoardCategory = require('../../src/modules/tickets/boards/models/TicketBoardCategory.js');
const TicketBoardItemState = require('../../src/modules/tickets/boards/models/TicketBoardItemState.js');

const TEST_DATABASE_NAME = 'tamar_test';
const TEST_MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/?replicaSet=rs0';
let connectionPromise;

const TEST_MODELS = [
    User,
    OrganizationMembership,
    AccessRequest,
    System,
    Environment,
    SubEnvironment,
    Room,
    Ticket,
    TicketAssignment,
    TicketHistory,
    TicketSequence,
    TicketTransfer,
    TicketMessage,
    TicketBoardCategory,
    TicketBoardItemState
];

const assertTestIsolation = () => {
    if (process.env.NODE_ENV !== 'test') {
        throw new Error('Refusing to use test database outside NODE_ENV=test');
    }
};

const connectTestDatabase = async () => {
    assertTestIsolation();
    connectionPromise ??= mongoose.connect(TEST_MONGODB_URI, {
        dbName: TEST_DATABASE_NAME,
        autoIndex: false,
        serverSelectionTimeoutMS: 8_000
    });

    try {
        await connectionPromise;
    } catch (error) {
        connectionPromise = undefined;
        throw error;
    }

    const connectedDatabaseName = mongoose.connection.db?.databaseName;
    if (connectedDatabaseName !== TEST_DATABASE_NAME) {
        throw new Error(`Refusing to run tests against ${connectedDatabaseName}`);
    }
    await Promise.all(TEST_MODELS.map((model) => model.syncIndexes()));
};

const clearTestCollections = async () => {
    assertTestIsolation();
    await Promise.all(TEST_MODELS.map((model) => model.collection.deleteMany({})));
};

const dropAndDisconnectTestDatabase = async () => {
    assertTestIsolation();
    if (mongoose.connection.readyState !== 0) {
        const connectedDatabaseName = mongoose.connection.db?.databaseName;
        if (connectedDatabaseName !== TEST_DATABASE_NAME) {
            throw new Error(`Refusing to drop ${connectedDatabaseName}`);
        }
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
        connectionPromise = undefined;
    }
};

module.exports = {
    TEST_DATABASE_NAME,
    TEST_MODELS,
    assertTestIsolation,
    connectTestDatabase,
    clearTestCollections,
    dropAndDisconnectTestDatabase
};
