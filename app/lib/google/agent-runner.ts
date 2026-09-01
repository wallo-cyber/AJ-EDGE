import { ai, DEFAULT_MODEL } from './gemini-client';

export interface AgentTask {
  role: string;
  task: string;
  context?: string;
}

export async function runAgent({ role, task, context }: AgentTask) {
  const systemInstruction = `أنت مساعد ذكي ونظام خبراء مخصص لمشروع AJ-EDGE.
صفة عملك: ${role}
يجب أن تكون إجاباتك دقيقة، عملية، وتخدم المتابعة الهندسية والإدارية فوراً.`;

  const prompt = `${systemInstruction}\n\n${context ? `السياق الحالي:\n${context}\n\n` : ''}المهمة المطلوبة:\n${task}`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
    });
    return response.text;
  } catch (error: any) {
    console.error('Agent Execution Error:', error?.message || error);
    throw error;
  }
}