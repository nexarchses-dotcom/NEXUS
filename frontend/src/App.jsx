import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useAuth } from './context/AuthContext.jsx';
import { useConfig } from './context/ConfigContext.jsx';
import Navbar from './components/Navbar.jsx';
import Login from './screens/Login.jsx';
import Dashboard from './screens/Dashboard.jsx';
import ModuleScreen from './screens/ModuleScreen.jsx';
import { AcceptQuote, OrderStatus, POStatus, RequisitionApprove } from './screens/TradingActions.jsx';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'REPLACE_WITH_OAUTH_CLIENT_ID';

function Shell({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-6">{children}</main>
      <footer className="py-4 text-center">
        <span className="text-xs text-gray-400">Powered by CYRABELL</span>
      </footer>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  const { ready } = useConfig();

  if (loading || !ready) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  }
  if (!user) {
    return <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}><Login /></GoogleOAuthProvider>;
  }

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={
          <ModuleScreen module="products" moduleKey="Products" title="Product" idField="productId" />} />
        <Route path="/rfqs" element={
          <ModuleScreen module="rfqs" moduleKey="RFQs" title="RFQ" idField="rfqId" />} />
        <Route path="/quotes" element={
          <ModuleScreen module="quotes" moduleKey="Quotes" title="Quote" idField="quoteId"
            renderActions={AcceptQuote} />} />
        <Route path="/orders" element={
          <ModuleScreen module="orders" moduleKey="Orders" title="Order" idField="orderId"
            renderActions={OrderStatus} />} />
        <Route path="/purchase-orders" element={
          <ModuleScreen module="purchase-orders" moduleKey="PurchaseOrders" title="Purchase Order" idField="poId"
            renderActions={POStatus} />} />
        <Route path="/purchase-requisitions" element={
          <ModuleScreen module="purchase-requisitions" moduleKey="PurchaseRequisitions"
            title="Requisition" idField="reqId" renderActions={RequisitionApprove} />} />
        <Route path="/inventory" element={
          <ModuleScreen module="inventory" moduleKey="Inventory" title="Inventory" idField="inventoryId" />} />
        <Route path="/warehouses" element={
          <ModuleScreen module="warehouses" moduleKey="Warehouses" title="Warehouse" idField="warehouseId" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
