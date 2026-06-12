import React, { useEffect, useState } from 'react';
import { getProduct, Product } from '../api/client';
import StateMessage from '../components/StateMessage';
import { ReviewCard } from '../components/ReviewCard'; // Corrected import
import SideNavBar from '../components/SideNavBar';
import PageHeader from '../components/PageHeader';

function useProductIdFromHash() {
  const [id, setId] = useState<string | undefined>();
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const parts = hash.slice(2).split('/');
      if (parts[0] === 'products' && parts[1]) {
        setId(parts[1]);
      }
    };
    handleHashChange(); // Initial check
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  return id;
}

const ProductReviewPage: React.FC = () => {
  const id = useProductIdFromHash();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      try {
        const data = await getProduct(id);
        setProduct(data);

        // If the product is still extracting, set up a poller
        if (data.status === 'extracting') {
          const intervalId = setInterval(async () => {
            try {
              const updatedData = await getProduct(id);
              if (updatedData.status !== 'extracting') {
                setProduct(updatedData);
                clearInterval(intervalId);
              }
            } catch (pollError) {
              console.error('Polling error:', pollError);
              clearInterval(intervalId);
            }
          }, 3000); // Poll every 3 seconds

          return () => clearInterval(intervalId);
        }
      } catch (err) {
        setError('Failed to fetch product details.');
        console.error(err);
      }
    };

    fetchProduct();
  }, [id]);

  let content;

  if (error) {
    content = <StateMessage variant="error" title="Error" message={error} />;
  } else if (!product || product.status === 'extracting') {
    content = <StateMessage variant="loading" title="Extraction in Progress" message="The AI is analyzing your product. This may take a moment..." />;
  } else {
    content = (
      <div className="max-w-4xl mx-auto p-4">
        <ReviewCard product={product} onAction={function (action: 'approve' | 'edit'): void {
            throw new Error('Function not implemented.');
          } } />
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background font-body-base text-body-base flex min-h-screen">
      <SideNavBar active="Products" />
      <div className="flex-1 md:ml-60 flex flex-col min-w-0 bg-background">
        <PageHeader title="Product Review" />
        <main className="flex-1 overflow-y-auto p-section-margin">
          {content}
        </main>
      </div>
    </div>
  );
};

export default ProductReviewPage;