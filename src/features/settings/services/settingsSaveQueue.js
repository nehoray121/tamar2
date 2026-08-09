export const createLatestSettingsSaveQueue = ({
    initialVersion = 0,
    save,
    reload,
    onSaved = () => {},
    onRollback = () => {},
    onError = () => {}
}) => {
    let version = initialVersion;
    let latestRevision = 0;
    let pending = null;
    let running = false;
    let stopped = false;
    let idleResolvers = [];

    const resolveIdle = () => {
        if (running || pending) return;
        const resolvers = idleResolvers;
        idleResolvers = [];
        resolvers.forEach((resolve) => resolve());
    };

    const drain = async () => {
        if (running || stopped) return;
        running = true;
        while (pending && !stopped) {
            const job = pending;
            pending = null;
            try {
                const result = await save(job.settings, version);
                version = result.version;
                if (job.revision === latestRevision && !pending && !stopped) onSaved(result, job);
            } catch (error) {
                try {
                    const serverTruth = await reload();
                    version = serverTruth.version;
                    if (job.revision === latestRevision && !pending && !stopped) onRollback(serverTruth, job);
                } catch {
                    // Preserve the last confirmed client value when server truth cannot be reloaded.
                }
                if (job.revision === latestRevision && !pending && !stopped) onError(error, job);
            }
        }
        running = false;
        resolveIdle();
    };

    return {
        markRevision(revision) {
            latestRevision = Math.max(latestRevision, revision);
        },
        enqueue(settings, revision) {
            if (stopped) return;
            latestRevision = Math.max(latestRevision, revision);
            pending = { settings, revision };
            void drain();
        },
        setVersion(nextVersion) {
            version = nextVersion;
        },
        stop() {
            stopped = true;
            pending = null;
            resolveIdle();
        },
        whenIdle() {
            if (!running && !pending) return Promise.resolve();
            return new Promise((resolve) => idleResolvers.push(resolve));
        }
    };
};

