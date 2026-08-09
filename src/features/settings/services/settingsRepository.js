import {
    createDefaultSections,
    createDefaultSettings,
    defaultGeneralSettings,
    defaultIncidentDescriptionSettings,
    defaultIncidentDescriptionTemplates,
    defaultInquiryFields,
    fieldTemplates,
    isCanonicalIncidentDescriptionField,
    isSelectorField,
    widthOptions
} from '../constants/settingsDefaults.js';
import { settingsApi } from '../api/settingsApi.js';


const TEMPLATE_PREVIEW_MAX = 80;

const corruptedTextPattern = /(\?{3,}|�|Ã|Â|â|×|™|\uFFFD)/;
const LEGACY_INCIDENT_NAMES = new Set(['תיאור תקלה', 'תיאור הפנייה']);

const fallbackById = new Map(defaultInquiryFields.map((field) => [field.id, field]));
const typeTemplateByType = new Map(fieldTemplates.map((template) => [template.type, template]));

const isCorruptedText = (value) => typeof value === 'string' && corruptedTextPattern.test(value);
const isQuestionMarkNoise = (value) => typeof value === 'string' && /\?{2,}/.test(value) && !/[\u0590-\u05FF]/.test(value);

const sanitizeDisplayString = (value, fallback = '') => {
    const normalized = String(value ?? '').trim();
    if (!normalized || isQuestionMarkNoise(normalized) || isCorruptedText(normalized)) return fallback;
    return normalized;
};

const sanitizeBoolean = (value, fallback) => (typeof value === 'boolean' ? value : fallback);

const sanitizeWidth = (value, fallback = 'חצי רוחב') => {
    const normalized = sanitizeDisplayString(value, fallback);
    return widthOptions.includes(normalized) ? normalized : fallback;
};

const sanitizeOptions = (options, fallbackOptions = []) => {
    const source = Array.isArray(options) ? options : [];
    const normalized = source
        .map((option) => sanitizeDisplayString(typeof option === 'string' ? option : option?.label || option?.name || option?.value, ''))
        .filter(Boolean);
    const unique = [...new Set(normalized)];
    if (!unique.length && fallbackOptions.length) return [...fallbackOptions];
    return unique;
};

const createStableTemplateId = (content) => {
    const seed = String(content || '').slice(0, TEMPLATE_PREVIEW_MAX) || 'template';
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
        hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
    }
    return `incident-template-${Math.abs(hash)}`;
};

const cloneField = (field) => ({
    ...field,
    options: [...(field.options || [])],
    dependencyMap: { ...(field.dependencyMap || {}) },
    linkConfig: { ...(field.linkConfig || {}) }
});

const normalizeTemplateContent = (value) => {
    const normalized = String(value || '').replace(/\r/g, '').trim();
    if (!normalized || isQuestionMarkNoise(normalized) || isCorruptedText(normalized)) return '';
    return normalized;
};

const normalizeIncidentDescriptionTemplates = (storedGeneral = {}, storedRoot = {}) => {
    const candidates = [
        storedGeneral?.incidentDescriptionTemplates,
        storedGeneral?.incidentDescription?.templates,
        storedRoot?.incidentDescriptionTemplates,
        storedRoot?.templates
    ].find((value) => Array.isArray(value) && value.length) || [];

    const source = candidates.length ? candidates : defaultIncidentDescriptionTemplates;
    const seenIds = new Set();
    const seenContent = new Set();

    const normalized = source.reduce((collection, template, index) => {
        const content = normalizeTemplateContent(typeof template === 'string' ? template : template?.content);
        if (!content || seenContent.has(content)) return collection;

        let id = sanitizeDisplayString(typeof template === 'string' ? '' : template?.id, createStableTemplateId(content));
        while (seenIds.has(id)) id = `${id}-copy`;

        const fallbackTemplate = defaultIncidentDescriptionTemplates[index] || {};
        const title = sanitizeDisplayString(typeof template === 'string' ? '' : template?.title, fallbackTemplate.title || `תבנית ${collection.length + 1}`);

        seenIds.add(id);
        seenContent.add(content);
        collection.push({
            id,
            title,
            content,
            enabled: typeof template === 'string' ? true : template?.enabled !== false
        });
        return collection;
    }, []);

    return normalized.length ? normalized : defaultIncidentDescriptionTemplates.map((template) => ({ ...template }));
};

const findCanonicalIncidentField = (fields) => {
    const byRole = fields.find((field) => isCanonicalIncidentDescriptionField(field));
    if (byRole) return byRole;

    return fields.find((field) => {
        if (field?.type !== 'longtext') return false;
        if (field?.id === 'description') return true;
        return LEGACY_INCIDENT_NAMES.has(String(field?.name || '').trim());
    });
};

const normalizeIncidentDescriptionSettings = (value, fallbackField) => ({
    ...defaultIncidentDescriptionSettings,
    ...(fallbackField ? {
        label: sanitizeDisplayString(fallbackField.name, defaultIncidentDescriptionSettings.label),
        placeholder: sanitizeDisplayString(fallbackField.placeholder, defaultIncidentDescriptionSettings.placeholder),
        required: fallbackField.required ?? defaultIncidentDescriptionSettings.required
    } : {}),
    ...(value || {}),
    label: sanitizeDisplayString(value?.label || fallbackField?.name, defaultIncidentDescriptionSettings.label),
    placeholder: sanitizeDisplayString(value?.placeholder || fallbackField?.placeholder, defaultIncidentDescriptionSettings.placeholder),
    helpText: sanitizeDisplayString(value?.helpText, ''),
    required: value?.required ?? fallbackField?.required ?? defaultIncidentDescriptionSettings.required
});

const normalizeDependencyMap = (field, fields, fallbackField) => {
    const parent = fields.find((item) => item.id === field.parentId);
    if (!parent || !isSelectorField(parent) || !isSelectorField(field)) return {};

    const fallbackMap = fallbackField?.dependencyMap || {};
    const source = field.dependencyMap && typeof field.dependencyMap === 'object' ? field.dependencyMap : fallbackMap;
    const parentOptions = parent.options || [];
    const childOptions = field.options || [];

    return parentOptions.reduce((map, parentOption) => {
        const values = sanitizeOptions(source[parentOption], fallbackMap[parentOption] || []).filter((option) => childOptions.includes(option));
        if (values.length) map[parentOption] = values;
        return map;
    }, {});
};

const normalizeFieldShell = (field, incidentSettings) => {
    const fallback = fallbackById.get(field?.id) || {};
    const template = typeTemplateByType.get(field?.type) || typeTemplateByType.get(fallback.type) || {};
    const type = sanitizeDisplayString(field?.type, fallback.type || 'text');
    const group = ['system', 'room'].includes(field?.group) ? field.group : (fallback.group || 'room');
    const nameFallback = fallback.name || (template.name ? `שדה ${template.name}` : 'שדה חדש');
    const placeholderFallback = fallback.placeholder || template.example || '';
    const options = sanitizeOptions(field?.options, fallback.options || (isSelectorField({ type }) ? ['אפשרות 1', 'אפשרות 2'] : []));

    const nextField = {
        ...fallback,
        ...field,
        id: sanitizeDisplayString(field?.id, fallback.id || createStableTemplateId(JSON.stringify(field || {})).replace('incident-template-', 'field-')),
        group,
        type,
        typeLabel: sanitizeDisplayString(field?.typeLabel, template.typeLabel || fallback.typeLabel || template.name || 'שדה'),
        name: sanitizeDisplayString(field?.name, nameFallback),
        placeholder: sanitizeDisplayString(field?.placeholder, placeholderFallback),
        helpText: sanitizeDisplayString(field?.helpText, fallback.helpText || ''),
        required: sanitizeBoolean(field?.required, Boolean(fallback.required)),
        locked: sanitizeBoolean(field?.locked, Boolean(fallback.locked)),
        active: sanitizeBoolean(field?.active, field?.visible !== false),
        visible: sanitizeBoolean(field?.visible, field?.active !== false),
        showInNewInquiry: sanitizeBoolean(field?.showInNewInquiry, true),
        showInRow: sanitizeBoolean(field?.showInRow, fallback.showInRow !== false),
        showInDetails: sanitizeBoolean(field?.showInDetails, fallback.showInDetails !== false),
        width: sanitizeWidth(field?.width, fallback.width || 'חצי רוחב'),
        scope: sanitizeDisplayString(field?.scope, fallback.scope || 'system'),
        options,
        dependencyMap: {},
        linkConfig: {
            label: sanitizeDisplayString(field?.linkConfig?.label, field?.name || 'פתיחת קישור'),
            url: sanitizeDisplayString(field?.linkConfig?.url, ''),
            description: sanitizeDisplayString(field?.linkConfig?.description, ''),
            targetType: ['internal', 'external'].includes(field?.linkConfig?.targetType) ? field.linkConfig.targetType : 'external',
            displayStyle: ['text', 'button', 'iconText'].includes(field?.linkConfig?.displayStyle) ? field.linkConfig.displayStyle : 'button',
            openInNewTab: field?.linkConfig?.openInNewTab !== false
        }
    };

    if (nextField.type !== 'link') nextField.linkConfig = {};
    if (!isSelectorField(nextField)) nextField.options = [];

    if (isCanonicalIncidentDescriptionField(nextField)) {
        nextField.key = 'incidentDescription';
        nextField.role = 'incident-description';
        nextField.name = incidentSettings.label;
        nextField.placeholder = incidentSettings.placeholder;
        nextField.required = incidentSettings.required;
        nextField.width = 'רוחב מלא';
    }

    return nextField;
};

const normalizeFields = (storedFields, incidentSettings) => {
    const fallbackFields = createDefaultSettings().fields;
    const sourceFields = Array.isArray(storedFields) && storedFields.length ? storedFields : fallbackFields;
    const canonicalField = findCanonicalIncidentField(sourceFields) || fallbackFields.find((field) => field.id === 'description');
    let canonicalAssigned = false;

    const firstPass = sourceFields.map((field) => {
        const shouldMarkCanonical = !canonicalAssigned && canonicalField && field.id === canonicalField.id;
        const shell = normalizeFieldShell({ ...field, ...(shouldMarkCanonical ? { key: 'incidentDescription', role: 'incident-description' } : {}) }, incidentSettings);
        if (shouldMarkCanonical) {
            canonicalAssigned = true;
        } else if (shell.key === 'incidentDescription' || shell.role === 'incident-description') {
            delete shell.key;
            delete shell.role;
        }
        return shell;
    });

    const byId = new Map(firstPass.map((field) => [field.id, field]));
    return firstPass.map((field) => {
        const fallback = fallbackById.get(field.id) || {};
        let parentId = sanitizeDisplayString(field.parentId, '');
        if (!parentId || parentId === field.id || !byId.has(parentId) || !isSelectorField(byId.get(parentId)) || !isSelectorField(field)) {
            parentId = undefined;
        }
        const nextField = { ...field, parentId };
        nextField.dependencyMap = normalizeDependencyMap(nextField, firstPass, fallback);
        return nextField;
    });
};

const normalizeTableFields = (storedTableFields, fields, fallback) => {
    const validIds = new Set(fields.map((field) => field.id));
    const source = Array.isArray(storedTableFields) && storedTableFields.length ? storedTableFields : fallback.tableFields;
    const seen = new Set();
    const normalized = source.filter((id) => {
        if (!validIds.has(id) || seen.has(id)) return false;
        seen.add(id);
        return true;
    });
    return normalized.length ? normalized : fields.filter((field) => field.showInRow !== false).slice(0, 6).map((field) => field.id);
};

const normalizeSections = (storedSections, fields) => {
    const validIds = new Set(fields.map((field) => field.id));
    if (!Array.isArray(storedSections) || !storedSections.length) return createDefaultSections(fields);
    const seen = new Set();

    const sections = storedSections.map((section, index) => ({
        id: sanitizeDisplayString(section?.id, `section-${index + 1}`),
        title: sanitizeDisplayString(section?.title, index === 0 ? 'מידע קריטי' : `מקטע ${index + 1}`),
        fields: Array.isArray(section?.fields)
            ? section.fields
                .filter((item) => {
                    if (!validIds.has(item?.id) || seen.has(item.id)) return false;
                    seen.add(item.id);
                    return true;
                })
                .map((item) => ({ id: item.id, visible: item.visible !== false, width: sanitizeWidth(item.width, fields.find((field) => field.id === item.id)?.width || 'חצי רוחב') }))
            : []
    }));

    return sections.length ? sections : createDefaultSections(fields);
};

export const normalizeSettings = (stored) => {
    const fallback = createDefaultSettings();
    const canonicalFallbackField = findCanonicalIncidentField(Array.isArray(stored?.fields) ? stored.fields : fallback.fields) || fallback.fields.find((field) => field.id === 'description');
    const incidentDescription = normalizeIncidentDescriptionSettings(stored?.general?.incidentDescription, canonicalFallbackField);
    const fields = normalizeFields(stored?.fields, incidentDescription);
    const incidentDescriptionTemplates = normalizeIncidentDescriptionTemplates(stored?.general, stored);
    const tableFields = normalizeTableFields(stored?.tableFields, fields, fallback);
    const sections = normalizeSections(stored?.sections, fields);

    return {
        ...fallback,
        ...(stored || {}),
        schemaVersion: 4,
        scope: {
            level: 'room',
            inheritedFrom: 'subEnvironment',
            mode: ['inherit', 'local'].includes(stored?.scope?.mode) ? stored.scope.mode : 'local'
        },
        fields,
        tableFields,
        sections,
        general: {
            ...defaultGeneralSettings,
            ...(stored?.general || {}),
            defaultPriority: sanitizeDisplayString(stored?.general?.defaultPriority, defaultGeneralSettings.defaultPriority),
            duplicateWarning: sanitizeDisplayString(stored?.general?.duplicateWarning, defaultGeneralSettings.duplicateWarning),
            closeSound: sanitizeDisplayString(stored?.general?.closeSound, defaultGeneralSettings.closeSound),
            numberFormat: sanitizeDisplayString(stored?.general?.numberFormat, defaultGeneralSettings.numberFormat),
            incidentDescription,
            incidentDescriptionTemplates
        }
    };
};

export const settingsRepository = {
    async load(roomId, options = {}) {
        if (!roomId) throw new Error('יש לבחור חדר לפני טעינת הגדרות משותפות.');
        const response = await settingsApi.getRoomSettings(roomId, options);
        return {
            settings: normalizeSettings(response.data?.value),
            version: Number(response.data?.version) || 0
        };
    },

    async save(roomId, settings, version, options = {}) {
        if (!roomId) throw new Error('יש לבחור חדר לפני שמירת הגדרות משותפות.');
        const payload = normalizeSettings(settings);
        const response = await settingsApi.saveRoomSettings(roomId, payload, version, options);
        return {
            settings: normalizeSettings(response.data?.value),
            version: Number(response.data?.version) || 0
        };
    }
};