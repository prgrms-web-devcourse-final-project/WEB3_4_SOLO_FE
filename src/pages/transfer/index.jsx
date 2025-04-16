import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';
import TransferForm from '../../components/transfer/TransferForm';

const TransferPage = () => {
  const router = useRouter();
  const { fromAccount } = router.query;
  const [initialFromAccountId, setInitialFromAccountId] = useState(null);
  
  // URL 쿼리 파라미터에서 fromAccount를 가져와서 설정
  useEffect(() => {
    if (router.isReady && fromAccount) {
      setInitialFromAccountId(fromAccount);
    }
  }, [router.isReady, fromAccount]);

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto pb-12">
        <h1 className="text-2xl font-bold mb-6">계좌 이체</h1>
        <TransferForm initialFromAccountId={initialFromAccountId} />
      </div>
    </MainLayout>
  );
};

export default TransferPage; 