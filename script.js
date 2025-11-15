// Trading Journal Application - Integrated with Google Apps Script & Multiple CORS Proxies
class TradingJournal {
    constructor() {
        this.trades = [];
        this.equityChart = null;
        this.winLossChart = null;
        this.deleteTradeId = null;
        
        // ✅ MULTIPLE CORS PROXY OPTIONS
        this.APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxEnqGlnDILMxBloY5sRRCwYJJ1V4m2AgRJW6WReQ5wXHwx8Uk5QDTeZG1iZlCdPI0Z/exec';
        this.CORS_PROXIES = [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://api.codetabs.com/v1/proxy?quest=',
            'https://thingproxy.freeboard.io/fetch/'
        ];
        
        this.init();
    }
    
    async init() {
        await this.loadTradesFromSheet();
        this.setupEventListeners();
        this.showSection('home');
        this.updateAllViews();
        this.setCurrentDates();
    }

    // ✅ LOAD DATA DENGAN MULTIPLE PROXY FALLBACK
    loadTradesFromSheet = async () => {
        // Coba setiap proxy sampai yang berhasil
        for (let proxy of this.CORS_PROXIES) {
            try {
                console.log(`🔄 Trying proxy: ${proxy}`);
                
                const proxyUrl = proxy + encodeURIComponent(this.APPS_SCRIPT_URL);
                const response = await fetch(proxyUrl, {
                    timeout: 10000
                });
                
                if (!response.ok) {
                    console.log(`❌ Proxy ${proxy} failed with status: ${response.status}`);
                    continue;
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
                    
                    console.log(`✅ Successfully loaded ${this.trades.length} trades via ${proxy}`);
                    this.updateDashboard();
                    this.renderTrades();
                    this.updateReport();
                    return;
                }
            } catch (error) {
                console.log(`❌ Proxy ${proxy} failed:`, error.message);
                continue;
            }
        }
        
        // Jika semua proxy gagal, coba direct access
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

    // ✅ SAVE TRADE DENGAN MULTIPLE PROXY FALLBACK
    saveTrade = async (tradeData) => {
        // Coba setiap proxy untuk POST
        for (let proxy of this.CORS_PROXIES) {
            try {
                console.log(`💾 Trying save via proxy: ${proxy}`);
                
                const proxyUrl = proxy + encodeURIComponent(this.APPS_SCRIPT_URL);
                const response = await fetch(proxyUrl, {
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
                    console.log('✅ Trade saved successfully via proxy');
                    this.showSuccess('Trade berhasil disimpan! ID: ' + result.id);
                    this.resetForm();
                    
                    // Refresh data setelah save
                    setTimeout(() => {
                        this.loadTradesFromSheet();
                    }, 1000);
                    
                    return true;
                }
            } catch (error) {
                console.log(`❌ Save via proxy ${proxy} failed:`, error.message);
                continue;
            }
        }
        
        // Jika semua proxy gagal, coba direct POST
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

    // ✅ DELETE TRADE DENGAN MULTIPLE PROXY FALLBACK
    deleteTrade = async (id) => {
        if (!id) {
            throw new Error('ID trade tidak valid');
        }
        
        // Coba setiap proxy untuk DELETE
        for (let proxy of this.CORS_PROXIES) {
            try {
                console.log(`🗑️ Trying delete via proxy: ${proxy}`);
                
                const proxyUrl = proxy + encodeURIComponent(this.APPS_SCRIPT_URL);
                const response = await fetch(proxyUrl, {
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
                    console.log('✅ Trade deleted successfully via proxy');
                    this.showSuccess('Trade berhasil dihapus!');
                    
                    // Refresh data setelah delete
                    setTimeout(() => {
                        this.loadTradesFromSheet();
                        this.closeModals();
                    }, 500);
                    
                    return true;
                }
            } catch (error) {
                console.log(`❌ Delete via proxy ${proxy} failed:`, error.message);
                continue;
            }
        }
        
        // Jika semua proxy gagal, coba direct DELETE
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

    // ... (sisanya sama dengan code sebelumnya - setupEventListeners, showSection, handleFormSubmit, dll.)
    // PASTIKAN SEMUA METHOD LAIN TETAP ADA

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

    async handleFormSubmit(e) {
        e.preventDefault();
        
        // Get form elements dengan validasi
        const formElements = {
            entryDate: document.getElementById('entry-date'),
            exitDate: document.getElementById('exit-date'),
            stockCode: document.getElementById('stock-code'),
            entryPrice: document.getElementById('entry-price'),
            exitPrice: document.getElementById('exit-price'),
            lot: document.getElementById('lot'),
            strategy: document.getElementById('strategy')
        };
        
        // Validasi
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

    getFieldName(key) {
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

    // ... (semua method lainnya tetap sama: showSuccess, resetForm, setCurrentDates, updateAllViews, dll.)

    showSuccess(message) {
        alert('✅ ' + message);
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

    calculatePL = (entryPrice, exitPrice, lot, fee = 0.004026) => {
        const shares = lot * 100;
        const grossPL = (exitPrice - entryPrice) * shares;
        const totalFee = (entryPrice + exitPrice) * shares * fee;
        return grossPL - totalFee;
    }

    // ... (semua method view update: updateAllViews, updateHomeView, updateTradesView, dll.)

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
        
        // Update stats
        document.getElementById('total-transactions').textContent = totalTransactions;
        document.getElementById('win-rate').textContent = `${winRate}%`;
        
        const dailyPlElement = document.getElementById('daily-pl');
        dailyPlElement.textContent = this.formatCurrency(dailyPL);
        dailyPlElement.className = '';
        dailyPlElement.classList.add(this.getPlColorClass(dailyPL));

        const totalPlElement = document.getElementById('total-pl');
        totalPlElement.textContent = this.formatCurrency(totalPL);
        totalPlElement.className = '';
        totalPlElement.classList.add(this.getPlColorClass(totalPL));
        
        // Update charts
        this.updateEquityChart();
        this.updateWinLossChart();
        this.updateStrategyPerformance();
    }

    // ... (lanjutkan dengan semua method lainnya yang sudah ada)
    // PASTIKAN SEMUA METHOD DARI CODE SEBELUMNYA ADA DI SINI

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

    async refreshFromSheet() {
        await this.loadTradesFromSheet();
        this.updateAllViews();
        this.showSuccess('Data berhasil di-refresh dari Google Sheets!');
    }
}

// Initialize application
let tradingJournal;

document.addEventListener('DOMContentLoaded', () => {
    tradingJournal = new TradingJournal();
});


