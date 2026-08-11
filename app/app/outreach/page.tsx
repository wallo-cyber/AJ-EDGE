import { Suspense } from 'react';
import { OutreachWorkspace } from '../../components/outreach-workspace';
export default function OutreachPage(){return <Suspense fallback={<div className="crm-empty animate-pulse">جارٍ تحميل مساحة التواصل...</div>}><OutreachWorkspace/></Suspense>}
