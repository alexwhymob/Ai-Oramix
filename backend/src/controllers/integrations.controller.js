import { writeAuditLog } from '../services/auditLog.service.js';
import { invokeLlmIntegration } from '../services/llmIntegration.service.js';

export async function invokeIntegration(req, res, next) {
  try {
    const { integrationName } = req.params;

    if (integrationName === 'llm') {
      const result = await invokeLlmIntegration(req.body, { actor: req.user });
      await writeAuditLog({
        req,
        action: 'integration.llm.invoke',
        metadata: {
          model: req.body?.model || null,
          promptLength: typeof req.body?.prompt === 'string' ? req.body.prompt.length : 0
        }
      });
      res.json(result);
      return;
    }

    const error = new Error(`Integration ${integrationName} is not migrated yet`);
    error.status = 501;
    error.code = 'integration_not_migrated';
    throw error;
  } catch (error) {
    next(error);
  }
}
