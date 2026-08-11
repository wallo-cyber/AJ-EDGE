import { Suspense } from 'react';
import { ResearchWorkspace } from '../../components/research-workspace';
export default function ResearchPage(){return <Suspense fallback={<div className="crm-empty animate-pulse">جارٍ تحميل مساحة البحث...</div>}><ResearchWorkspace/></Suspense>}
