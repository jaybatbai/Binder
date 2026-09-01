/**
 * Riftbound Vault - Card Manager Core Logic
 */

// Initial Sample Deck Data
const SAMPLE_CARDS = [
    {
        id: "rb-001",
        name: "Infernal Archon",
        element: "Fire",
        rarity: "Legendary",
        mana: 7,
        count: 2,
        image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80",
        desc: "Hủy diệt toàn bộ bài quân đối phương có Mana <= 3 khi nhập trận."
    },
    {
        id: "rb-002",
        name: "Abyssal Tidecaller",
        element: "Water",
        rarity: "Epic",
        mana: 4,
        count: 3,
        image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
        desc: "Hồi 3 máu cho tướng đồng minh và rút 1 thẻ bài ngẫu nhiên."
    },
    {
        id: "rb-003",
        name: "Galeblade Stalker",
        element: "Wind",
        rarity: "Rare",
        mana: 2,
        count: 4,
        image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
        desc: "Tấn công nhanh: Có thể đánh ngay trong lượt triệu hồi."
    },
    {
        id: "rb-004",
        name: "Terra Guardian",
        element: "Earth",
        rarity: "Common",
        mana: 3,
        count: 5,
        image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
        desc: "Khiêu khích: Đòn đánh của đối thủ bắt buộc phải nhắm vào thẻ này."
    }
];

const STORAGE_KEY = "RIFTBOUND_VAULT_CARDS";

class CardVaultApp {
    constructor() {
        this.cards = this.loadCards();
        this.initDOMElements();
        this.bindEvents();
        this.render();
    }

    // Load data from LocalStorage or Fallback to Sample
    loadCards() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : SAMPLE_CARDS;
        } catch (e) {
            console.error("Lỗi khi đọc LocalStorage:", e);
            return SAMPLE_CARDS;
        }
    }

    saveCards() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cards));
            this.updateStats();
        } catch (e) {
            console.error("Lỗi khi lưu LocalStorage:", e);
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

    bindEvents() {
        // Search & Filter Listeners
        this.inputSearch.addEventListener("input", () => this.render());
        this.filterElement.addEventListener("change", () => this.render());
        this.filterRarity.addEventListener("change", () => this.render());

        // Quick Action Sample Data
        this.btnSample.addEventListener("click", () => {
            this.cards = [...SAMPLE_CARDS];
            this.saveCards();
            this.render();
        });

        // Modal Controls
        this.btnOpenModal.addEventListener("click", () => this.toggleModal(true));
        this.btnCloseModal.addEventListener("click", () => this.toggleModal(false));
        this.btnCancel.addEventListener("click", () => this.toggleModal(false));

        // Close modal on outside click
        this.modal.addEventListener("click", (e) => {
            if (e.target === this.modal) this.toggleModal(false);
        });

        // Form Submit
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
            id: `rb-${Date.now()}`,
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
        this.cards = this.cards.filter(c => c.id !== id);
        this.saveCards();
        this.render();
    }

    updateStats() {
        const totalCards = this.cards.reduce((sum, item) => sum + item.count, 0);
        const uniqueCards = this.cards.length;

        this.statTotal.textContent = totalCards;
        this.statUnique.textContent = uniqueCards;
    }

    getFilteredCards() {
        const query = this.inputSearch.value.toLowerCase().trim();
        const selectedElement = this.filterElement.value;
        const selectedRarity = this.filterRarity.value;

        return this.cards.filter(card => {
            const matchesQuery = card.name.toLowerCase().includes(query) ||
                                 card.desc.toLowerCase().includes(query) ||
                                 card.element.toLowerCase().includes(query);

            const matchesElement = selectedElement === "ALL" || card.element === selectedElement;
            const matchesRarity = selectedRarity === "ALL" || card.rarity === selectedRarity;

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

        // Re-initialize Lucide Icons for newly injected DOM
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    createCardElement(card) {
        const div = document.createElement("article");
        div.className = "tcg-card";
        div.setAttribute("data-rarity", card.rarity);

        div.innerHTML = `
            <div class="card-header-badge">${card.rarity.toUpperCase()}</div>
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

        // Bind interactive events
        div.querySelector('[data-action="dec"]').addEventListener('click', () => this.updateQuantity(card.id, -1));
        div.querySelector('[data-action="inc"]').addEventListener('click', () => this.updateQuantity(card.id, 1));
        div.querySelector('.btn-delete').addEventListener('click', () => this.deleteCard(card.id));

        return div;
    }
}

// Bootstrap Application
document.addEventListener("DOMContentLoaded", () => {
    window.app = new CardVaultApp();
});
