const mongoose = require('mongoose');
const Room = require('../../../../models/Room.js');

const objectId = (value) => new mongoose.Types.ObjectId(String(value));

class TicketTransferTargetRepository {
    async list({ systemId, excludedRoomId, environmentId, subEnvironmentId, search, page, limit }) {
        const match = {
            systemId: objectId(systemId),
            _id: { $ne: objectId(excludedRoomId) },
            isActive: true,
            archivedAt: null,
            ...(environmentId ? { environmentId: objectId(environmentId) } : {}),
            ...(subEnvironmentId ? { subEnvironmentId: objectId(subEnvironmentId) } : {})
        };
        const pipeline = [
            { $match: match },
            { $lookup: { from: 'subEnvironments', localField: 'subEnvironmentId', foreignField: '_id', as: '_subEnvironment' } },
            { $unwind: '$_subEnvironment' },
            { $match: { '_subEnvironment.isActive': true, '_subEnvironment.archivedAt': null } },
            { $lookup: { from: 'environments', localField: 'environmentId', foreignField: '_id', as: '_environment' } },
            { $unwind: '$_environment' },
            { $match: { '_environment.isActive': true, '_environment.archivedAt': null } },
            { $lookup: { from: 'systems', localField: 'systemId', foreignField: '_id', as: '_system' } },
            { $unwind: '$_system' },
            { $match: { '_system.isActive': true, '_system.archivedAt': null } },
            ...(search ? [{ $match: { $or: [
                { name: search }, { key: search }, { '_subEnvironment.name': search }, { '_environment.name': search }
            ] } }] : []),
            { $sort: { '_environment.name': 1, '_subEnvironment.name': 1, name: 1, _id: 1 } },
            { $facet: {
                items: [
                    { $skip: (page - 1) * limit }, { $limit: limit },
                    { $project: {
                        _id: 1, key: 1, name: 1,
                        environment: { _id: '$_environment._id', name: '$_environment.name' },
                        subEnvironment: { _id: '$_subEnvironment._id', name: '$_subEnvironment.name' }
                    } }
                ],
                total: [{ $count: 'count' }]
            } }
        ];
        const [result] = await Room.aggregate(pipeline).option({ maxTimeMS: 5000 }).exec();
        return { items: result?.items || [], totalItems: result?.total?.[0]?.count || 0 };
    }
}

module.exports = TicketTransferTargetRepository;
