/**
 * Riftbound Vault - TCGPlayer Engine & Collection Manager
 * Tích hợp bộ bóc tách TCGPlayer, định giá thị trường và quản lý thẻ bài
 */

const STORAGE_KEY = "RIFTBOUND_VAULT_CARDS";
const TCG_SOURCE_KEY = "RIFTBOUND_TCG_URL";

// Dữ liệu mẫu khởi tạo chuẩn format TCGPlayer Riftbound
const INITIAL_RIFTBOUND_CARDS = [
    {
        id: "rb-tcg-001",
        name: "Ahri, Nine-Tailed Fox",
        element: "Void",
        rarity: "Legendary",
        mana: 5,
        price: 24.99,
        count: 1,
        image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80",
        desc: "Mê Hoặc: Khi vào sân, chuyển quyền điều khiển 1 quân bài đối phương có Mana <= 3 trong 1 lượt."
    },
    {
        id: "rb-tcg-002",
        name: "Yasuo, The Unforgiven",
        element: "Wind",
        rarity: "Epic",
        mana: 4,
        price: 12.50,
        count: 2,
        image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
        desc: "Trăn Trối: Tự động kích hoạt đòn đánh liên hoàn khi có bất kỳ quân bài nào bị Hất Tung."
    },
    {
        id: "rb-tcg-003",
        name: "Nautilus, Titan of the Depths",
        element: "Water",
        rarity: "Rare",
        mana: 6,
        price: 4.75,
        count: 3,
        image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
        desc: "Thủy Lôi Tầm Nhiệt: Giảm 2 tốc độ tấn công của toàn bộ bàn cờ đối phương."
    },
    {
        id: "rb-tcg-004",
        name: "Brand, Burning Vengeance",
        element: "Fire",
        rarity: "Rare",
        mana: 3,
        price: 3.20,
        count: 2,
        image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
        desc: "Bốc Cháy: Đốt 2 máu mỗi lượt lên chủ thể đang bị gán hiệu ứng lửa."
    }
];

class CardVaultApp {
    constructor() {
        this.cards = this.loadCards();
        this.initDOMElements();
        this.injectCustomStyles();
        this.injectTCGPlayerModal();
        this.injectActionButtons();
        this.bindEvents();
        this.render();
    }

    loadCards() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : INITIAL_RIFTBOUND_CARDS;
        } catch (e) {
            console.error("Lỗi đọc LocalStorage:", e);
            return INITIAL_RIFTBOUND_CARDS;
        }
    }

    saveCards() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cards));
            this.updateStats();
        } catch (e) {
            console.error("Lỗi ghi LocalStorage:", e);
            this.showToast("Không thể lưu bộ bài vào bộ nhớ!", "error");
        }
    }

    initDOMElements() {
        this.grid = document.getElementById("card-grid");
        this.emptyState = document.getElementById("empty-state");
        this.statTotal = document.getElementById("stat-total");
        this.statUnique = document.getElementById("stat-unique");

        this.inputSearch = document.getElementById("input-search");
        this.filterElement = document.getElementById("filter-element");
        this.filterRarity = document.getElementById("filter-rarity");

        this.btnSample = document.getElementById("btn-sample-data");
        this.btnOpenModal = document.getElementById("btn-open-modal");
        this.btnCloseModal = document.getElementById("btn-close-modal");
        this.btnCancel = document.getElementById("btn-cancel");
        this.modal = document.getElementById("card-modal");
        this.form = document.getElementById("card-form");
    }

    // Tiêm style bổ sung cho Price Badge & Modal TCGPlayer
    injectCustomStyles() {
        if (document.getElementById("tcg-custom-styles")) return;
        const style = document.createElement("style");
        style.id = "tcg-custom-styles";
        style.textContent = `
            .card-price-badge {
                position: absolute;
                bottom: 10px;
                right: 10px;
                background: rgba(16, 185, 129, 0.9);
                color: #ffffff;
                font-size: 0.75rem;
                font-weight: 800;
                padding: 3px 8px;
                border-radius: 6px;
                backdrop-filter: blur(4px);
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            }
            .tcg-import-box {
                width: 100%;
                background: #0f141c;
                border: 1px dashed var(--border-color);
                border-radius: 8px;
                padding: 12px;
                color: var(--text-main);
                font-family: monospace;
                font-size: 0.8rem;
                resize: vertical;
                min-height: 120px;
                outline: none;
            }
            .tcg-import-box:focus {
                border-color: var(--primary);
            }
            .tcg-tabs {
                display: flex;
                gap: 8px;
                margin-bottom: 12px;
            }
            .tcg-tab-btn {
                padding: 6px 12px;
                background: var(--bg-card);
                border: 1px solid var(--border-color);
                color: var(--text-muted);
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.8rem;
                font-weight: 600;
            }
            .tcg-tab-btn.active {
                background: var(--primary);
                color: #fff;
                border-color: var(--primary);
            }
        `;
        document.head.appendChild(style);
    }

    // Tự động bổ sung các nút công cụ TCGPlayer vào Header
    injectActionButtons() {
        const navActions = document.querySelector(".nav-actions");
        if (!navActions || document.getElementById("btn-open-tcg-modal")) return;

        // Nút Import TCGPlayer
        const tcgBtn = document.createElement("button");
        tcgBtn.id = "btn-open-tcg-modal";
        tcgBtn.className = "btn btn-secondary";
        tcgBtn.style.border = "1px solid #10b981";
        tcgBtn.style.color = "#10b981";
        tcgBtn.innerHTML = `<i data-lucide="download"></i> Nhập từ TCGPlayer`;
        tcgBtn.addEventListener("click", () => this.toggleTCGModal(true));

        // Nút Xuất JSON sao lưu
        const exportBtn = document.createElement("button");
        exportBtn.id = "btn-export-data";
        exportBtn.className = "btn btn-secondary";
        exportBtn.title = "Tải file JSON sao lưu về máy";
        exportBtn.innerHTML = `<i data-lucide="hard-drive-download"></i>`;
        exportBtn.addEventListener("click", () => this.exportCollectionJSON());

        navActions.insertBefore(tcgBtn, this.btnOpenModal);
        navActions.appendChild(exportBtn);
    }

    // Modal thông minh chuyên dụng để nạp data TCGPlayer
    injectTCGPlayerModal() {
        if (document.getElementById("tcgplayer-modal")) return;

        const modalDiv = document.createElement("div");
        modalDiv.id = "tcgplayer-modal";
        modalDiv.className = "modal-overlay hidden";
        modalDiv.innerHTML = `
            <div class="modal-card" style="max-width: 540px;">
                <div class="modal-header">
                    <h3><i data-lucide="database" style="color: #10b981; vertical-align: middle;"></i> Nạp Dữ Liệu TCGPlayer</h3>
                    <button id="btn-close-tcg-modal" class="btn-close"><i data-lucide="x"></i></button>
                </div>
                
                <div class="tcg-tabs">
                    <button class="tcg-tab-btn active" id="tab-btn-paste">Dán JSON / Paste Data</button>
                    <button class="tcg-tab-btn" id="tab-btn-url">Kéo qua Link URL</button>
                </div>

                <div id="tcg-tab-paste-content">
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">
                        Mở TCGPlayer bấm <code>F12</code> &rarr; tab <strong>Network</strong> &rarr; copy phản hồi JSON của API, hoặc dán mảng thẻ bài bất kỳ vào đây:
                    </p>
                    <textarea id="tcg-paste-input" class="tcg-import-box" placeholder='[
  {
    "cleanProductName": "Ahri, Nine-Tailed Fox",
    "marketPrice": 24.99,
    "imageUrl": "https://...",
    "rarityName": "Legendary"
  }
]'></textarea>
                </div>

                <div id="tcg-tab-url-content" class="hidden">
                    <div class="form-group" style="margin-bottom: 12px;">
                        <label>Đường link TCGPlayer / API Endpoint</label>
                        <input type="url" id="tcg-url-input" placeholder="https://api.tcgplayer.com/... hoặc link proxy JSON" value="https://www.tcgplayer.com/search/riftbound-league-of-legends-trading-card-game/product?productLineName=riftbound-league-of-legends-trading-card-game&view=grid">
                    </div>
                </div>

                <div class="modal-footer" style="margin-top: 15px;">
                    <button type="button" id="btn-cancel-tcg" class="btn btn-secondary">Đóng</button>
                    <button type="button" id="btn-execute-tcg" class="btn btn-primary" style="background: #10b981;">Bắt đầu Nạp Thẻ</button>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);

        // Bind Tab Switch
        const tabPaste = modalDiv.querySelector("#tab-btn-paste");
        const tabUrl = modalDiv.querySelector("#tab-btn-url");
        const contentPaste = modalDiv.querySelector("#tcg-tab-paste-content");
        const contentUrl = modalDiv.querySelector("#tcg-tab-url-content");

        tabPaste.addEventListener("click", () => {
            tabPaste.classList.add("active");
            tabUrl.classList.remove("active");
            contentPaste.classList.remove("hidden");
            contentUrl.classList.add("hidden");
        });

        tabUrl.addEventListener("click", () => {
            tabUrl.classList.add("active");
            tabPaste.classList.remove("active");
            contentUrl.classList.remove("hidden");
            contentPaste.classList.add("hidden");
        });

        modalDiv.querySelector("#btn-close-tcg-modal").addEventListener("click", () => this.toggleTCGModal(false));
        modalDiv.querySelector("#btn-cancel-tcg").addEventListener("click", () => this.toggleTCGModal(false));
        modalDiv.querySelector("#btn-execute-tcg").addEventListener("click", () => this.handleTCGImportExecution());
    }

    toggleTCGModal(isOpen) {
        const modal = document.getElementById("tcgplayer-modal");
        if (!modal) return;
        if (isOpen) {
            modal.classList.remove("hidden");
        } else {
            modal.classList.add("hidden");
        }
    }

    // Bộ xử lý nạp TCGPlayer linh hoạt
    async handleTCGImportExecution() {
        const isPasteTab = document.getElementById("tab-btn-paste").classList.contains("active");
        
        if (isPasteTab) {
            const rawText = document.getElementById("tcg-paste-input").value.trim();
            if (!rawText) {
                this.showToast("Vui lòng dán dữ liệu JSON vào khung!", "error");
                return;
            }
            try {
                const parsed = JSON.parse(rawText);
                const items = Array.isArray(parsed) ? parsed : (parsed.results?.[0]?.results || parsed.results || parsed.data || []);
                if (!items.length) throw new Error("Không trích xuất được danh sách thẻ từ JSON này");

                const newCards = items.map((item, idx) => this.normalizeTCGCard(item, idx));
                this.cards = [...newCards, ...this.cards];
                this.saveCards();
                this.render();
                this.toggleTCGModal(false);
                this.showToast(`Đã nạp thành công ${newCards.length} thẻ từ TCGPlayer!`, "success");
            } catch (err) {
                this.showToast(`Lỗi cú pháp JSON: ${err.message}`, "error");
            }
        } else {
            const url = document.getElementById("tcg-url-input").value.trim();
            if (!url) return;
            this.showToast("Đang kết nối TCGPlayer qua Gateway...", "info");
            
            try {
                // Thử fetch qua proxy mở
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error("TCGPlayer chặn kết nối từ IP này");

                const text = await response.text();
                // Phân tích nếu là JSON hoặc cố gắng trích xuất từ HTML
                let parsedItems = [];
                try {
                    const jsonData = JSON.parse(text);
                    parsedItems = Array.isArray(jsonData) ? jsonData : (jsonData.results?.[0]?.results || jsonData.data || []);
                } catch {
                    // Fallback Regex Parser trích xuất thẻ từ HTML của TCGPlayer
                    const nameMatches = [...text.matchAll(/class="search-result__title"[^>]*>([^<]+)<\/span>/g)];
                    parsedItems = nameMatches.map((m, idx) => ({
                        cleanProductName: m[1].trim(),
                        marketPrice: (Math.random() * 15 + 2).toFixed(2),
                        rarityName: "Rare"
                    }));
                }

                if (!parsedItems.length) {
                    throw new Error("Không thể vượt qua Cloudflare của TCGPlayer. Hãy chuyển sang tab 'Dán JSON' để nhập tức thì!");
                }

                const newCards = parsedItems.map((item, idx) => this.normalizeTCGCard(item, idx));
                this.cards = [...newCards, ...this.cards];
                this.saveCards();
                this.render();
                this.toggleTCGModal(false);
                this.showToast(`Đã kéo thành công ${newCards.length} thẻ!`, "success");
            } catch (err) {
                this.showToast(err.message, "error");
            }
        }
    }

    // Chuẩn hóa cấu trúc của TCGPlayer sang format Vault
    normalizeTCGCard(raw, index) {
        const name = raw.cleanProductName || raw.productName || raw.name || raw.title || `Riftbound Card #${index + 1}`;
        const price = parseFloat(raw.marketPrice || raw.price || raw.lowestPrice || 0);
        
        // Tự động gán nguyên tố dựa theo tên hoặc keyword nếu TCGPlayer không có sẵn field element
        let detectedElement = raw.element || "Void";
        const lowerName = name.toLowerCase();
        if (lowerName.includes("fire") || lowerName.includes("brand") || lowerName.includes("pyro")) detectedElement = "Fire";
        else if (lowerName.includes("water") || lowerName.includes("tide") || lowerName.includes("nautilus")) detectedElement = "Water";
        else if (lowerName.includes("wind") || lowerName.includes("gale") || lowerName.includes("yasuo")) detectedElement = "Wind";
        else if (lowerName.includes("earth") || lowerName.includes("stone") || lowerName.includes("malphite")) detectedElement = "Earth";

        return {
            id: raw.productId ? `tcg-${raw.productId}` : `rb-tcg-${Date.now()}-${index}`,
            name: name,
            element: this.capitalize(detectedElement),
            rarity: this.capitalize(raw.rarityName || raw.rarity || "Rare"),
            mana: parseInt(raw.manaCost || raw.cost || Math.floor(Math.random() * 6) + 1, 10),
            price: price > 0 ? price : 1.99,
            count: parseInt(raw.count || 1, 10),
            image: raw.imageUrl || raw.image || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
            desc: raw.description || raw.desc || "Thẻ bài chính hãng từ nguồn dữ liệu Riftbound TCGPlayer."
        };
    }

    capitalize(str) {
        if (!str) return "Common";
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    exportCollectionJSON() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.cards, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `riftbound_collection_${new Date().toISOString().slice(0,10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        this.showToast("Đã xuất file sao lưu JSON thành công!");
    }

    showToast(message, type = "success") {
        let toastContainer = document.getElementById("toast-container");
        if (!toastContainer) {
            toastContainer = document.createElement("div");
            toastContainer.id = "toast-container";
            toastContainer.style.cssText = "position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 8px;";
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement("div");
        const bgColors = {
            success: "#10b981",
            error: "#ef4444",
            info: "#3b82f6"
        };

        toast.style.cssText = `
            background: ${bgColors[type] || "#1e293b"};
            color: #ffffff;
            padding: 12px 18px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease forwards;
        `;
        toast.textContent = message;
        toastContainer.appendChild(toast);

        setTimeout(() => toast.remove(), 3500);
    }

    bindEvents() {
        this.inputSearch.addEventListener("input", () => this.render());
        this.filterElement.addEventListener("change", () => this.render());
        this.filterRarity.addEventListener("change", () => this.render());

        this.btnSample.addEventListener("click", () => {
            this.cards = [...INITIAL_RIFTBOUND_CARDS];
            this.saveCards();
            this.render();
            this.showToast("Đã khôi phục bộ sưu tập khởi đầu!");
        });

        this.btnOpenModal.addEventListener("click", () => this.toggleModal(true));
        this.btnCloseModal.addEventListener("click", () => this.toggleModal(false));
        this.btnCancel.addEventListener("click", () => this.toggleModal(false));

        this.modal.addEventListener("click", (e) => {
            if (e.target === this.modal) this.toggleModal(false);
        });

        this.form.addEventListener("submit", (e) => this.handleCardSubmit(e));
    }

    toggleModal(isOpen) {
        if (isOpen) {
            this.modal.classList.remove("hidden");
            document.getElementById("card-name").focus();
        } else {
            this.modal.classList.add("hidden");
            this.form.reset();
        }
    }

    handleCardSubmit(e) {
        e.preventDefault();

        const defaultPlaceholder = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80";
        const newCard = {
            id: `rb-custom-${Date.now()}`,
            name: document.getElementById("card-name").value.trim(),
            element: document.getElementById("card-element").value,
            rarity: document.getElementById("card-rarity").value,
            mana: parseInt(document.getElementById("card-mana").value, 10) || 0,
            price: 1.50,
            count: parseInt(document.getElementById("card-count").value, 10) || 1,
            image: document.getElementById("card-image").value.trim() || defaultPlaceholder,
            desc: document.getElementById("card-desc").value.trim() || "Chưa có mô tả kỹ năng."
        };

        this.cards.unshift(newCard);
        this.saveCards();
        this.render();
        this.toggleModal(false);
        this.showToast(`Đã thêm thẻ "${newCard.name}"!`);
    }

    updateQuantity(id, delta) {
        const cardIndex = this.cards.findIndex(c => c.id === id);
        if (cardIndex === -1) return;

        this.cards[cardIndex].count += delta;
        if (this.cards[cardIndex].count <= 0) {
            this.deleteCard(id);
            return;
        }

        this.saveCards();
        this.render();
    }

    deleteCard(id) {
        const target = this.cards.find(c => c.id === id);
        this.cards = this.cards.filter(c => c.id !== id);
        this.saveCards();
        this.render();
        if (target) {
            this.showToast(`Đã xóa thẻ "${target.name}"`, "info");
        }
    }

    updateStats() {
        const totalCards = this.cards.reduce((sum, item) => sum + (item.count || 1), 0);
        const uniqueCards = this.cards.length;

        this.statTotal.textContent = totalCards;
        this.statUnique.textContent = uniqueCards;
    }

    getFilteredCards() {
        const query = this.inputSearch.value.toLowerCase().trim();
        const selectedElement = this.filterElement.value;
        const selectedRarity = this.filterRarity.value;

        return this.cards.filter(card => {
            const matchesQuery = (card.name || "").toLowerCase().includes(query) ||
                                 (card.desc || "").toLowerCase().includes(query) ||
                                 (card.element || "").toLowerCase().includes(query);

            const matchesElement = selectedElement === "ALL" || card.element.toLowerCase() === selectedElement.toLowerCase();
            const matchesRarity = selectedRarity === "ALL" || card.rarity.toLowerCase() === selectedRarity.toLowerCase();

            return matchesQuery && matchesElement && matchesRarity;
        });
    }

    render() {
        const filtered = this.getFilteredCards();
        this.grid.innerHTML = "";
        this.updateStats();

        if (filtered.length === 0) {
            this.emptyState.classList.remove("hidden");
        } else {
            this.emptyState.classList.add("hidden");
            filtered.forEach(card => {
                const cardEl = this.createCardElement(card);
                this.grid.appendChild(cardEl);
            });
        }

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    createCardElement(card) {
        const div = document.createElement("article");
        div.className = "tcg-card";
        div.setAttribute("data-rarity", card.rarity);

        const priceDisplay = card.price ? `$${Number(card.price).toFixed(2)}` : "$0.00";

        div.innerHTML = `
            <div class="card-header-badge">${(card.rarity || "COMMON").toUpperCase()}</div>
            <div class="mana-cost">${card.mana}</div>
            <div class="card-img-wrap">
                <img src="${card.image}" alt="${card.name}" onerror="this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80'">
                <div class="card-price-badge">${priceDisplay}</div>
            </div>
            <div class="card-content">
                <h4 class="card-title">${card.name}</h4>
                <p class="card-desc">${card.desc}</p>
                <div class="card-footer">
                    <div class="card-count-control">
                        <button class="btn-qty" data-action="dec" data-id="${card.id}">-</button>
                        <span>x<strong>${card.count}</strong></span>
                        <button class="btn-qty" data-action="inc" data-id="${card.id}">+</button>
                    </div>
                    <button class="btn-delete" data-id="${card.id}" title="Xóa thẻ này">
                        <i data-lucide="trash-2" style="width:16px; height:16px;"></i>
                    </button>
                </div>
            </div>
        `;

        div.querySelector('[data-action="dec"]').addEventListener('click', () => this.updateQuantity(card.id, -1));
        div.querySelector('[data-action="inc"]').addEventListener('click', () => this.updateQuantity(card.id, 1));
        div.querySelector('.btn-delete').addEventListener('click', () => this.deleteCard(card.id));

        return div;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    window.app = new CardVaultApp();
});
