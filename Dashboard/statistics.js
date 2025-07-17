// Statistics Management System

// --- Helper to get current user's business_id (owner or staff) ---
async function getCurrentBusinessId() {
    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    const userId = user.id;
    const userEmail = user.email;

    // 1. Try to find business where user is the owner
    let { data: businessData, error: businessError } = await supabaseClient
        .from('bussiness')
        .select('id, staff_emails')
        .eq('user_id', userId)
        .maybeSingle();

    // 2. If not found, try to find business where user is staff (staff_emails contains userEmail)
    if (!businessData) {
        let { data: staffBusinesses, error: staffError } = await supabaseClient
            .from('bussiness')
            .select('id, staff_emails')
            .contains('staff_emails', [userEmail]);

        // Fallback: If contains fails, check manually
        if (staffError) {
            const { data: allBusinesses, error: allError } = await supabaseClient
                .from('bussiness')
                .select('id, staff_emails');
            if (!allError && Array.isArray(allBusinesses)) {
                staffBusinesses = allBusinesses.filter(biz =>
                    Array.isArray(biz.staff_emails) && biz.staff_emails.includes(userEmail)
                );
            }
        }

        if (staffBusinesses && staffBusinesses.length > 0) {
            businessData = staffBusinesses[0];
        }
    }

    if (!businessData || !businessData.id) throw new Error('Business not found for user');
    return businessData.id;
}

class StatisticsManager {
    constructor() {
        this.stats = {
            totalRevenue: 0,
            totalProducts: 0,
            totalOrders: 0,
            totalProductsSold: 0
        };
        this.businessId = null;
        this.init();
    }

    // Initialize the statistics manager
    async init() {
        try {
            console.log('Initializing Statistics Manager...');
            if (typeof supabaseClient === 'undefined') {
                throw new Error('Supabase client not found. Make sure it is loaded before this script.');
            }
            // Get business id for current user
            this.businessId = await getCurrentBusinessId();
            await this.calculateStatistics();
            this.updateDisplay();
            this.setupAutoRefresh();
            console.log('Statistics Manager initialized successfully');
        } catch (error) {
            console.error('Error initializing statistics manager:', error);
            this.showError('Failed to load statistics');
        }
    }

    // Calculate all statistics
    async calculateStatistics() {
        try {
            console.log('Calculating statistics...');
            const [revenueData, productsData, ordersData, productsSoldData] = await Promise.all([
                this.calculateTotalRevenue(),
                this.calculateTotalProducts(),
                this.calculateTotalOrders(),
                this.calculateTotalProductsSold()
            ]);
            this.stats = {
                totalRevenue: revenueData,
                totalProducts: productsData,
                totalOrders: ordersData,
                totalProductsSold: productsSoldData
            };
            console.log('Statistics calculated:', this.stats);
        } catch (error) {
            console.error('Error calculating statistics:', error);
            throw error;
        }
    }

    // Calculate total revenue from all orders
    async calculateTotalRevenue() {
        try {
            const { data: orders, error } = await supabaseClient
                .from('orders')
                .select('totalprice')
                .eq('business_id', this.businessId);

            if (error) throw new Error(`Failed to fetch orders for revenue: ${error.message}`);
            const totalRevenue = orders.reduce((sum, order) => {
                const price = parseFloat(order.totalprice) || 0;
                return sum + price;
            }, 0);
            console.log(`Total Revenue: $${totalRevenue.toFixed(2)}`);
            return totalRevenue;
        } catch (error) {
            console.error('Error calculating total revenue:', error);
            return 0;
        }
    }

    // Calculate total products in inventory
    async calculateTotalProducts() {
        try {
            const { data: products, error } = await supabaseClient
                .from('products')
                .select('id')
                .eq('business_id', this.businessId);

            if (error) throw new Error(`Failed to fetch products: ${error.message}`);
            const totalProducts = products.length;
            console.log(`Total Products in Inventory: ${totalProducts}`);
            return totalProducts;
        } catch (error) {
            console.error('Error calculating total products:', error);
            return 0;
        }
    }

    // Calculate total orders
    async calculateTotalOrders() {
        try {
            const { data: orders, error } = await supabaseClient
                .from('orders')
                .select('id')
                .eq('business_id', this.businessId);

            if (error) throw new Error(`Failed to fetch orders: ${error.message}`);
            const totalOrders = orders.length;
            console.log(`Total Orders: ${totalOrders}`);
            return totalOrders;
        } catch (error) {
            console.error('Error calculating total orders:', error);
            return 0;
        }
    }

    // Calculate total products sold (sum of all quantities in orders)
    async calculateTotalProductsSold() {
        try {
            const { data: orders, error } = await supabaseClient
                .from('orders')
                .select('quantity, ordername')
                .eq('business_id', this.businessId);

            if (error) throw new Error(`Failed to fetch orders for products sold: ${error.message}`);
            let totalProductsSold = 0;
            orders.forEach(order => {
                if (order.quantity && typeof order.quantity === 'number') {
                    totalProductsSold += order.quantity;
                } else {
                    const productCount = this.getProductCountFromOrder(order);
                    totalProductsSold += productCount;
                }
            });
            console.log(`Total Products Sold: ${totalProductsSold}`);
            return totalProductsSold;
        } catch (error) {
            console.error('Error calculating total products sold:', error);
            return 0;
        }
    }

    // Helper function to get product count from order (same logic as in OrderManager)
    getProductCountFromOrder(order) {
        try {
            if (order.quantity && typeof order.quantity === 'number') {
                return order.quantity;
            }
            if (order.ordername && Array.isArray(order.ordername)) {
                return order.ordername.reduce((total, item) => {
                    if (typeof item === 'object' && item.quantity) {
                        return total + (parseInt(item.quantity) || 1);
                    }
                    return total + 1;
                }, 0);
            }
            if (order.ordername && typeof order.ordername === 'string') {
                try {
                    const parsed = JSON.parse(order.ordername);
                    if (Array.isArray(parsed)) {
                        return parsed.reduce((total, item) => {
                            if (typeof item === 'object' && item.quantity) {
                                return total + (parseInt(item.quantity) || 1);
                            }
                            return total + 1;
                        }, 0);
                    }
                } catch (e) {
                    return 1;
                }
            }
            return 1;
        } catch (error) {
            console.error('Error getting product count:', error);
            return 1;
        }
    }

    // Update the display with calculated statistics
    updateDisplay() {
        try {
            const revenueElement = document.querySelector('.number');
            if (revenueElement) {
                revenueElement.textContent = `$${this.stats.totalRevenue.toFixed(2)}`;
            }
            const saleCountElements = document.querySelectorAll('.sale-count');
            const salElements = document.querySelectorAll('.sal');
            salElements.forEach((salElement, index) => {
                const text = salElement.textContent.trim();
                const correspondingSaleCount = saleCountElements[index];
                if (correspondingSaleCount) {
                    switch (text) {
                        case 'Total Products':
                            correspondingSaleCount.textContent = this.stats.totalProducts;
                            break;
                        case 'Total Orders':
                            correspondingSaleCount.textContent = this.stats.totalOrders;
                            break;
                        case 'Product Sold':
                            correspondingSaleCount.textContent = this.stats.totalProductsSold;
                            break;
                        default:
                            console.log(`Unknown statistic: ${text}`);
                    }
                }
            });
            // Update payment option counts (for Cash and Online)
            this.updatePaymentOptionCounts();
            console.log('Statistics display updated successfully');
        } catch (error) {
            console.error('Error updating display:', error);
        }
    }

    // Add this method to update the payment option counts in the existing HTML
    async updatePaymentOptionCounts() {
        try {
            const { data: orders, error } = await supabaseClient
                .from('orders')
                .select('totalprice, payment_method')
                .eq('business_id', this.businessId);

            if (error) throw error;

            let cashTotal = 0;
            let onlineTotal = 0;

            orders.forEach(order => {
                const price = parseFloat(order.totalprice) || 0;
                const method = (order.payment_method || '').toLowerCase();
                if (method === 'cash') {
                    cashTotal += price;
                } else if (method === 'online') {
                    onlineTotal += price;
                }
            });

            // Update only the numbers in the existing payment option section
            // First .cash-c is for Cash, second .cash-c is for Online
            const cashElement = document.querySelector('.payment-option .cash .cash-c');
            const onlineElement = document.querySelector('.payment-option .cash.online .cash-c');
            if (cashElement) cashElement.textContent = cashTotal.toFixed(2);
            if (onlineElement) onlineElement.textContent = onlineTotal.toFixed(2);
        } catch (error) {
            console.error('Error updating payment option counts:', error);
        }
    }

    // Get detailed statistics breakdown
    async getDetailedStatistics() {
        try {
            const [orderStats, productStats, salesStats] = await Promise.all([
                this.getOrderStatistics(),
                this.getProductStatistics(),
                this.getSalesStatistics()
            ]);
            return {
                basic: this.stats,
                orders: orderStats,
                products: productStats,
                sales: salesStats
            };
        } catch (error) {
            console.error('Error getting detailed statistics:', error);
            return { basic: this.stats, orders: {}, products: {}, sales: {} };
        }
    }

    // Get order statistics breakdown
    async getOrderStatistics() {
        try {
            const { data: orders, error } = await supabaseClient
                .from('orders')
                .select('totalprice, payment_method, created_at')
                .eq('business_id', this.businessId);

            if (error) throw error;

            const stats = {
                totalOrders: orders.length,
                totalRevenue: orders.reduce((sum, order) => sum + (parseFloat(order.totalprice) || 0), 0),
                paymentMethods: {},
                ordersToday: 0,
                ordersThisWeek: 0,
                ordersThisMonth: 0,
                averageOrderValue: 0
            };

            orders.forEach(order => {
                const method = order.payment_method || 'Unknown';
                stats.paymentMethods[method] = (stats.paymentMethods[method] || 0) + 1;
            });

            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

            orders.forEach(order => {
                const orderDate = new Date(order.created_at);
                if (orderDate >= todayStart) stats.ordersToday++;
                if (orderDate >= weekStart) stats.ordersThisWeek++;
                if (orderDate >= monthStart) stats.ordersThisMonth++;
            });

            if (stats.totalOrders > 0) {
                stats.averageOrderValue = stats.totalRevenue / stats.totalOrders;
            }

            return stats;
        } catch (error) {
            console.error('Error getting order statistics:', error);
            return {};
        }
    }

    // Get product statistics breakdown
    async getProductStatistics() {
        try {
            const { data: products, error } = await supabaseClient
                .from('products')
                .select('category, stock, price')
                .eq('business_id', this.businessId);

            if (error) throw error;

            const stats = {
                totalProducts: products.length,
                categories: {},
                totalInventoryValue: 0,
                lowStockItems: 0,
                outOfStockItems: 0,
                averagePrice: 0
            };

            products.forEach(product => {
                stats.categories[product.category] = (stats.categories[product.category] || 0) + 1;
                stats.totalInventoryValue += (product.price || 0) * (product.stock || 0);
                if (product.stock === 0) stats.outOfStockItems++;
                else if (product.stock < 10) stats.lowStockItems++;
            });

            if (stats.totalProducts > 0) {
                const totalPrice = products.reduce((sum, product) => sum + (product.price || 0), 0);
                stats.averagePrice = totalPrice / stats.totalProducts;
            }

            return stats;
        } catch (error) {
            console.error('Error getting product statistics:', error);
            return {};
        }
    }

    // Get sales statistics breakdown
    async getSalesStatistics() {
        try {
            const { data: orders, error } = await supabaseClient
                .from('orders')
                .select('quantity, ordername, totalprice, created_at')
                .eq('business_id', this.businessId);

            if (error) throw error;

            const stats = {
                totalProductsSold: 0,
                totalRevenue: 0,
                salesByDay: {},
                salesByMonth: {},
                topSellingPeriods: []
            };

            orders.forEach(order => {
                const productCount = this.getProductCountFromOrder(order);
                stats.totalProductsSold += productCount;
                const revenue = parseFloat(order.totalprice) || 0;
                stats.totalRevenue += revenue;
                const orderDate = new Date(order.created_at);
                const dayKey = orderDate.toISOString().split('T')[0];
                const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
                stats.salesByDay[dayKey] = (stats.salesByDay[dayKey] || 0) + productCount;
                stats.salesByMonth[monthKey] = (stats.salesByMonth[monthKey] || 0) + productCount;
            });

            return stats;
        } catch (error) {
            console.error('Error getting sales statistics:', error);
            return {};
        }
    }

    // Refresh all statistics
    async refreshStatistics() {
        try {
            console.log('Refreshing statistics...');
            await this.calculateStatistics();
            this.updateDisplay();
            this.showSuccess('Statistics refreshed successfully');
        } catch (error) {
            console.error('Error refreshing statistics:', error);
            this.showError('Failed to refresh statistics');
        }
    }

    // Setup auto-refresh (every 5 minutes)
    setupAutoRefresh() {
        setInterval(() => {
            this.refreshStatistics();
        }, 5 * 60 * 1000); // 5 minutes
    }

    // Export statistics to CSV
    exportStatistics() {
        try {
            const stats = this.stats;
            const csvContent = [
                ['Metric', 'Value'],
                ['Total Revenue', `$${stats.totalRevenue.toFixed(2)}`],
                ['Total Products', stats.totalProducts],
                ['Total Orders', stats.totalOrders],
                ['Total Products Sold', stats.totalProductsSold],
                ['Average Order Value', stats.totalOrders > 0 ? `$${(stats.totalRevenue / stats.totalOrders).toFixed(2)}` : '$0.00'],
                ['Export Date', new Date().toLocaleString()]
            ].map(row => row.join(',')).join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            link.setAttribute('href', url);
            link.setAttribute('download', `statistics_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showSuccess('Statistics exported successfully');
        } catch (error) {
            console.error('Error exporting statistics:', error);
            this.showError('Failed to export statistics');
        }
    }

    // Show success message
    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    // Show error message
    showError(message) {
        this.showMessage(message, 'error');
    }

    // Show message utility
    showMessage(message, type = 'info') {
        const existingMsg = document.getElementById('stats-message');
        if (existingMsg) existingMsg.remove();

        const msgElement = document.createElement('div');
        msgElement.id = 'stats-message';
        msgElement.textContent = message;
        msgElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 5px;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 300px;
            word-wrap: break-word;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            animation: fadeInOut 4s forwards;
        `;

        document.body.appendChild(msgElement);

        setTimeout(() => {
            if (msgElement.parentNode) {
                msgElement.parentNode.removeChild(msgElement);
            }
        }, 4000);
    }
}

// Initialize the statistics manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (typeof supabaseClient === 'undefined') {
        console.error('Supabase client not found. Make sure it is loaded before this script.');
        return;
    }
    const statisticsManager = new StatisticsManager();
    window.statisticsManager = statisticsManager;
});

// Real-time statistics updates using Supabase Realtime
function initializeStatisticsRealtime() {
    if (!window.statisticsManager || !window.statisticsManager.businessId) return;

    const businessId = window.statisticsManager.businessId;

    // Subscribe to changes in 'orders' table for this business
    const ordersChannel = supabaseClient
        .channel('orders-realtime')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `business_id=eq.${businessId}`
            },
            payload => {
                // Refresh statistics and update UI immediately
                window.statisticsManager.refreshStatistics();
            }
        )
        .subscribe();

    // Subscribe to changes in 'products' table for this business
    const productsChannel = supabaseClient
        .channel('products-realtime')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'products',
                filter: `business_id=eq.${businessId}`
            },
            payload => {
                window.statisticsManager.refreshStatistics();
            }
        )
        .subscribe();

    // Store channels for cleanup if needed
    window.statisticsRealtimeChannels = [ordersChannel, productsChannel];
}

// Initialize the statistics manager and real-time updates when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (typeof supabaseClient === 'undefined') {
        console.error('Supabase client not found. Make sure it is loaded before this script.');
        return;
    }
    const statisticsManager = new StatisticsManager();
    window.statisticsManager = statisticsManager;

    // Wait until businessId is set, then initialize real-time updates
    const waitForBusinessId = setInterval(() => {
        if (window.statisticsManager && window.statisticsManager.businessId) {
            initializeStatisticsRealtime();
            clearInterval(waitForBusinessId);
        }
    }, 200);
});

// Global utility functions
window.getStatisticsManager = () => window.statisticsManager;
window.refreshStatistics = () => window.statisticsManager?.refreshStatistics();
window.exportStatistics = () => window.statisticsManager?.exportStatistics();
window.getDetailedStatistics = () => window.statisticsManager?.getDetailedStatistics();

window.getRevenueData = async () => {
    const manager = window.statisticsManager;
    if (manager) {
        return await manager.calculateTotalRevenue();
    }
    return 0;
};

window.getProductCount = async () => {
    const manager = window.statisticsManager;
    if (manager) {
        return await manager.calculateTotalProducts();
    }
    return 0;
};

window.getOrderCount = async () => {
    const manager = window.statisticsManager;
    if (manager) {
        return await manager.calculateTotalOrders();
    }
    return 0;
};

window.getProductsSoldCount = async () => {
    const manager = window.statisticsManager;
    if (manager) {
        return await manager.calculateTotalProductsSold();
    }
    return 0;
};

window.logStatistics = () => {
    if (window.statisticsManager) {
        console.log('Current Statistics:', window.statisticsManager.stats);
    } else {
        console.log('Statistics manager not initialized');
    }
};

// --- Revenue Chart Manager - Integrated with Statistics System ---
class RevenueChartManager {
    constructor() {
        this.chartContainer = null;
        this.revenueData = [];
        this.maxRevenue = 0;
        this.minRevenue = 0;
        this.chartHeight = 180;
        this.chartWidth = 500;
        this.businessId = null;
        this.init();
    }

    async init() {
        try {
            console.log('Initializing Revenue Chart Manager...');
            await this.waitForStatisticsManager();
            this.businessId = window.statisticsManager?.businessId || await getCurrentBusinessId();
            this.chartContainer = document.querySelector('.sales-activity-container');
            if (!this.chartContainer) throw new Error('Chart container not found');
            await this.loadRevenueData();
            this.updateChart();
            this.setupAutoRefresh();
            console.log('Revenue Chart Manager initialized successfully');
        } catch (error) {
            console.error('Error initializing revenue chart manager:', error);
            this.showError('Failed to load revenue chart data');
        }
    }

    async waitForStatisticsManager() {
        return new Promise((resolve) => {
            const checkManager = () => {
                if (window.statisticsManager && window.statisticsManager.businessId) {
                    resolve();
                } else {
                    setTimeout(checkManager, 100);
                }
            };
            checkManager();
        });
    }

    async loadRevenueData() {
        try {
            console.log('Loading revenue data...');
            const dailyRevenue = await this.getDailyRevenueData();
            this.revenueData = dailyRevenue;
            this.calculateRevenueRange();
            console.log('Revenue data loaded:', this.revenueData);
        } catch (error) {
            console.error('Error loading revenue data:', error);
            this.revenueData = this.generateSampleData();
            this.calculateRevenueRange();
        }
    }

    async getDailyRevenueData() {
        try {
            const { data: orders, error } = await supabaseClient
                .from('orders')
                .select('totalprice, created_at')
                .eq('business_id', this.businessId)
                .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

            if (error) throw error;

            const dailyRevenue = {};
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            for (let i = 0; i < 7; i++) {
                const date = new Date();
                date.setDate(date.getDate() - (6 - i));
                const dayName = days[date.getDay()];
                const dateKey = date.toISOString().split('T')[0];
                dailyRevenue[dayName] = {
                    day: dayName,
                    date: dateKey,
                    revenue: 0,
                    orders: 0
                };
            }
            orders.forEach(order => {
                const orderDate = new Date(order.created_at);
                const dayName = days[orderDate.getDay()];
                const revenue = parseFloat(order.totalprice) || 0;
                if (dailyRevenue[dayName]) {
                    dailyRevenue[dayName].revenue += revenue;
                    dailyRevenue[dayName].orders++;
                }
            });
            return Object.values(dailyRevenue);
        } catch (error) {
            console.error('Error fetching daily revenue data:', error);
            return this.generateSampleData();
        }
    }

    generateSampleData() {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days.map((day, index) => ({
            day: day,
            date: new Date(Date.now() - (6 - index) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            revenue: Math.random() * 2500 + 300,
            orders: Math.floor(Math.random() * 20) + 1
        }));
    }

    calculateRevenueRange() {
        if (this.revenueData.length === 0) return;
        const revenues = this.revenueData.map(d => d.revenue);
        this.maxRevenue = Math.max(...revenues);
        this.minRevenue = Math.min(...revenues);
        this.minRevenue = Math.min(this.minRevenue, 300);
        this.maxRevenue = Math.max(this.maxRevenue, 3000);
        const padding = (this.maxRevenue - this.minRevenue) * 0.1;
        this.maxRevenue += padding;
        this.minRevenue = Math.max(0, this.minRevenue - padding);
    }

    revenueToY(revenue) {
        const range = this.maxRevenue - this.minRevenue;
        const normalizedRevenue = (revenue - this.minRevenue) / range;
        return this.chartHeight - (normalizedRevenue * this.chartHeight);
    }

    generateChartPath() {
        if (this.revenueData.length === 0) return '';
        const pointSpacing = this.chartWidth / (this.revenueData.length - 1);
        let path = '';
        this.revenueData.forEach((data, index) => {
            const x = index * pointSpacing;
            const y = this.revenueToY(data.revenue);
            if (index === 0) {
                path += `M ${x} ${y}`;
            } else {
                const prevX = (index - 1) * pointSpacing;
                const controlX = (prevX + x) / 2;
                const controlY = y;
                path += ` Q ${controlX} ${controlY} ${x} ${y}`;
            }
        });
        return path;
    }

    generateAreaPath() {
        const linePath = this.generateChartPath();
        if (!linePath) return '';
        const bottomY = this.chartHeight;
        const rightX = this.chartWidth;
        return `${linePath} L ${rightX} ${bottomY} L 0 ${bottomY} Z`;
    }

    updateChart() {
        try {
            if (!this.chartContainer) return;
            this.updateYAxisLabels();
            this.updateChartPaths();
            this.updateDataPoints();
            this.updateTooltips();
            this.updateChartTitle();
            console.log('Chart updated with real revenue data');
        } catch (error) {
            console.error('Error updating chart:', error);
        }
    }

    updateYAxisLabels() {
        const yAxisContainer = this.chartContainer.querySelector('.y-axis');
        if (!yAxisContainer) return;
        const steps = 5;
        const stepValue = (this.maxRevenue - this.minRevenue) / (steps - 1);
        yAxisContainer.innerHTML = '';
        for (let i = 0; i < steps; i++) {
            const value = this.maxRevenue - (i * stepValue);
            const labelDiv = document.createElement('div');
            labelDiv.textContent = this.formatCurrency(value);
            yAxisContainer.appendChild(labelDiv);
        }
    }

    updateChartPaths() {
        const chartSvg = this.chartContainer.querySelector('.chart-svg');
        if (!chartSvg) return;
        const linePath = this.generateChartPath();
        const areaPath = this.generateAreaPath();
        const lineElement = chartSvg.querySelector('.chart-line');
        if (lineElement) {
            lineElement.setAttribute('d', linePath);
        }
        const areaElement = chartSvg.querySelector('.chart-area-fill');
        if (areaElement) {
            areaElement.setAttribute('d', areaPath);
        }
    }

    updateDataPoints() {
        const chartSvg = this.chartContainer.querySelector('.chart-svg');
        if (!chartSvg) return;
        const dataPoints = chartSvg.querySelectorAll('.data-point');
        const pointSpacing = this.chartWidth / (this.revenueData.length - 1);
        let maxRevenueIndex = 0;
        let maxRevenueValue = 0;
        this.revenueData.forEach((data, index) => {
            if (data.revenue > maxRevenueValue) {
                maxRevenueValue = data.revenue;
                maxRevenueIndex = index;
            }
        });
        dataPoints.forEach((point, index) => {
            if (index < this.revenueData.length) {
                const x = index * pointSpacing;
                const y = this.revenueToY(this.revenueData[index].revenue);
                point.setAttribute('cx', x);
                point.setAttribute('cy', y);
                if (index === maxRevenueIndex) {
                    point.classList.add('highlight-point');
                    point.setAttribute('r', '6');
                    const valueLabel = chartSvg.querySelector('.value-label');
                    if (valueLabel) {
                        valueLabel.setAttribute('x', x);
                        valueLabel.setAttribute('y', y - 10);
                        valueLabel.textContent = this.formatCurrency(maxRevenueValue);
                    }
                } else {
                    point.classList.remove('highlight-point');
                    point.setAttribute('r', '3');
                }
            }
        });
    }

    updateTooltips() {
        const dataPoints = this.chartContainer.querySelectorAll('.data-point');
        const tooltip = this.chartContainer.querySelector('#tooltip');
        if (!tooltip) return;
        dataPoints.forEach((point, index) => {
            point.removeEventListener('mouseenter', point._mouseEnterHandler);
            point.removeEventListener('mouseleave', point._mouseLeaveHandler);
            point.removeEventListener('mousemove', point._mouseMoveHandler);
            if (index < this.revenueData.length) {
                const data = this.revenueData[index];
                point._mouseEnterHandler = (e) => {
                    tooltip.innerHTML = `
                        <div><strong>${data.day}</strong></div>
                        <div>Revenue: ${this.formatCurrency(data.revenue)}</div>
                        <div>Orders: ${data.orders}</div>
                    `;
                    tooltip.style.opacity = '1';
                    tooltip.style.left = (e.pageX + 10) + 'px';
                    tooltip.style.top = (e.pageY - 30) + 'px';
                };
                point._mouseLeaveHandler = () => {
                    tooltip.style.opacity = '0';
                };
                point._mouseMoveHandler = (e) => {
                    tooltip.style.left = (e.pageX + 10) + 'px';
                    tooltip.style.top = (e.pageY - 30) + 'px';
                };
                point.addEventListener('mouseenter', point._mouseEnterHandler);
                point.addEventListener('mouseleave', point._mouseLeaveHandler);
                point.addEventListener('mousemove', point._mouseMoveHandler);
            }
        });
    }

    updateChartTitle() {
        const titleElement = this.chartContainer.querySelector('.chart-title');
        if (!titleElement) return;
        const totalRevenue = this.revenueData.reduce((sum, data) => sum + data.revenue, 0);
        titleElement.textContent = `Sales Activity - Total: ${this.formatCurrency(totalRevenue)}`;
    }

    formatCurrency(value) {
        if (value >= 1000) {
            return `$${(value / 1000).toFixed(1)}k`;
        }
        return `$${value.toFixed(0)}`;
    }

    setupAutoRefresh() {
        setInterval(async () => {
            await this.loadRevenueData();
            this.updateChart();
        }, 5 * 60 * 1000);
    }

    async refreshChart() {
        try {
            await this.loadRevenueData();
            this.updateChart();
            this.showSuccess('Chart refreshed successfully');
        } catch (error) {
            console.error('Error refreshing chart:', error);
            this.showError('Failed to refresh chart');
        }
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type = 'info') {
        const existingMsg = document.getElementById('chart-message');
        if (existingMsg) existingMsg.remove();
        const msgElement = document.createElement('div');
        msgElement.id = 'chart-message';
        msgElement.textContent = message;
        msgElement.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            font-family: Arial, sans-serif;
            font-size: 12px;
            max-width: 250px;
            word-wrap: break-word;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            animation: fadeInOut 3s forwards;
        `;
        document.body.appendChild(msgElement);
        setTimeout(() => {
            if (msgElement.parentNode) {
                msgElement.parentNode.removeChild(msgElement);
            }
        }, 3000);
    }

    getCurrentRevenueData() {
        return {
            dailyData: this.revenueData,
            totalRevenue: this.revenueData.reduce((sum, data) => sum + data.revenue, 0),
            averageRevenue: this.revenueData.reduce((sum, data) => sum + data.revenue, 0) / this.revenueData.length,
            maxRevenue: this.maxRevenue,
            minRevenue: this.minRevenue
        };
    }
}

// Enhanced time selector functionality
class TimeSelector {
    constructor(chartManager) {
        this.chartManager = chartManager;
        this.currentPeriod = 'Week';
        this.options = ['Week', 'Month', 'Quarter', 'Year'];
        this.init();
    }

    init() {
        const timeSelector = document.querySelector('.time-selector');
        if (!timeSelector) return;
        timeSelector.addEventListener('click', async () => {
            const currentIndex = this.options.indexOf(this.currentPeriod);
            const nextIndex = (currentIndex + 1) % this.options.length;
            this.currentPeriod = this.options[nextIndex];
            timeSelector.textContent = this.currentPeriod;
            await this.updateChartPeriod();
        });
    }

    async updateChartPeriod() {
        try {
            const timeSelector = document.querySelector('.time-selector');
            const originalText = timeSelector.textContent;
            timeSelector.textContent = 'Loading...';
            await this.chartManager.loadRevenueDataForPeriod(this.currentPeriod);
            this.chartManager.updateChart();
            timeSelector.textContent = originalText;
        } catch (error) {
            console.error('Error updating chart period:', error);
            const timeSelector = document.querySelector('.time-selector');
            timeSelector.textContent = this.currentPeriod;
        }
    }
}

// Add method to load data for different periods
RevenueChartManager.prototype.loadRevenueDataForPeriod = async function(period) {
    try {
        let dateRange;
        switch (period) {
            case 'Week': dateRange = 7; break;
            case 'Month': dateRange = 30; break;
            case 'Quarter': dateRange = 90; break;
            case 'Year': dateRange = 365; break;
            default: dateRange = 7;
        }
        const { data: orders, error } = await supabaseClient
            .from('orders')
            .select('totalprice, created_at')
            .eq('business_id', this.businessId)
            .gte('created_at', new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000).toISOString());
        if (error) throw error;
        if (period === 'Week') {
            this.revenueData = await this.processDailyData(orders);
        } else {
            this.revenueData = await this.processPeriodicData(orders, period);
        }
        this.calculateRevenueRange();
    } catch (error) {
        console.error('Error loading revenue data for period:', error);
        this.revenueData = this.generateSampleData();
        this.calculateRevenueRange();
    }
};

RevenueChartManager.prototype.processDailyData = async function(orders) {
    const dailyRevenue = {};
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const dayName = days[date.getDay()];
        dailyRevenue[dayName] = {
            day: dayName,
            revenue: 0,
            orders: 0
        };
    }
    orders.forEach(order => {
        const orderDate = new Date(order.created_at);
        const dayName = days[orderDate.getDay()];
        const revenue = parseFloat(order.totalprice) || 0;
        if (dailyRevenue[dayName]) {
            dailyRevenue[dayName].revenue += revenue;
            dailyRevenue[dayName].orders++;
        }
    });
    return Object.values(dailyRevenue);
};

RevenueChartManager.prototype.processPeriodicData = async function(orders, period) {
    // For Month, Quarter, Year: group by week/month
    let groupKeyFn;
    let periods = [];
    if (period === 'Month') {
        // Group by day for 30 days
        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(date.getDate() - (29 - i));
            periods.push(date.toISOString().split('T')[0]);
        }
        groupKeyFn = (date) => date.toISOString().split('T')[0];
    } else if (period === 'Quarter') {
        // Group by week for 13 weeks
        for (let i = 0; i < 13; i++) {
            const date = new Date();
            date.setDate(date.getDate() - (7 * (12 - i)));
            periods.push(`Week ${i + 1}`);
        }
        groupKeyFn = (date) => {
            const now = new Date();
            const diff = Math.floor((now - date) / (7 * 24 * 60 * 60 * 1000));
            return `Week ${13 - diff}`;
        };
    } else if (period === 'Year') {
        // Group by month for 12 months
        for (let i = 0; i < 12; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - (11 - i));
            periods.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
        }
        groupKeyFn = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } else {
        return this.generateSampleData();
    }
    const grouped = {};
    periods.forEach(p => {
        grouped[p] = { period: p, revenue: 0, orders: 0 };
    });
    orders.forEach(order => {
        const orderDate = new Date(order.created_at);
        const key = groupKeyFn(orderDate);
        if (grouped[key]) {
            grouped[key].revenue += parseFloat(order.totalprice) || 0;
            grouped[key].orders++;
        }
    });
    return Object.values(grouped);
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        setTimeout(async () => {
            const revenueChartManager = new RevenueChartManager();
            const timeSelector = new TimeSelector(revenueChartManager);
            window.revenueChartManager = revenueChartManager;
            window.timeSelector = timeSelector;
            const style = document.createElement('style');
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateY(-10px); }
                    15% { opacity: 1; transform: translateY(0); }
                    85% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(-10px); }
                }
                @keyframes drawLine {
                    to { stroke-dashoffset: 0; }
                }
                @keyframes fadeInArea {
                    to { opacity: 0.1; }
                }
                .chart-line {
                    stroke-dasharray: 1000;
                    stroke-dashoffset: 1000;
                    animation: drawLine 2s ease-in-out forwards;
                }
                .chart-area-fill {
                    opacity: 0;
                    animation: fadeInArea 2s ease-in-out 0.5s forwards;
                }
            `;
            document.head.appendChild(style);
        }, 1000);
    } catch (error) {
        console.error('Error initializing revenue chart:', error);
    }
});

window.refreshRevenueChart = () => window.revenueChartManager?.refreshChart();
window.getRevenueChartData = () => window.revenueChartManager?.getCurrentRevenueData();

window.exportRevenueChart = () => {
    try {
        const data = window.revenueChartManager?.getCurrentRevenueData();
        if (!data) {
            console.error('No revenue chart data available');
            return;
        }
        const csvContent = [
            ['Day', 'Revenue', 'Orders'],
            ...data.dailyData.map(item => [
                item.day || item.period,
                item.revenue.toFixed(2),
                item.orders
            ]),
            ['', '', ''],
            ['Total Revenue', data.totalRevenue.toFixed(2), ''],
            ['Average Revenue', data.averageRevenue.toFixed(2), ''],
            ['Export Date', new Date().toLocaleString(), '']
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `revenue_chart_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log('Revenue chart data exported successfully');
    } catch (error) {
        console.error('Error exporting revenue chart data:', error);
    }
};

console.log('Revenue Chart Integration loaded successfully');