const mongoose = require('mongoose');

const organizationSettingSchema = new mongoose.Schema({
    scopeType: { type: String, enum: ['ROOM'], required: true },
    scopeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    systemId: { type: mongoose.Schema.Types.ObjectId, ref: 'System', required: true },
    environmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Environment', required: true },
    subEnvironmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubEnvironment', required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    namespace: { type: String, enum: ['room-settings'], default: 'room-settings', required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    version: { type: Number, min: 1, default: 1, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { collection: 'organizationSettings', timestamps: true, strict: 'throw', versionKey: false });

organizationSettingSchema.index(
    { scopeType: 1, scopeId: 1, namespace: 1 },
    { name: 'uniq_organization_setting_scope_namespace', unique: true }
);

const OrganizationSetting = mongoose.models.OrganizationSetting
    || mongoose.model('OrganizationSetting', organizationSettingSchema);

module.exports = OrganizationSetting;