/**
 * Endpoint GET para verificar que el webhook está accesible
 * Útil para debugging y verificar que la ruta está correctamente configurada
 */
export const loader = async () => {
  console.log('🔔 GET request to webhooks.orders.paid endpoint');
  console.log('🔔 This endpoint only accepts POST requests from Shopify');
  
  return new Response(JSON.stringify({
    message: 'This endpoint only accepts POST requests from Shopify webhooks',
    endpoint: '/webhooks/orders/paid',
    method: 'POST',
    note: 'Webhooks from Shopify will be automatically authenticated and processed'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

