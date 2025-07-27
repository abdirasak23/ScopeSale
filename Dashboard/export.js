// export.js - Orders Export Functionality

class OrdersExporter {
    constructor() {
        this.initializeExportDropdown();
        this.bindEvents();
    }

    initializeExportDropdown() {
        // Create dropdown HTML structure
        const exportContainer = document.querySelector('.exports');
        if (!exportContainer) return;

        exportContainer.innerHTML = `
            <div class="export-dropdown">
                <button class="export-btn" id="exportBtn">
                    <span>Export</span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <div class="export-menu" id="exportMenu">
                    <button class="export-option" data-type="pdf">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M4 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="1.5"/>
                            <path d="M6 6h4M6 8h4M6 10h2" stroke="currentColor" stroke-width="1.5"/>
                        </svg>
                        Download PDF
                    </button>
                    <button class="export-option" data-type="csv">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M2 3h12v10H2z" stroke="currentColor" stroke-width="1.5"/>
                            <path d="M2 6h12M5 3v10" stroke="currentColor" stroke-width="1.5"/>
                        </svg>
                        Export as CSV
                    </button>
                </div>
            </div>
        `;

        // Add CSS styles
        this.addDropdownStyles();
    }

    addDropdownStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .export-dropdown {
                position: relative;
                display: inline-block;
            }

            .export-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                position:relative;
                left:20px;
                font-weight: 500;
                transition: background-color 0.2s ease;
            }

            .export-btn:hover {
                background: #0056b3;
            }

            .export-btn svg {
                transition: transform 0.2s ease;
            }

            .export-btn.active svg {
                transform: rotate(180deg);
            }

            .export-menu {
                position: absolute;
                top: 100%;
                right: 0;
                margin-top: 4px;
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                min-width: 160px;
                z-index: 1000;
                opacity: 0;
                visibility: hidden;
                transform: translateY(-10px);
                transition: all 0.2s ease;
            }

            .export-menu.show {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }

            .export-option {
                display: flex;
                align-items: center;
                gap: 10px;
                width: 100%;
                padding: 12px 16px;
                background: none;
                border: none;
                text-align: left;
                cursor: pointer;
                font-size: 14px;
                color: #333;
                transition: background-color 0.2s ease;
            }

            .export-option:hover {
                background: #f8f9fa;
            }

            .export-option:first-child {
                border-radius: 6px 6px 0 0;
            }

            .export-option:last-child {
                border-radius: 0 0 6px 6px;
            }

            .export-option svg {
                color: #666;
            }
        `;
        document.head.appendChild(style);
    }

    bindEvents() {
        const exportBtn = document.getElementById('exportBtn');
        const exportMenu = document.getElementById('exportMenu');
        const exportOptions = document.querySelectorAll('.export-option');

        if (!exportBtn || !exportMenu) return;

        // Toggle dropdown
        exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            exportBtn.classList.toggle('active');
            exportMenu.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            exportBtn.classList.remove('active');
            exportMenu.classList.remove('show');
        });

        // Handle export options
        exportOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const exportType = option.getAttribute('data-type');
                
                if (exportType === 'pdf') {
                    this.downloadPDF();
                } else if (exportType === 'csv') {
                    this.downloadCSV();
                }

                // Close dropdown
                exportBtn.classList.remove('active');
                exportMenu.classList.remove('show');
            });
        });
    }

    getOrdersData() {
        const orders = [];
        const rows = document.querySelectorAll('.orders tbody tr.data');

        rows.forEach(row => {
            const columns = row.querySelectorAll('.data-info');
            if (columns.length >= 6) {
                orders.push({
                    orderId: columns[0].textContent.trim(),
                    totalProducts: columns[1].textContent.trim(),
                    totalPrice: columns[2].textContent.trim(),
                    payment: columns[3].textContent.trim(),
                    orderDate: columns[4].textContent.trim(),
                    saler: columns[6] ? columns[6].textContent.trim() : ''
                });
            }
        });

        return orders;
    }

    downloadCSV() {
        const orders = this.getOrdersData();
        if (orders.length === 0) {
            alert('No orders data to export');
            return;
        }

        // Create CSV content
        const headers = ['Order ID', 'Total Products', 'Total Price', 'Payment', 'Order Date', 'Saler'];
        const csvContent = [
            headers.join(','),
            ...orders.map(order => [
                `"${order.orderId}"`,
                `"${order.totalProducts}"`,
                `"${order.totalPrice}"`,
                `"${order.payment}"`,
                `"${order.orderDate}"`,
                `"${order.saler}"`
            ].join(','))
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Show success message
        this.showNotification('CSV file downloaded successfully!', 'success');
    }

    downloadPDF() {
        const orders = this.getOrdersData();
        if (orders.length === 0) {
            alert('No orders data to export');
            return;
        }

        // Create a new window for PDF generation
        const printWindow = window.open('', '_blank');
        
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Orders Report</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        color: #333;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 2px solid #007bff;
                        padding-bottom: 20px;
                    }
                    .header h1 {
                        color: #007bff;
                        margin: 0;
                        font-size: 28px;
                    }
                    .header p {
                        margin: 5px 0 0 0;
                        color: #666;
                        font-size: 14px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    th {
                        background-color: #007bff;
                        color: white;
                        padding: 12px 8px;
                        text-align: left;
                        font-weight: 600;
                        font-size: 14px;
                    }
                    td {
                        padding: 10px 8px;
                        border-bottom: 1px solid #e0e0e0;
                        font-size: 13px;
                    }
                    tr:nth-child(even) {
                        background-color: #f8f9fa;
                    }
                    tr:hover {
                        background-color: #e3f2fd;
                    }
                    .footer {
                        margin-top: 30px;
                        text-align: center;
                        color: #666;
                        font-size: 12px;
                        border-top: 1px solid #e0e0e0;
                        padding-top: 20px;
                    }
                    @media print {
                        body { margin: 0; }
                        .header { margin-bottom: 20px; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Orders Report</h1>
                    <p>Generated on ${new Date().toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</p>
                    <p>Total Orders: ${orders.length}</p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Total Products</th>
                            <th>Total Price</th>
                            <th>Payment</th>
                            <th>Order Date</th>
                            <th>Saler</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orders.map(order => `
                            <tr>
                                <td>${order.orderId}</td>
                                <td>${order.totalProducts}</td>
                                <td>${order.totalPrice}</td>
                                <td>${order.payment}</td>
                                <td>${order.orderDate}</td>
                                <td>${order.saler}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="footer">
                    <p>This report contains ${orders.length} order(s) • Generated automatically</p>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Wait for content to load then trigger print
        printWindow.onload = function() {
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        };

        // Show success message
        this.showNotification('PDF generation initiated!', 'success');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#4caf50' : '#2196f3'};
            color: white;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-size: 14px;
            font-weight: 500;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize the exporter when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new OrdersExporter();
});

// Also initialize if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        new OrdersExporter();
    });
} else {
    new OrdersExporter();
}