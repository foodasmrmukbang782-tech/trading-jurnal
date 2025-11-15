// Trading Journal Application - Integrated with Google Apps Script
class TradingJournal {
    constructor() {
        this.trades = [];
        this.equityChart = null;
        this.winLossChart = null;
        this.deleteTradeId = null;
        
        // ✅ URL APPS SCRIPT
        this.APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwMUQkD9x_gSMrMFbwZcZn4iaK9YUKo7oU6rJliRkKVDppBFawkmqzgAJi43UAIxVhE/exec';
        
        this.init();
    }
    
    async init() {
        try {
            await this.loadTradesFromSheet();
            this.setupEventListeners();
            this.showSection('home');
            this.updateAllViews();
            this.setCurrentDates();
        } catch (error) {
            console.error('Init error:', error);
        }
    }

    // ✅ FIX: SEMUA METHOD HARUS ARROW FUNCTIONS ATAU BIND
    setupEventListeners = () => {
        // Navigation
        document.getElementById('home-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showSection('home');
        });
        document.getElementById('entry-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showSection('entry');
        });
        document.getElementById('trades-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showSection('trades');
        });
        document.getElementById('report-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showSection('report');
        });
        
        // Form submission
        const tradeForm = document.getElementById('trade-form');
        if (tradeForm) {
            tradeForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
        
        // Stock code uppercase
        const stockCodeInput = document.getElementById('stock-code');
        if (stockCodeInput) {
            stockCodeInput.addEventListener('input', function() {
                this.value = this.value.toUpperCase();
            });
        }
        
        // Modal close buttons
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => this.closeModals());
        });
        
        // Delete confirmation
        document.getElementById('confirm-delete')?.addEventListener('click', () => this.confirmDelete());
        document.getElementById('cancel-delete')?.addEventListener('click', () => this.closeModals());
        
        // Navigation links in sections
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = e.target.getAttribute('data-target');
                this.showSection(target);
            });
        });
        
        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });
    }

    // ✅ LOAD DATA DENGAN JSONP APPROACH (NO CORS)
    loadTradesFromSheet = () => {
        return new Promise((resolve, reject) => {
            console.log('🔄 Loading data via JSONP...');
            
            // Create unique callback name
            const callbackName = 'jsonp_callback_' + Date.now();
            
            // Create script element
            const script = document.createElement('script');
            script.src = `${this.APPS_SCRIPT_URL}?callback=${callbackName}`;
            
            // Define callback function
            window[callbackName] = (data) => {
                // Clean up
                delete window[callbackName];
                document.body.removeChild(script);
                
                console.log('📊 JSONP Response:', data);
                
                if (data.status === 'success') {
                    this.trades = data.data.map(trade => ({
                        id: trade.id,
                        entryDate: trade.entryDate,
                        exitDate: trade.exitDate,
                        stockCode: trade.stockCode,
                        entryPrice: parseFloat(trade.entryPrice),
                        exitPrice: parseFloat(trade.exitPrice),
                        lot: parseInt(trade.lot),
                        fee: parseFloat(trade.fee),
                        strategy: trade.strategy,
                        notes: trade.notes,
                        netPL: parseFloat(trade.netPL),
                        isWin: trade.isWin === 'WIN',
                        date: trade.entryDate
                    }));
                    
                    console.log(`✅ Successfully loaded ${this.trades.length} trades via JSONP`);
                    resolve(this.trades);
                } else {
                    reject(new Error(data.message || 'Unknown error'));
                }
            };
            
            // Error handling
            script.onerror = () => {
                delete window[callbackName];
                document.body.removeChild(script);
                console.log('❌ JSONP failed, using localStorage');
                this.trades = JSON.parse(localStorage.getItem('trades')) || [];
                resolve(this.trades);
            };
            
            // Add script to document
            document.body.appendChild(script);
            
            // Timeout fallback
            setTimeout(() => {
                if (window[callbackName]) {
                    delete window[callbackName];
                    document.body.removeChild(script);
                    console.log('❌ JSONP timeout, using localStorage');
                    this.trades = JSON.parse(localStorage.getItem('trades')) || [];
                    resolve(this.trades);
                }
            }, 10000);
        });
    }

    // ✅ FIX: SHOW SECTION METHOD
    showSection = (sectionId) => {
        console.log('Showing section:', sectionId);
        
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Update navigation
        document.querySelectorAll('nav a').forEach(link => {
            link.classList.remove('active');
        });
        
        const targetLink = document.getElementById(`${sectionId}-link`);
        if (targetLink) {
            targetLink.classList.add('active');
        }
    }

    // ✅ HANDLE FORM SUBMIT
    handleFormSubmit = async (e) => {
        e.preventDefault();
        
        // Get form elements
        const formElements = {
            entryDate: document.getElementById('entry-date'),
            exitDate: document.getElementById('exit-date'),
            stockCode: document.getElementById('stock-code'),
            entryPrice: document.getElementById('entry-price'),
            exitPrice: document.getElementById('exit-price'),
            lot: document.getElementById('lot'),
            strategy: document.getElementById('strategy')
        };
        
        // Validation
        let isValid = true;
        let errorMessage = '';
        
        // Reset borders
        Object.values(formElements).forEach(element => {
            if (element) element.style.borderColor = '#ddd';
        });
        
        // Validate required fields
        for (const [key, element] of Object.entries(formElements)) {
            if (!element || !element.value) {
                isValid = false;
                if (element) element.style.borderColor = 'red';
                errorMessage += `${this.getFieldName(key)} harus diisi!\n`;
            }
        }
        
        if (!isValid) {
            alert('Harap perbaiki kesalahan berikut:\n\n' + errorMessage);
            return;
        }
        
        // Prepare data
        const tradeData = {
            entryDate: formElements.entryDate.value,
            exitDate: formElements.exitDate.value,
            stockCode: formElements.stockCode.value,
            entryPrice: parseFloat(formElements.entryPrice.value),
            exitPrice: parseFloat(formElements.exitPrice.value),
            lot: parseInt(formElements.lot.value),
            strategy: formElements.strategy.value,
            notes: document.getElementById('notes') ? document.getElementById('notes').value : ''
        };
        
        await this.saveTrade(tradeData);
    }

    getFieldName = (key) => {
        const names = {
            entryDate: 'Tanggal Entry',
            exitDate: 'Tanggal Exit', 
            stockCode: 'Kode Saham',
            entryPrice: 'Harga Entry',
            exitPrice: 'Harga Exit',
            lot: 'Jumlah Lot',
            strategy: 'Strategi'
        };
        return names[key] || key;
    }

    // ✅ SAVE TRADE - SIMPLE FALLBACK KE LOCALSTORAGE
    saveTrade = async (tradeData) => {
        try {
            // Untuk sekarang, simpan ke localStorage dulu
            // Nanti bisa implement JSONP untuk POST juga
            const fallbackTrade = {
                id: Date.now().toString(),
                ...tradeData,
                fee: 0.4026,
                netPL: this.calculatePL(tradeData.entryPrice, tradeData.exitPrice, tradeData.lot),
                isWin: this.calculatePL(tradeData.entryPrice, tradeData.exitPrice, tradeData.lot) > 0,
                date: tradeData.entryDate
            };
            
            this.trades.push(fallbackTrade);
            localStorage.setItem('trades', JSON.stringify(this.trades));
            this.showSuccess('Trade disimpan lokal!');
            this.resetForm();
            this.updateAllViews();
            
        } catch (error) {
            console.error('Error saving trade:', error);
            alert('Error menyimpan trade');
        }
    }

    // ✅ DELETE TRADE
    deleteTrade = async (id) => {
        if (!id) return false;
        
        this.trades = this.trades.filter(trade => trade.id !== id);
        localStorage.setItem('trades', JSON.stringify(this.trades));
        this.showSuccess('Trade dihapus!');
        this.updateAllViews();
        this.closeModals();
        
        return true;
    }

    // ✅ REFRESH FROM SHEET
    refreshFromSheet = async () => {
        await this.loadTradesFromSheet();
        this.updateAllViews();
        this.showSuccess('Data berhasil di-refresh!');
    }

    // ✅ UTILITY METHODS
    showSuccess = (message) => {
        alert('✅ ' + message);
    }

    resetForm = () => {
        const form = document.getElementById('trade-form');
        if (form) form.reset();
        this.setCurrentDates();
    }

    setCurrentDates = () => {
        const today = this.getCurrentDate();
        
        const entryDateEl = document.getElementById('entry-date');
        const exitDateEl = document.getElementById('exit-date');
        
        if (entryDateEl) entryDateEl.value = today;
        if (exitDateEl) exitDateEl.value = today;
        
        // Set report date
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const reportDate = new Date().toLocaleDateString('id-ID', options);
        
        const reportDateEl = document.getElementById('report-date');
        if (reportDateEl) {
            reportDateEl.textContent = reportDate;
        }
    }

    getCurrentDate = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    calculatePL = (entryPrice, exitPrice, lot, fee = 0.004026) => {
        const shares = lot * 100;
        const grossPL = (exitPrice - entryPrice) * shares;
        const totalFee = (entryPrice + exitPrice) * shares * fee;
        return grossPL - totalFee;
    }

    updateAllViews = () => {
        this.updateHomeView();
        this.updateTradesView();
        this.updateReportView();
    }

    updateHomeView = () => {
        const totalTransactions = this.trades.length;
        const winTrades = this.trades.filter(trade => trade.isWin).length;
        const winRate = totalTransactions > 0 ? (winTrades / totalTransactions * 100).toFixed(1) : 0;
        
        const today = this.getCurrentDate();
        const todayTrades = this.trades.filter(trade => trade.date === today);
        const dailyPL = todayTrades.reduce((sum, trade) => sum + trade.netPL, 0);
        const totalPL = this.trades.reduce((sum, trade) => sum + trade.netPL, 0);
        
        // Update stats
        if (document.getElementById('total-transactions')) {
            document.getElementById('total-transactions').textContent = totalTransactions;
        }
        if (document.getElementById('win-rate')) {
            document.getElementById('win-rate').textContent = `${winRate}%`;
        }
        
        const dailyPlElement = document.getElementById('daily-pl');
        if (dailyPlElement) {
            dailyPlElement.textContent = this.formatCurrency(dailyPL);
            dailyPlElement.className = '';
            dailyPlElement.classList.add(this.getPlColorClass(dailyPL));
        }

        const totalPlElement = document.getElementById('total-pl');
        if (totalPlElement) {
            totalPlElement.textContent = this.formatCurrency(totalPL);
            totalPlElement.className = '';
            totalPlElement.classList.add(this.getPlColorClass(totalPL));
        }
        
        // Update charts
        this.updateEquityChart();
        this.updateWinLossChart();
        this.updateStrategyPerformance();
    }

    updateTradesView = () => {
        const tradesList = document.getElementById('trades-list');
        const tradesCount = document.getElementById('trades-count');
        
        if (!tradesList || !tradesCount) return;
        
        tradesCount.textContent = `${this.trades.length} transaksi tercatat`;
        
        if (this.trades.length === 0) {
            tradesList.innerHTML = '<p>Belum ada transaksi yang dicatat.</p>';
            return;
        }
        
        // Sort trades by date (newest first)
        const sortedTrades = [...this.trades].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        let html = '';
        sortedTrades.forEach(trade => {
            const entryDate = new Date(trade.entryDate).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            
            const exitDate = new Date(trade.exitDate).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short', 
                year: 'numeric'
            });
            
            const plClass = trade.netPL >= 0 ? 'positive' : 'negative';
            const plSign = trade.netPL >= 0 ? '+' : '';
            const plPercentage = ((trade.netPL / (trade.entryPrice * trade.lot * 100)) * 100).toFixed(2);
            
            html += `
                <div class="trade-item">
                    <button class="delete-btn" data-id="${trade.id}" title="Hapus transaksi">🗑️</button>
                    <div class="trade-header">
                        <span class="stock-code">${trade.stockCode}</span>
                    </div>
                    <div class="trade-details">
                        <div class="trade-detail">
                            <span>Strategi:</span> ${trade.strategy}
                        </div>
                        <div class="trade-detail">
                            <span>Tanggal Entry:</span> ${entryDate}
                        </div>
                        <div class="trade-detail">
                            <span>Tanggal Exit:</span> ${exitDate}
                        </div>
                        <div class="trade-detail">
                            <span>Harga Entry:</span> ${this.formatCurrency(trade.entryPrice)}
                        </div>
                        <div class="trade-detail">
                            <span>Harga Exit:</span> ${this.formatCurrency(trade.exitPrice)}
                        </div>
                        <div class="trade-detail">
                            <span>Lot:</span> ${trade.lot}
                        </div>
                        <div class="trade-detail">
                            <span>Status:</span> <span class="${trade.isWin ? 'win' : 'loss'}">${trade.isWin ? 'WIN' : 'LOSS'}</span>
                        </div>
                    </div>
                    <div class="trade-pl ${plClass}">
                        ${plSign}${this.formatCurrency(trade.netPL)} (${plSign}${plPercentage}%)
                    </div>
                </div>
            `;
        });
        
        tradesList.innerHTML = html;
        
        // Add event listeners to delete buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.deleteTradeId = e.target.getAttribute('data-id');
                this.showDeleteModal();
            });
        });
    }

    updateReportView = () => {
        const today = this.getCurrentDate();
        const todayTrades = this.trades.filter(trade => trade.date === today);
        
        const winTrades = todayTrades.filter(trade => trade.isWin).length;
        const winRate = todayTrades.length > 0 ? (winTrades / todayTrades.length * 100).toFixed(1) : 0;
        const dailyPL = todayTrades.reduce((sum, trade) => sum + trade.netPL, 0);
        
        // Update stats
        const dailyWinRateEl = document.getElementById('daily-win-rate');
        const dailyPlTotalEl = document.getElementById('daily-pl-total');
        
        if (dailyWinRateEl) dailyWinRateEl.textContent = `${winRate}%`;
        if (dailyPlTotalEl) {
            dailyPlTotalEl.textContent = this.formatCurrency(dailyPL);
            dailyPlTotalEl.className = '';
            dailyPlTotalEl.classList.add(this.getPlColorClass(dailyPL));
        }
        
        // Update table
        const tableBody = document.getElementById('report-table-body');
        if (!tableBody) return;
        
        if (todayTrades.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Tidak ada transaksi hari ini</td></tr>';
            return;
        }
        
        let html = '';
        todayTrades.forEach(trade => {
            const plClass = this.getPlColorClass(trade.netPL);
            const plSign = trade.netPL >= 0 ? '+' : '';
            
            html += `
                <tr>
                    <td>${trade.stockCode}</td>
                    <td>${trade.strategy}</td>
                    <td>${this.formatCurrency(trade.entryPrice)}</td>
                    <td>${this.formatCurrency(trade.exitPrice)}</td>
                    <td>${trade.lot}</td>
                    <td class="${plClass}">${plSign}${this.formatCurrency(trade.netPL)}</td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
    }

    showDeleteModal = () => {
        const modal = document.getElementById('delete-modal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    closeModals = () => {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        this.deleteTradeId = null;
    }

    confirmDelete = () => {
        if (this.deleteTradeId) {
            this.deleteTrade(this.deleteTradeId);
        }
    }

    formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    }

    getPlColorClass = (amount) => {
        if (amount > 0) {
            return 'pl-positive';
        } else if (amount < 0) {
            return 'pl-negative';
        } else {
            return 'pl-zero';
        }
    }

    // Chart methods
    updateEquityChart = () => {
        const ctx = document.getElementById('equity-chart');
        if (!ctx) return;
        
        if (this.equityChart) {
            this.equityChart.destroy();
        }
        
        const sortedTrades = [...this.trades].sort((a, b) => new Date(a.date) - new Date(b.date));
        let cumulativePL = 0;
        const equityData = [];
        const labels = [];
        
        sortedTrades.forEach(trade => {
            cumulativePL += trade.netPL;
            equityData.push(cumulativePL);
            labels.push(new Date(trade.date).toLocaleDateString('id-ID'));
        });
        
        if (sortedTrades.length === 0) {
            equityData.push(0);
            labels.push(this.getCurrentDate());
        }
        
        this.equityChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Equity',
                    data: equityData,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return new Intl.NumberFormat('id-ID', {
                                    style: 'currency',
                                    currency: 'IDR',
                                    minimumFractionDigits: 0
                                }).format(value);
                            }
                        }
                    }
                }
            }
        });
    }

    updateWinLossChart = () => {
        const ctx = document.getElementById('win-loss-chart');
        if (!ctx) return;
        
        if (this.winLossChart) {
            this.winLossChart.destroy();
        }
        
        const winCount = this.trades.filter(trade => trade.isWin).length;
        const lossCount = this.trades.filter(trade => !trade.isWin).length;
        
        this.winLossChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Wins', 'Losses'],
                datasets: [{
                    data: [winCount, lossCount],
                    backgroundColor: ['#2ecc71', '#e74c3c'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    updateStrategyPerformance = () => {
        const strategyList = document.getElementById('strategy-list');
        if (!strategyList) return;
        
        if (this.trades.length === 0) {
            strategyList.innerHTML = '<p>Belum ada data transaksi</p>';
            return;
        }
        
        const strategyStats = {};
        
        this.trades.forEach(trade => {
            if (!strategyStats[trade.strategy]) {
                strategyStats[trade.strategy] = {
                    count: 0,
                    wins: 0
                };
            }
            
            strategyStats[trade.strategy].count++;
            if (trade.isWin) {
                strategyStats[trade.strategy].wins++;
            }
        });
        
        let html = '';
        for (const [strategy, stats] of Object.entries(strategyStats)) {
            const winRate = stats.count > 0 ? (stats.wins / stats.count * 100).toFixed(1) : 0;
            html += `
                <div class="strategy-item">
                    <strong>${strategy}</strong>
                    <p>${stats.count} transaksi + Win rate: ${winRate}%</p>
                </div>
            `;
        }
        
        strategyList.innerHTML = html;
    }
}

// Initialize application
let tradingJournal;

document.addEventListener('DOMContentLoaded', () => {
    tradingJournal = new TradingJournal();
});
