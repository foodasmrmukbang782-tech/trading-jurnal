// Trading Journal Application - Integrated with Google Apps Script & CORS Proxy
class TradingJournal {
    constructor() {
        this.trades = [];
        this.equityChart = null;
        this.winLossChart = null;
        this.deleteTradeId = null;
        
        // ✅ GUNAKAN CORS PROXY
        this.APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwMUQkD9x_gSMrMFbwZcZn4iaK9YUKo7oU6rJliRkKVDppBFawkmqzgAJi43UAIxVhE/exec';
        this.CORS_PROXY = 'https://cors-anywhere.herokuapp.com/'; // Free CORS proxy
        
        this.init();
    }
    
    async init() {
        await this.loadTradesFromSheet();
        this.setupEventListeners();
        this.showSection('home');
        this.updateAllViews();
        this.setCurrentDates();
    }
    
    setupEventListeners() {
        // Navigation
        document.getElementById('home-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSection('home');
        });
        document.getElementById('entry-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSection('entry');
        });
        document.getElementById('trades-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSection('trades');
        });
        document.getElementById('report-link').addEventListener('click', (e) => {
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
        document.getElementById('confirm-delete').addEventListener('click', () => this.confirmDelete());
        document.getElementById('cancel-delete').addEventListener('click', () => this.closeModals());
        
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
    
    // ✅ LOAD DATA DENGAN CORS PROXY
    loadTradesFromSheet = async () => {
        try {
            console.log('🔄 Loading data via CORS proxy...');
            
            const proxyUrl = this.CORS_PROXY + this.APPS_SCRIPT_URL;
            const response = await fetch(proxyUrl, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.status === 'success') {
                this.trades = result.data.map(trade => ({
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
                
                console.log(`✅ Successfully loaded ${this.trades.length} trades via proxy`);
                this.updateDashboard();
                this.renderTrades();
                this.updateReport();
                
            } else {
                throw new Error(result.message);
            }
            
        } catch (error) {
            console.error('❌ Error loading via proxy:', error);
            
            // Fallback: coba direct access
            try {
                console.log('🔄 Trying direct access...');
                const response = await fetch(this.APPS_SCRIPT_URL);
                const result = await response.json();
                
                if (result.status === 'success') {
                    this.trades = result.data.map(trade => ({
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
                    
                    console.log(`✅ Successfully loaded ${this.trades.length} trades directly`);
                    this.updateDashboard();
                    this.renderTrades();
                    this.updateReport();
                    return;
                }
            } catch (directError) {
                console.log('❌ Direct access also failed');
            }
            
            // Final fallback ke localStorage
            this.trades = JSON.parse(localStorage.getItem('trades')) || [];
            console.log('📦 Using localStorage as final fallback');
        }
    }
    
    showSection(sectionId) {
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
        
        // Update section-specific content
        if (sectionId === 'home') {
            this.updateHomeView();
        } else if (sectionId === 'trades') {
            this.updateTradesView();
        } else if (sectionId === 'report') {
            this.updateReportView();
        }
    }
    
    // ✅ HANDLE FORM SUBMIT DENGAN CORS PROXY
    async handleFormSubmit(e) {
        e.preventDefault();
        
        // Get form elements with null checks
        const formElements = {
            entryDate: document.getElementById('entry-date'),
            exitDate: document.getElementById('exit-date'),
            stockCode: document.getElementById('stock-code'),
            entryPrice: document.getElementById('entry-price'),
            exitPrice: document.getElementById('exit-price'),
            lot: document.getElementById('lot'),
            strategy: document.getElementById('strategy')
        };
        
        // Check if any element is null
        for (const [key, element] of Object.entries(formElements)) {
            if (!element) {
                alert(`Error: Element ${key} tidak ditemukan!`);
                return;
            }
        }
        
        // Basic validation
        let isValid = true;
        let errorMessage = '';
        
        // Reset all borders first
        Object.values(formElements).forEach(element => {
            if (element) element.style.borderColor = '#ddd';
        });
        
        // Validate required fields
        if (!formElements.entryDate.value) {
            isValid = false;
            formElements.entryDate.style.borderColor = 'red';
            errorMessage += 'Tanggal Entry harus diisi!\n';
        }
        
        if (!formElements.exitDate.value) {
            isValid = false;
            formElements.exitDate.style.borderColor = 'red';
            errorMessage += 'Tanggal Exit harus diisi!\n';
        }
        
        if (!formElements.stockCode.value) {
            isValid = false;
            formElements.stockCode.style.borderColor = 'red';
            errorMessage += 'Kode Saham harus diisi!\n';
        }
        
        if (!formElements.entryPrice.value) {
            isValid = false;
            formElements.entryPrice.style.borderColor = 'red';
            errorMessage += 'Harga Entry harus diisi!\n';
        }
        
        if (!formElements.exitPrice.value) {
            isValid = false;
            formElements.exitPrice.style.borderColor = 'red';
            errorMessage += 'Harga Exit harus diisi!\n';
        }
        
        if (!formElements.lot.value) {
            isValid = false;
            formElements.lot.style.borderColor = 'red';
            errorMessage += 'Jumlah Lot harus diisi!\n';
        }
        
        // Validate dates
        if (formElements.entryDate.value && formElements.exitDate.value) {
            const entryDate = new Date(formElements.entryDate.value);
            const exitDate = new Date(formElements.exitDate.value);
            
            if (exitDate < entryDate) {
                isValid = false;
                formElements.exitDate.style.borderColor = 'red';
                errorMessage += 'Tanggal Exit tidak boleh sebelum Tanggal Entry!\n';
            }
        }
        
        // Validate prices
        if (formElements.entryPrice.value && formElements.exitPrice.value) {
            const entryPrice = parseFloat(formElements.entryPrice.value);
            const exitPrice = parseFloat(formElements.exitPrice.value);
            
            if (entryPrice <= 0 || exitPrice <= 0) {
                isValid = false;
                errorMessage += 'Harga Entry dan Harga Exit harus lebih besar dari 0!\n';
            }
        }
        
        if (!isValid) {
            alert('Harap perbaiki kesalahan berikut:\n\n' + errorMessage);
            return;
        }
        
        // Prepare form data untuk Apps Script
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
        this.resetForm();
    }
    
    // ✅ SAVE TRADE DENGAN CORS PROXY
    saveTrade = async (tradeData) => {
        try {
            console.log('💾 Saving trade via CORS proxy...', tradeData);
            
            const proxyUrl = this.CORS_PROXY + this.APPS_SCRIPT_URL;
            const response = await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    action: 'ADD_TRADE',
                    data: tradeData
                })
            });
            
            const result = await response.json();
            console.log('💫 Save Response:', result);
            
            if (result.status === 'success') {
                console.log('✅ Trade saved successfully via proxy');
                this.showSuccess('Trade berhasil disimpan! ID: ' + result.id);
                this.resetForm();
                
                // Refresh data setelah save
                setTimeout(() => {
                    this.loadTradesFromSheet();
                }, 1000);
                
                return true;
            } else {
                throw new Error(result.message);
            }
            
        } catch (error) {
            console.error('❌ Error saving via proxy:', error);
            
            // Fallback: try direct POST
            try {
                console.log('🔄 Trying direct POST...');
                const response = await fetch(this.APPS_SCRIPT_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'ADD_TRADE',
                        data: tradeData
                    })
                });
                
                const result = await response.json();
                
                if (result.status === 'success') {
                    console.log('✅ Trade saved successfully directly');
                    this.showSuccess('Trade berhasil disimpan! ID: ' + result.id);
                    this.resetForm();
                    
                    setTimeout(() => {
                        this.loadTradesFromSheet();
                    }, 1000);
                    
                    return true;
                }
            } catch (directError) {
                console.log('❌ Direct POST also failed');
            }
            
            // Final fallback: simpan ke localStorage
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
            this.showSuccess('Trade disimpan lokal (offline mode)');
            this.updateAllViews();
            
            return false;
        }
    }
    
    // ✅ DELETE TRADE DENGAN CORS PROXY
    deleteTrade = async (id) => {
        try {
            console.log('🗑️ Deleting trade with ID:', id);
            
            if (!id) {
                throw new Error('ID trade tidak valid');
            }
            
            const proxyUrl = this.CORS_PROXY + this.APPS_SCRIPT_URL;
            const response = await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    action: 'DELETE_TRADE',
                    id: id
                })
            });
            
            const result = await response.json();
            console.log('🗑️ Delete Response:', result);
            
            if (result.status === 'success') {
                console.log('✅ Trade deleted successfully via proxy');
                this.showSuccess('Trade berhasil dihapus!');
                
                // Refresh data setelah delete
                setTimeout(() => {
                    this.loadTradesFromSheet();
                    this.closeModals();
                }, 500);
                
                return true;
            } else {
                throw new Error(result.message);
            }
            
        } catch (error) {
            console.error('❌ Error deleting via proxy:', error);
            
            // Fallback: try direct DELETE
            try {
                console.log('🔄 Trying direct DELETE...');
                const response = await fetch(this.APPS_SCRIPT_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'DELETE_TRADE',
                        id: id
                    })
                });
                
                const result = await response.json();
                
                if (result.status === 'success') {
                    console.log('✅ Trade deleted successfully directly');
                    this.showSuccess('Trade berhasil dihapus!');
                    
                    setTimeout(() => {
                        this.loadTradesFromSheet();
                        this.closeModals();
                    }, 500);
                    
                    return true;
                }
            } catch (directError) {
                console.log('❌ Direct DELETE also failed');
            }
            
            // Final fallback: hapus dari localStorage
            this.trades = this.trades.filter(trade => trade.id !== id);
            localStorage.setItem('trades', JSON.stringify(this.trades));
            this.updateAllViews();
            this.closeModals();
            this.showSuccess('Trade dihapus dari lokal (offline mode)');
            
            return false;
        }
    }
    
    // ✅ REFRESH FROM SHEET
    async refreshFromSheet() {
        await this.loadTradesFromSheet();
        this.updateAllViews();
        this.showSuccess('Data berhasil di-refresh dari Google Sheets!');
    }
    
    // ✅ CALCULATE P/L
    calculatePL = (entryPrice, exitPrice, lot, fee = 0.004026) => {
        const shares = lot * 100;
        const grossPL = (exitPrice - entryPrice) * shares;
        const totalFee = (entryPrice + exitPrice) * shares * fee;
        return grossPL - totalFee;
    }
    
    // ✅ SHOW SUCCESS MESSAGE
    showSuccess(message) {
        alert('✅ ' + message);
    }
    
    saveTrades() {
        localStorage.setItem('trades', JSON.stringify(this.trades));
    }
    
    resetForm() {
        const form = document.getElementById('trade-form');
        if (form) {
            form.reset();
        }
        this.setCurrentDates();
    }
    
    setCurrentDates() {
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
    
    getCurrentDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    updateAllViews() {
        this.updateHomeView();
        this.updateTradesView();
        this.updateReportView();
    }
    
    updateHomeView() {
        const totalTransactions = this.trades.length;
        const winTrades = this.trades.filter(trade => trade.isWin).length;
        const winRate = totalTransactions > 0 ? (winTrades / totalTransactions * 100).toFixed(1) : 0;
        
        const today = this.getCurrentDate();
        const todayTrades = this.trades.filter(trade => trade.date === today);
        const dailyPL = todayTrades.reduce((sum, trade) => sum + trade.netPL, 0);
        const totalPL = this.trades.reduce((sum, trade) => sum + trade.netPL, 0);
        
        // Update stats dengan warna berdasarkan profit/loss
        document.getElementById('total-transactions').textContent = totalTransactions;
        document.getElementById('win-rate').textContent = `${winRate}%`;
        
        // Update P/L Harian dengan warna
        const dailyPlElement = document.getElementById('daily-pl');
        dailyPlElement.textContent = this.formatCurrency(dailyPL);
        dailyPlElement.className = '';
        dailyPlElement.classList.add(this.getPlColorClass(dailyPL));

        // Update Total P/L dengan warna
        const totalPlElement = document.getElementById('total-pl');
        totalPlElement.textContent = this.formatCurrency(totalPL);
        totalPlElement.className = '';
        totalPlElement.classList.add(this.getPlColorClass(totalPL));
        
        // Update charts
        this.updateEquityChart();
        this.updateWinLossChart();
        this.updateStrategyPerformance();
    }
    
    updateElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }
    
    updateEquityChart() {
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
    
    updateWinLossChart() {
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
    
    updateStrategyPerformance() {
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
    
    updateTradesView() {
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
                        <span class="trade-id">ID: ${trade.id}</span>
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
    
    updateReportView() {
        const today = this.getCurrentDate();
        const todayTrades = this.trades.filter(trade => trade.date === today);
        
        const winTrades = todayTrades.filter(trade => trade.isWin).length;
        const winRate = todayTrades.length > 0 ? (winTrades / todayTrades.length * 100).toFixed(1) : 0;
        const dailyPL = todayTrades.reduce((sum, trade) => sum + trade.netPL, 0);
        
        // Update stats - HANYA win rate dan total P/L
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
    
    showSuccessModal() {
        const modal = document.getElementById('success-modal');
        if (modal) {
            modal.style.display = 'block';
            
            setTimeout(() => {
                this.closeModals();
            }, 2000);
        }
    }
    
    showDeleteModal() {
        const modal = document.getElementById('delete-modal');
        if (modal) {
            modal.style.display = 'block';
        }
    }
    
    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        this.deleteTradeId = null;
    }
    
    confirmDelete() {
        if (this.deleteTradeId) {
            this.deleteTrade(this.deleteTradeId);
        }
    }
    
    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    }
    
    getPlColorClass(amount) {
        if (amount > 0) {
            return 'pl-positive';
        } else if (amount < 0) {
            return 'pl-negative';
        } else {
            return 'pl-zero';
        }
    }
}

// Initialize application
let tradingJournal;

document.addEventListener('DOMContentLoaded', () => {
    tradingJournal = new TradingJournal();
});
