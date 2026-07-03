import { config } from '../config';
import { httpCheck, okValidator } from './httpChecker';
import type { CheckResult } from '../types';

/**
 * 4 lightweight AI/ML service health probes.
 * Only hits GET / or GET /health -never triggers GPU inference.
 * Runs on a separate 6h schedule to avoid overloading model servers.
 */
export async function runAiMlChecks(): Promise<CheckResult[]> {
    const T_SLOW = 30_000; // 30s timeout -cold-start GPU containers can be slow

    const checks = await Promise.allSettled([
        httpCheck({
            id: 'aiml-cat',
            name: 'AI: Complaint Classifier (cat-ani)',
            group: 'ai-ml',
            url: `${config.aiml.catAni}/`,
            validate: okValidator,
            timeout: T_SLOW,
            severity: 'WARNING',
        }),
        httpCheck({
            id: 'aiml-voice',
            name: 'AI: Voice Chat (voice-ani)',
            group: 'ai-ml',
            url: `${config.aiml.voiceAni}/health`,
            validate: okValidator,
            timeout: T_SLOW,
            severity: 'WARNING',
        }),
        httpCheck({
            id: 'aiml-toxic',
            name: 'AI: Abuse Detector (toxic-ani)',
            group: 'ai-ml',
            url: `${config.aiml.toxicAni}/health`,
            validate: okValidator,
            timeout: T_SLOW,
            severity: 'WARNING',
        }),
        httpCheck({
            id: 'aiml-vision',
            name: 'AI: Vision CV (vision-ani)',
            group: 'ai-ml',
            url: `${config.aiml.visionAni}/`,
            validate: okValidator,
            timeout: T_SLOW,
            severity: 'WARNING',
        }),
    ]);

    return checks.map((r) =>
        r.status === 'fulfilled'
            ? r.value
            : {
                id: 'aiml-unknown',
                name: 'AI/ML Probe Error',
                group: 'ai-ml' as const,
                status: 'DOWN' as const,
                responseTimeMs: 0,
                message: (r as PromiseRejectedResult).reason?.message || 'Unknown error',
                timestamp: new Date().toISOString(),
                severity: 'WARNING' as const,
            }
    );
}
