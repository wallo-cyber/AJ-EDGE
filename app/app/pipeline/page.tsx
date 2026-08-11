import { Suspense } from 'react';
import { PipelineWorkspace } from '../../components/pipeline-workspace';
export default function PipelinePage(){return <Suspense fallback={<div className="crm-empty animate-pulse">جارٍ تحميل مسار الفرص...</div>}><PipelineWorkspace/></Suspense>}
