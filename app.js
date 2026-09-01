/**
 * Riftbound Vault - Automated Data Sync & Portfolio Engine
 */

const STORAGE_KEY = "RIFTBOUND_VAULT_CARDS";
const CONFIG_KEY = "RIFTBOUND_AUTO_SOURCE_URL";

// URL nguồn dữ liệu tự động (Có thể trỏ tới Raw JSON GitHub của bot cào tự động)
const DEFAULT_AUTO_ENDPOINT = "https://raw.githubusercontent.com/hextech-vault/riftbound-data/main/cards.json";

// Bộ bài mẫu khởi tạo khi chưa kết nối mạng
const FALLBACK_RIFTBOUND_CARDS = [
    {
        id: "rb-001",
        name: "Ahri, Nine-Tailed Fox",
        element: "Void",
        rarity: "Legendary",
        mana: 5,
        price: 24.99,
        count: 1,
        image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80",
        desc: "Mê Hoặc: Chuyển quyền điều khiển 1 quân bài đối phương có Mana <= 3 trong 1 lượt."
    },
    {
        id: "rb-002",
        name: "Yasuo, The Unforgiven",
        element: "Wind",
        rarity: "Epic",
        mana: 4,
        price: 12.50,
        count: 2,
        image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
        desc: "Trăn Trối: Tự động kích hoạt đòn đánh liên hoàn khi có quân bài bị Hất Tung."
    },
    {
        id: "rb-003",
        name: "Nautilus, Titan of the Depths",
        element: "Water",
        rarity: "Rare",
        mana: 6,
        price: 4.75,
        count: 3,
        image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
        desc: "Thủy Lôi Tầm Nhiệt: Giảm 2 tốc độ tấn công của toàn bộ bài quân đối phương."
    },
    {
        id: "rb-004",
        name: "Brand, Burning Vengeance",
        element: "Fire",
        rarity: "Rare",
        mana: 3,
        price: 3.20,
        count: 1,
        image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
        desc: "Bốc Cháy: Đốt 2 sát thương chuẩn mỗi lượt lên mục tiêu dính lửa."
    }
];

class CardVaultApp {
    constructor() {
        this.cards = this.loadStoredCards();
        this.initDOMElements();
        this.injectCustomStyles();
        this.injectHeaderStats();
        this.bindEvents();
        this.render();

        // Tự động kích hoạt lấy data ngầm khi mở ứng dụng
        this.autoFetchLatestData();
    }

    loadStoredCards() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : FALLBACK_RIFTBOUND_CARDS;
        } catch (e) {
            console.error("Lỗi khi đọc LocalStorage:", e);
            return FALLBACK_RIFTBOUND_CARDS;
        }
    }

    saveCards() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cards));
            this.updateStats();
        } catch (e) {
            console.error("Lỗi khi lưu LocalStorage:", e);
            this.showToast("Không thể ghi dữ liệu vào bộ nhớ máy!", "error");
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

    injectCustomStyles() {
        if (document.getElementById("vault-custom-styles")) return;
        const style = document.createElement("style");
        style.id = "vault-custom-styles";
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
            .stat-pill-value {
                color: #10b981 !important;
            }
            .syncing-spin {
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    injectHeaderStats() {
        const statsBar = document.querySelector(".stats-bar");
        if (statsBar && !document.getElementById("stat-portfolio-val")) {
            const valPill = document.createElement("div");
            valPill.className = "stat-pill";
            valPill.innerHTML = `
                <i data-lucide="dollar-sign" style="color: #10b981;"></i>
                <span>Giá trị: <strong id="stat-portfolio-val" class="stat-pill-value">$0.00</strong></span>
            `;
            statsBar.appendChild(valPill);
        }

        const navActions = document.querySelector(".nav-actions");
        if (navActions && !document.getElementById("btn-auto-refresh")) {
            const autoBtn = document.createElement("button");
            autoBtn.id = "btn-auto-refresh";
            autoBtn.className = "btn btn-secondary";
            autoBtn.title = "Đồng bộ tức thì từ kho dữ liệu online";
            autoBtn.innerHTML = `<i data-lucide="refresh-cw"></i> Đồng bộ Data`;
            autoBtn.addEventListener("click", () => this.autoFetchLatestData(true));
            navActions.insertBefore(autoBtn, this.btnOpenModal);
        }
    }

    // Tự động kết nối và kéo data mới nhất
    async autoFetchLatestData(isManualTrigger = false) {
        const sourceUrl = localStorage.getItem(CONFIG_KEY) || DEFAULT_AUTO_ENDPOINT;
        const refreshBtn = document.getElementById("btn-auto-refresh");
        const icon = refreshBtn ? refreshBtn.querySelector("i") : null;

        if (icon) icon.classList.add("syncing-spin");
        if (isManualTrigger) this.showToast("Đang đồng bộ dữ liệu thẻ mới nhất...", "info");

        try {
            let response;
            try {
                response = await fetch(sourceUrl, { cache: "no-cache" });
                if (!response.ok) throw new Error("Fetch trực tiếp thất bại");
            } catch {
                // Tự động dự phòng qua proxy nếu bị chặn CORS
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(sourceUrl)}`;
                response = await fetch(proxyUrl);
            }

            if (!response.ok) throw new Error("Không thể kết nối tới nguồn dữ liệu");

            const rawData = await response.json();
            const cardList = Array.isArray(rawData) ? rawData : (rawData.results || rawData.cards || rawData.data || []);

            if (cardList.length > 0) {
                const freshCards = cardList.map((item, idx) => this.normalizeCard(item, idx));
                
                // Giữ lại số lượng (count) mà người dùng đã sở hữu trong LocalStorage
                const countMap = new Map(this.cards.map(c => [c.name.toLowerCase(), c.count]));
                this.cards = freshCards.map(c => ({
                    ...c,
                    count: countMap.get(c.name.toLowerCase()) || c.count || 1
                }));

                this.saveCards();
                this.render();
                if (isManualTrigger) this.showToast(`Đã đồng bộ thành công ${this.cards.length} thẻ bài!`, "success");
            }
        } catch (error) {
            console.warn("Chưa tải được data mới, đang sử dụng dữ liệu bộ nhớ cục bộ:", error.message);
            if (isManualTrigger) this.showToast("Dùng dữ liệu lưu tạm do không kết nối được nguồn online.", "info");
        } finally {
            if (icon) icon.classList.remove("syncing-spin");
        }
    }

    normalizeCard(raw, index) {
        const name = raw.name || raw.cleanProductName || raw.title || `Riftbound Card #${index + 1}`;
        const price = parseFloat(raw.price || raw.marketPrice || raw.lowestPrice || 1.99);

        // Tự động nhận diện nguyên tố theo tên nếu dữ liệu gốc không cung cấp
        let detectedElement = raw.element || "Void";
        const lower = name.toLowerCase();
        if (lower.includes("fire") || lower.includes("brand") || lower.includes("infernal")) detectedElement = "Fire";
        else if (lower.includes("water") || lower.includes("tide") || lower.includes("nautilus")) detectedElement = "Water";
        else if (lower.includes("wind") || lower.includes("gale") || lower.includes("yasuo")) detectedElement = "Wind";
        else if (lower.includes("earth") || lower.includes("stone") || lower.includes("terra")) detectedElement = "Earth";

        return {
            id: raw.id ? String(raw.id) : `rb-sync-${Date.now()}-${index}`,
            name: name,
            element: this.capitalize(detectedElement),
            rarity: this.capitalize(raw.rarity || raw.rarityName || "Common"),
            mana: parseInt(raw.mana ?? raw.manaCost ?? raw.cost ?? 1, 10),
            price: price > 0 ? price : 0.99,
            count: parseInt(raw.count || 1, 10),
            image: raw.image || raw.imageUrl || raw.art || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
            desc: raw.desc || raw.description || raw.effect || "Thẻ bài Riftbound chính hãng."
        };
    }

    capitalize(str) {
        if (!str) return "Common";
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
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
            this.cards = [...FALLBACK_RIFTBOUND_CARDS];
            this.saveCards();
            this.render();
            this.showToast("Đã khôi phục bộ sưu tập mặc định!");
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
        const totalValue = this.cards.reduce((sum, item) => sum + ((item.price || 0) * (item.count || 1)), 0);

        if (this.statTotal) this.statTotal.textContent = totalCards;
        if (this.statUnique) this.statUnique.textContent = uniqueCards;

        const valElem = document.getElementById("stat-portfolio-val");
        if (valElem) {
            valElem.textContent = `$${totalValue.toFixed(2)}`;
        }
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
