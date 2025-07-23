// Receipt functionality for orders
class ReceiptManager {
   constructor() {
       this.currentOrder = null;
       this.businessInfo = null;
       this.setupReceiptModal();
   }

   // Create receipt modal HTML structure
   setupReceiptModal() {
       // Remove existing modal if present
       const existingModal = document.getElementById('receipt-modal');
       if (existingModal) {
           existingModal.remove();
       }

       // Create modal HTML
       const modalHTML = `
           <div id="receipt-modal" class="receipt-modal" style="display: none;">
               <div class="receipt-modal-overlay" onclick="closeReceipt()"></div>
               <div class="receipt-modal-content">
                   <div class="receipt-container" id="receipt-container">
                       <div class="receipt-header">
                           <div class="business-info">
                               <h2 id="business-name">Loading...</h2>
                               <p id="business-address">Loading...</p>
                               <p id="business-phone">Loading...</p>
                           </div>
                       </div>
                       
                       <div class="receipt-title">
                           <h1>Receipt</h1>
                       </div>
                       
                       <div class="receipt-details">
                           <div class="receipt-info">
                               <p><strong>Date:</strong> <span id="receipt-date">Loading...</span></p>
                               <p><strong>Receipt #:</strong> <span id="receipt-number">Loading...</span></p>
                           </div>
                       </div>
                       
                       <div class="receipt-items">
                           <table class="items-table">
                               <thead>
                                   <tr>
                                       <th>Product</th>
                                       <th>Qty</th>
                                       <th>Unit Price</th>
                                       <th>Total</th>
                                   </tr>
                               </thead>
                               <tbody id="receipt-items-body">
                                   <!-- Items will be populated here -->
                               </tbody>
                           </table>
                       </div>
                       
                       <div class="receipt-totals">
                           <div class="totals-row">
                               <span>Subtotal:</span>
                               <span id="receipt-subtotal">$0.00</span>
                           </div>
                           <div class="totals-row">
                               <span>Tax:</span>
                               <span id="receipt-tax">$0.00</span>
                           </div>
                           <div class="totals-row total-final">
                               <span><strong>Total:</strong></span>
                               <span id="receipt-total"><strong>$0.00</strong></span>
                           </div>
                       </div>
                   </div>
                   
                   <div class="receipt-actions">
                       <button onclick="printReceipt()" class="btn btn-print">Print</button>
                       <button onclick="downloadReceiptPDF()" class="btn btn-download">Download PDF</button>
                       <button onclick="closeReceipt()" class="btn btn-close">Close</button>
                   </div>
               </div>
           </div>
       `;

       // Add modal to body
       document.body.insertAdjacentHTML('beforeend', modalHTML);

       // Add CSS styles
       this.addReceiptStyles();
   }

   // Add CSS styles for the receipt
   addReceiptStyles() {
       if (document.getElementById('receipt-styles')) return;

       const style = document.createElement('style');
       style.id = 'receipt-styles';
       style.textContent = `
           .receipt-modal {
               position: fixed;
               top: 0;
               left: 0;
               width: 100%;
               height: 100%;
               z-index: 9999;
               display: flex;
               align-items: center;
               justify-content: center;
               animation: fadeIn 0.3s ease;
           }

           .receipt-modal-overlay {
               position: absolute;
               top: 0;
               left: 0;
               width: 100%;
               height: 100%;
               background: rgba(0, 0, 0, 0.5);
           }

           .receipt-modal-content {
               position: relative;
               background: white;
               border-radius: 8px;
               box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
               max-width: 600px;
               width: 90%;
               max-height: 90vh;
               overflow-y: auto;
               animation: slideIn 0.3s ease;
           }

           .receipt-container {
               padding: 30px;
               font-family: 'Courier New', monospace;
               background: white;
               color: #333;
               line-height: 1.4;
           }

           .receipt-header {
               text-align: center;
               border-bottom: 2px solid #333;
               padding-bottom: 20px;
               margin-bottom: 20px;
           }

           .business-info h2 {
               margin: 0 0 10px 0;
               font-size: 24px;
               font-weight: bold;
               color: #333;
           }

           .business-info p {
               margin: 5px 0;
               font-size: 14px;
               color: #666;
           }

           .receipt-title {
               text-align: center;
               margin-bottom: 20px;
           }

           .receipt-title h1 {
               font-size: 28px;
               margin: 0;
               color: #333;
               letter-spacing: 2px;
           }

           .receipt-details {
               margin-bottom: 20px;
               border-bottom: 1px solid #ddd;
               padding-bottom: 15px;
           }

           .receipt-info p {
               margin: 8px 0;
               font-size: 14px;
           }

           .items-table {
               width: 100%;
               border-collapse: collapse;
               margin-bottom: 20px;
           }

           .items-table th,
           .items-table td {
               padding: 12px 8px;
               text-align: left;
               border-bottom: 1px solid #ddd;
               font-size: 14px;
           }

           .items-table th {
               background: #f8f9fa;
               font-weight: bold;
               border-bottom: 2px solid #333;
           }

           .items-table th:nth-child(2),
           .items-table td:nth-child(2) {
               text-align: center;
               width: 60px;
           }

           .items-table th:nth-child(3),
           .items-table td:nth-child(3),
           .items-table th:nth-child(4),
           .items-table td:nth-child(4) {
               text-align: right;
               width: 90px;
           }

           .receipt-totals {
               border-top: 2px solid #333;
               padding-top: 15px;
               margin-top: 20px;
           }

           .totals-row {
               display: flex;
               justify-content: space-between;
               margin-bottom: 8px;
               font-size: 14px;
           }

           .total-final {
               border-top: 1px solid #333;
               padding-top: 10px;
               margin-top: 10px;
               font-size: 18px;
               color: #d32f2f;
           }

           .receipt-actions {
               display: flex;
               justify-content: center;
               gap: 15px;
               padding: 20px 30px;
               border-top: 1px solid #ddd;
               background: #f8f9fa;
               border-radius: 0 0 8px 8px;
           }

           .btn {
               padding: 10px 20px;
               border: none;
               border-radius: 5px;
               cursor: pointer;
               font-size: 14px;
               font-weight: bold;
               transition: all 0.3s ease;
           }

           .btn-print {
               background: #2196F3;
               color: white;
           }

           .btn-print:hover {
               background: #1976D2;
           }

           .btn-download {
               background: #4CAF50;
               color: white;
           }

           .btn-download:hover {
               background: #45a049;
           }

           .btn-close {
               background: #f44336;
               color: white;
           }

           .btn-close:hover {
               background: #da190b;
           }

           @keyframes fadeIn {
               from { opacity: 0; }
               to { opacity: 1; }
           }

           @keyframes slideIn {
               from { transform: translateY(-50px); opacity: 0; }
               to { transform: translateY(0); opacity: 1; }
           }

           @media print {
               .receipt-modal {
                   position: static !important;
               }
               
               .receipt-modal-overlay,
               .receipt-actions {
                   display: none !important;
               }
               
               .receipt-modal-content {
                   box-shadow: none !important;
                   border-radius: 0 !important;
                   max-width: none !important;
                   width: 100% !important;
               }
               
               .receipt-container {
                   padding: 20px !important;
               }
           }
       `;

       document.head.appendChild(style);
   }

   // Fetch business information
   async fetchBusinessInfo(businessId) {
       try {
           const { data: business, error } = await supabaseClient
               .from('bussiness')
               .select('company_name, business_address, business_phone')
               .eq('id', businessId)
               .single();

           if (error) {
               throw new Error(`Failed to fetch business info: ${error.message}`);
           }

           return business;
       } catch (error) {
           console.error('Error fetching business info:', error);
           return {
               company_name: 'Business Name',
               business_address: 'Business Address',
               business_phone: 'Phone Number'
           };
       }
   }

   // Fetch order details with products
   async fetchOrderDetails(orderId) {
       try {
           // First get the order by order_number
           let { data: orders, error } = await supabaseClient
               .from('orders')
               .select('*')
               .eq('order_number', orderId);

           // If not found by order_number, try by id
           if (!orders || orders.length === 0) {
               const numericId = orderId.replace(/\D/g, '');
               if (numericId) {
                   ({ data: orders, error } = await supabaseClient
                       .from('orders')
                       .select('*')
                       .eq('id', parseInt(numericId)));
               }
           }

           if (error || !orders || orders.length === 0) {
               throw new Error('Order not found');
           }

           const order = orders[0];
           return order;
       } catch (error) {
           console.error('Error fetching order details:', error);
           throw error;
       }
   }

   // Parse order items from ordername field (now contains proper JSON with product details)
   parseOrderItems(order) {
       try {
           let items = [];
           
           if (order.ordername) {
               if (Array.isArray(order.ordername)) {
                   items = order.ordername;
               } else if (typeof order.ordername === 'string') {
                   try {
                       const parsed = JSON.parse(order.ordername);
                       if (Array.isArray(parsed)) {
                           items = parsed;
                       } else {
                           // Fallback for single item
                           items = [parsed];
                       }
                   } catch (e) {
                       console.error('Error parsing ordername JSON:', e);
                       // Fallback to treating as simple string
                       items = [{
                           product_name: order.ordername,
                           quantity: 1,
                           unit_price: order.totalprice || 0,
                           line_total: order.totalprice || 0
                       }];
                   }
               }
           }

           // Ensure each item has required properties and format them properly
           return items.map(item => ({
               product_id: item.product_id || null,
               product_name: item.product_name || item.name || 'Unknown Product',
               quantity: parseInt(item.quantity) || 1,
               unit_price: parseFloat(item.unit_price) || parseFloat(item.price) || 0,
               line_total: parseFloat(item.line_total) || (parseFloat(item.unit_price || item.price || 0) * parseInt(item.quantity || 1))
           }));

       } catch (error) {
           console.error('Error parsing order items:', error);
           // Fallback to basic item structure
           return [{
               product_id: null,
               product_name: 'Unknown Product',
               quantity: 1,
               unit_price: parseFloat(order.totalprice) || 0,
               line_total: parseFloat(order.totalprice) || 0
           }];
       }
   }

   // Calculate totals from line_total values
   calculateTotals(items) {
       // Use line_total from each item for accurate subtotal
       const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
       const taxRate = 0.1; // 10% tax rate - you can make this configurable
       const tax = subtotal * taxRate;
       const total = subtotal + tax;

       return {
           subtotal: subtotal.toFixed(2),
           tax: tax.toFixed(2),
           total: total.toFixed(2)
       };
   }

   // Format date
   formatReceiptDate(dateString) {
       try {
           const date = new Date(dateString);
           return date.toLocaleDateString('en-US', {
               year: 'numeric',
               month: 'long',
               day: 'numeric',
               hour: '2-digit',
               minute: '2-digit'
           });
       } catch (error) {
           return new Date().toLocaleDateString('en-US', {
               year: 'numeric',
               month: 'long',
               day: 'numeric',
               hour: '2-digit',
               minute: '2-digit'
           });
       }
   }

   // Show receipt
   async showReceipt(orderId) {
       try {
           // Show modal with loading state
           const modal = document.getElementById('receipt-modal');
           if (!modal) return;
           
           modal.style.display = 'flex';

           // Fetch order details
           const order = await this.fetchOrderDetails(orderId);
           this.currentOrder = order;

           // Fetch business info
           this.businessInfo = await this.fetchBusinessInfo(order.business_id);

           // Update business information
           document.getElementById('business-name').textContent = this.businessInfo.company_name || 'Business Name';
           document.getElementById('business-address').textContent = this.businessInfo.business_address || 'Business Address';
           document.getElementById('business-phone').textContent = this.businessInfo.business_phone || 'Phone Number';

           // Update receipt details
           document.getElementById('receipt-date').textContent = this.formatReceiptDate(order.created_at);
           document.getElementById('receipt-number').textContent = order.order_number || `#${orderId}`;

           // Parse and display items
           const items = this.parseOrderItems(order);
           const itemsBody = document.getElementById('receipt-items-body');
           itemsBody.innerHTML = '';

           if (items.length === 0) {
               const row = document.createElement('tr');
               row.innerHTML = `
                   <td colspan="4" style="text-align: center; color: #666; font-style: italic;">
                       No items found in this order
                   </td>
               `;
               itemsBody.appendChild(row);
           } else {
               items.forEach(item => {
                   const row = document.createElement('tr');
                   row.innerHTML = `
                       <td>${item.product_name}</td>
                       <td>${item.quantity}</td>
                       <td>$${item.unit_price.toFixed(2)}</td>
                       <td>$${item.line_total.toFixed(2)}</td>
                   `;
                   itemsBody.appendChild(row);
               });
           }

           // Calculate and display totals
           const totals = this.calculateTotals(items);
           document.getElementById('receipt-subtotal').textContent = `$${totals.subtotal}`;
           document.getElementById('receipt-tax').textContent = `$${totals.tax}`;
           document.getElementById('receipt-total').textContent = `$${totals.total}`;

       } catch (error) {
           console.error('Error showing receipt:', error);
           alert('Failed to load receipt. Please try again.');
           this.closeReceipt();
       }
   }

   // Close receipt
   closeReceipt() {
       const modal = document.getElementById('receipt-modal');
       if (modal) {
           modal.style.display = 'none';
       }
   }

   // Print receipt
   printReceipt() {
       window.print();
   }

   // Download receipt as PDF
   downloadReceiptPDF() {
       try {
           const receiptContainer = document.getElementById('receipt-container');
           if (!receiptContainer) return;

           // Create a new window for PDF generation
           const printWindow = window.open('', '_blank');
           if (!printWindow) {
               alert('Please allow popups to download PDF');
               return;
           }

           const receiptHTML = `
               <!DOCTYPE html>
               <html>
               <head>
                   <title>Receipt - ${this.currentOrder?.order_number || 'Order'}</title>
                   <meta charset="UTF-8">
                   <style>
                       body {
                           font-family: 'Courier New', monospace;
                           margin: 0;
                           padding: 20px;
                           color: #333;
                           line-height: 1.4;
                       }
                       .receipt-container {
                           max-width: 600px;
                           margin: 0 auto;
                       }
                       .receipt-header {
                           text-align: center;
                           border-bottom: 2px solid #333;
                           padding-bottom: 20px;
                           margin-bottom: 20px;
                       }
                       .business-info h2 {
                           margin: 0 0 10px 0;
                           font-size: 24px;
                           font-weight: bold;
                       }
                       .business-info p {
                           margin: 5px 0;
                           font-size: 14px;
                           color: #666;
                       }
                       .receipt-title {
                           text-align: center;
                           margin-bottom: 20px;
                       }
                       .receipt-title h1 {
                           font-size: 28px;
                           margin: 0;
                           letter-spacing: 2px;
                       }
                       .receipt-details {
                           margin-bottom: 20px;
                           border-bottom: 1px solid #ddd;
                           padding-bottom: 15px;
                       }
                       .receipt-info p {
                           margin: 8px 0;
                           font-size: 14px;
                       }
                       .items-table {
                           width: 100%;
                           border-collapse: collapse;
                           margin-bottom: 20px;
                       }
                       .items-table th,
                       .items-table td {
                           padding: 12px 8px;
                           text-align: left;
                           border-bottom: 1px solid #ddd;
                           font-size: 14px;
                       }
                       .items-table th {
                           background: #f8f9fa;
                           font-weight: bold;
                           border-bottom: 2px solid #333;
                       }
                       .items-table th:nth-child(2),
                       .items-table td:nth-child(2) {
                           text-align: center;
                       }
                       .items-table th:nth-child(3),
                       .items-table td:nth-child(3),
                       .items-table th:nth-child(4),
                       .items-table td:nth-child(4) {
                           text-align: right;
                       }
                       .receipt-totals {
                           border-top: 2px solid #333;
                           padding-top: 15px;
                           margin-top: 20px;
                       }
                       .totals-row {
                           display: flex;
                           justify-content: space-between;
                           margin-bottom: 8px;
                           font-size: 14px;
                       }
                       .total-final {
                           border-top: 1px solid #333;
                           padding-top: 10px;
                           margin-top: 10px;
                           font-size: 18px;
                           color: #d32f2f;
                           font-weight: bold;
                       }
                   </style>
               </head>
               <body>
                   ${receiptContainer.outerHTML}
               </body>
               </html>
           `;

           printWindow.document.write(receiptHTML);
           printWindow.document.close();

           // Wait for content to load, then print and close
           printWindow.onload = function() {
               setTimeout(() => {
                   printWindow.print();
                   printWindow.close();
               }, 500);
           };

       } catch (error) {
           console.error('Error downloading PDF:', error);
           alert('Failed to download PDF. Please try again.');
       }
   }
}

// Initialize receipt manager
const receiptManager = new ReceiptManager();

// Global functions
window.viewReceipt = (orderId) => {
   receiptManager.showReceipt(orderId);
};

window.closeReceipt = () => {
   receiptManager.closeReceipt();
};

window.printReceipt = () => {
   receiptManager.printReceipt();
};

window.downloadReceiptPDF = () => {
   receiptManager.downloadReceiptPDF();
};

// Handle escape key to close receipt
document.addEventListener('keydown', (event) => {
   if (event.key === 'Escape') {
       const modal = document.getElementById('receipt-modal');
       if (modal && modal.style.display === 'flex') {
           receiptManager.closeReceipt();
       }
   }
});

// Make receiptManager globally available
window.receiptManager = receiptManager;