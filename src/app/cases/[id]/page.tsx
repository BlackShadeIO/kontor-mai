'use client';

import { useParams } from 'next/navigation';
import DocumentEditor from '@/components/DocumentEditor';

export default function CaseEditPage() {
  const params = useParams();
  const caseId = params.id as string;
  
  return <DocumentEditor caseId={caseId} />;
} 