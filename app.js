/**
 * Riftbound Vault - Card Manager & Live Data Sync Engine
 */

const STORAGE_KEY = "RIFTBOUND_VAULT_CARDS";
const DEFAULT_SOURCE_KEY = "RIFTBOUND_SOURCE_URL";

// Dữ liệu mẫu dự phòng khi chưa kết nối nguồn online
const FALLBACK_CARDS = [
    {
        id: "rb-001",
        name: "Infernal Archon",
        element: "Fire",
        rarity: "Legendary",
        mana: 7,
        count: 1,
        image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80",
        desc: "Hủy diệt toàn bộ bài quân đối phương có Mana <= 3 khi nhập trận."
    },
    {
        id: "rb-002",
        name: "Abyssal Tidecaller",
        element: "Water",
        rarity: "Epic",
        mana: 4,
        count: 2,
        image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
        desc: "Hồi 3 máu cho tướng đồng minh và rút 1 thẻ bài ngẫu nhiên."
    },
    {
        id: "rb-003",
        name: "Galeblade Stalker",
        element: "Wind",
        rarity: "Rare",
        mana: 2,
        count: 3,
        image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
        desc: "Tấn công nhanh: Có thể tấn công ngay trong lượt triệu hồi."
    }
];

class CardVaultApp {
    constructor() {
        this.cards = this.loadCards();
        this.initDOMElements();
        this.injectSyncControls();
        this.bindEvents();
        this.render();
    }

    loadCards() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : FALLBACK_CARDS;
        } catch (e) {
            console.error("Lỗi đọc LocalStorage:", e);
            return FALLBACK_CARDS;
        }
    }

    saveCards() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cards));
            this.updateStats();
        } catch (e) {
            console.error("Lỗi ghi LocalStorage:", e);
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

    // Tự động chèn nút đồng bộ trực tuyến vào thanh điều hướng mà không cần sửa HTML
    injectSyncControls() {
        const navActions = document.querySelector(".nav-actions");
        if (!navActions || document.getElementById("btn-sync-riftbound")) return;

        const syncBtn = document.createElement("button");
        syncBtn.id = "btn-sync-riftbound";
        syncBtn.className = "btn btn-secondary";
        syncBtn.style.borderColor = "var(--primary)";
        syncBtn.innerHTML = `<i data-lucide="cloud-download"></i> Nạp data Riftbound`;

        navActions.insertBefore(syncBtn, this.btnOpenModal);
        syncBtn.addEventListener("click", () => this.promptSyncSource());
    }

    // Hiển thị thông báo Toast nổi
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

        setTimeout(() => {
            toast.remove();
        }, 3500);
    }

    // Chuẩn hóa định dạng thẻ từ bất kỳ cấu trúc JSON nào
    normalizeCardData(raw, index) {
        return {
            id: raw.id || raw.card_id || `rb-sync-${Date.now()}-${index}`,
            name: raw.name || raw.card_name || raw.title || "Thẻ chưa đặt tên",
            element: this.capitalize(raw.element || raw.type || raw.faction || "Void"),
            rarity: this.capitalize(raw.rarity || raw.tier || "Common"),
            mana: parseInt(raw.mana ?? raw.cost ?? raw.energy ?? 1, 10) || 0,
            count: parseInt(raw.count ?? raw.quantity ?? 1, 10) || 1,
            image: raw.image || raw.image_url || raw.art || raw.img || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
            desc: raw.desc || raw.description || raw.effect || raw.ability || "Chưa có mô tả kỹ năng."
        };
    }

    capitalize(str) {
        if (!str) return "Common";
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    // Kéo dữ liệu từ URL (Hỗ trợ CORS Proxy dự phòng)
    async fetchFromRiftbound(url) {
        this.showToast("Đang kết nối & tải dữ liệu thẻ...", "info");

        try {
            let response;
            try {
                // Thử fetch trực tiếp
                response = await fetch(url);
                if (!response.ok) throw new Error("Fetch trực tiếp thất bại");
            } catch (err) {
                // Nếu bị chặn CORS, gọi qua proxy dự phòng
                console.warn("Chuyển sang CORS Proxy do chặn kết nối trực tiếp:", err);
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                response = await fetch(proxyUrl);
            }

            const data = await response.json();
            const rawList = Array.isArray(data) ? data : (data.cards || data.data || []);

            if (!Array.isArray(rawList) || rawList.length === 0) {
                throw new Error("Không tìm thấy danh sách thẻ bài hợp lệ trong file JSON!");
            }

            this.cards = rawList.map((item, idx) => this.normalizeCardData(item, idx));
            this.saveCards();
            this.render();
            localStorage.setItem(DEFAULT_SOURCE_KEY, url);
            this.showToast(`Đã đồng bộ thành công ${this.cards.length} thẻ bài!`, "success");

        } catch (error) {
            console.error("Lỗi khi tải dữ liệu Riftbound:", error);
            this.showToast(`Lỗi: ${error.message}`, "error");
        }
    }

    // Mở hộp thoại nhập link dữ liệu
    promptSyncSource() {
        const lastUrl = localStorage.getItem(DEFAULT_SOURCE_KEY) || "";
        const url = prompt(
            "Nhập link API hoặc link file Raw JSON chứa dữ liệu thẻ Riftbound:\n(Ví dụ: https://raw.githubusercontent.com/.../cards.json)",
            lastUrl
        );

        if (url && url.trim()) {
            this.fetchFromRiftbound(url.trim());
        }
    }

    bindEvents() {
        this.inputSearch.addEventListener("input", () => this.render());
        this.filterElement.addEventListener("change", () => this.render());
        this.filterRarity.addEventListener("change", () => this.render());

        this.btnSample.addEventListener("click", () => {
            this.cards = [...FALLBACK_CARDS];
            this.saveCards();
            this.render();
            this.showToast("Đã khôi phục dữ liệu mẫu gốc!");
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

        div.innerHTML = `
            <div class="card-header-badge">${(card.rarity || "COMMON").toUpperCase()}</div>
            <div class="mana-cost">${card.mana}</div>
            <div class="card-img-wrap">
                <img src="${card.image}" alt="${card.name}" onerror="this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80'">
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
