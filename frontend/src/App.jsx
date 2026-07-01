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
import JournalEntries from './screens/JournalEntries.jsx';
import Reports from './screens/Reports.jsx';
import PayrollRuns from './screens/PayrollRuns.jsx';
import { LeaveApprove } from './screens/HRActions.jsx';
import { StockTransferStatus, ShipmentStatus } from './screens/OpsActions.jsx';
import Projects from './screens/Projects.jsx';

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

        {/* M3 — Finance & Accounting */}
        <Route path="/chart-of-accounts" element={
          <ModuleScreen module="chart-of-accounts" moduleKey="ChartOfAccounts" title="Account" idField="accountId" />} />
        <Route path="/journal-entries" element={<JournalEntries />} />
        <Route path="/invoices" element={
          <ModuleScreen module="invoices" moduleKey="Invoices" title="Invoice" idField="invoiceId" />} />
        <Route path="/payments" element={
          <ModuleScreen module="payments" moduleKey="Payments" title="Payment" idField="paymentId" />} />
        <Route path="/tax-codes" element={
          <ModuleScreen module="tax-codes" moduleKey="TaxCodes" title="Tax Code" idField="taxCodeId" />} />
        <Route path="/budgets" element={
          <ModuleScreen module="budgets" moduleKey="Budgets" title="Budget" idField="budgetId" />} />
        <Route path="/reports" element={<Reports />} />

        {/* M4 — HR & Payroll */}
        <Route path="/employees" element={
          <ModuleScreen module="employees" moduleKey="Employees" title="Employee" idField="employeeId" />} />
        <Route path="/attendance" element={
          <ModuleScreen module="attendance" moduleKey="Attendance" title="Attendance" idField="attendanceId" />} />
        <Route path="/leave-types" element={
          <ModuleScreen module="leave-types" moduleKey="LeaveManagement" title="Leave Type" idField="leaveTypeId" />} />
        <Route path="/leave-balances" element={
          <ModuleScreen module="leave-balances" moduleKey="LeaveBalances" title="Leave Balance" idField="balanceId" />} />
        <Route path="/leave-requests" element={
          <ModuleScreen module="leave-requests" moduleKey="LeaveRequests" title="Leave Request" idField="requestId"
            renderActions={LeaveApprove} />} />
        <Route path="/performance-reviews" element={
          <ModuleScreen module="performance-reviews" moduleKey="PerformanceReviews" title="Review" idField="reviewId" />} />
        <Route path="/training-certifications" element={
          <ModuleScreen module="training-certifications" moduleKey="Training" title="Certification" idField="certificationId" />} />
        <Route path="/salary-structures" element={
          <ModuleScreen module="salary-structures" moduleKey="Payroll" title="Salary Component" idField="structureId" />} />
        <Route path="/payroll-runs" element={<PayrollRuns />} />

        {/* M5 — Operations, Logistics, Sales/CRM, Vendors, Contracts, Projects, Risk, Helpdesk, Docs */}
        <Route path="/work-orders" element={
          <ModuleScreen module="work-orders" moduleKey="WorkOrders" title="Work Order" idField="workOrderId" />} />
        <Route path="/assets" element={
          <ModuleScreen module="assets" moduleKey="Assets" title="Asset" idField="assetId" />} />
        <Route path="/maintenance-records" element={
          <ModuleScreen module="maintenance-records" moduleKey="MaintenanceRecords" title="Maintenance Record" idField="recordId" />} />
        <Route path="/quality-inspections" element={
          <ModuleScreen module="quality-inspections" moduleKey="QualityInspections" title="Inspection" idField="inspectionId" />} />
        <Route path="/stock-transfers" element={
          <ModuleScreen module="stock-transfers" moduleKey="StockTransfers" title="Stock Transfer" idField="transferId"
            renderActions={StockTransferStatus} />} />
        <Route path="/shipments" element={
          <ModuleScreen module="shipments" moduleKey="Shipments" title="Shipment" idField="shipmentId"
            renderActions={ShipmentStatus} />} />

        <Route path="/contacts" element={
          <ModuleScreen module="contacts" moduleKey="Contacts" title="Contact" idField="contactId" />} />
        <Route path="/sales-pipeline" element={
          <ModuleScreen module="sales-pipeline" moduleKey="SalesPipeline" title="Pipeline Deal" idField="pipelineId" />} />
        <Route path="/campaigns" element={
          <ModuleScreen module="campaigns" moduleKey="Campaigns" title="Campaign" idField="campaignId" />} />
        <Route path="/communication-log" element={
          <ModuleScreen module="communication-log" moduleKey="CommunicationLog" title="Communication" idField="logId" />} />
        <Route path="/vendors" element={
          <ModuleScreen module="vendors" moduleKey="Vendors" title="Vendor" idField="vendorId" />} />
        <Route path="/vendor-ratings" element={
          <ModuleScreen module="vendor-ratings" moduleKey="VendorRatings" title="Vendor Rating" idField="ratingId" />} />
        <Route path="/vendor-contracts" element={
          <ModuleScreen module="vendor-contracts" moduleKey="VendorContracts" title="Vendor Contract" idField="vendorContractId" />} />

        <Route path="/projects" element={<Projects />} />
        <Route path="/contracts" element={
          <ModuleScreen module="contracts" moduleKey="Contracts" title="Contract" idField="contractId" />} />
        <Route path="/contract-obligations" element={
          <ModuleScreen module="contract-obligations" moduleKey="ContractObligations" title="Obligation" idField="obligationId" />} />
        <Route path="/documents" element={
          <ModuleScreen module="documents" moduleKey="Documents" title="Document" idField="documentId" />} />
        <Route path="/risk-register" element={
          <ModuleScreen module="risk-register" moduleKey="RiskRegister" title="Risk" idField="riskId" />} />
        <Route path="/compliance-items" element={
          <ModuleScreen module="compliance-items" moduleKey="ComplianceItems" title="Compliance Item" idField="complianceId" />} />
        <Route path="/support-tickets" element={
          <ModuleScreen module="support-tickets" moduleKey="SupportTickets" title="Support Ticket" idField="ticketId" />} />
        <Route path="/knowledge-base" element={
          <ModuleScreen module="knowledge-base" moduleKey="KnowledgeBase" title="KB Article" idField="articleId" />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
