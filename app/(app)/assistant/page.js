import { requireAccess } from '@/lib/auth';
import { aiEnabled, AI_MODEL } from '@/lib/ai';
import AiChat from '@/components/AiChat';
import { PageHeader } from '@/components/ui';

export default async function AssistantPage() {
  await requireAccess('ai');
  return (
    <>
      <PageHeader title="المساعد الذكي" subtitle={`مدعوم بـ Claude (${AI_MODEL}) · يقرأ بيانات المكتب الحية`} />
      <div className="card flex flex-col p-0">
        <AiChat enabled={aiEnabled()} />
      </div>
    </>
  );
}
